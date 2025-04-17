import express from 'express';
import http from 'http';
import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { 
  PromptRequest, 
  WebSocketMessage, 
  ExternalTaskMessage,
  AgentEventMessage,
  LLMProviderMessage,
  AgentModelMessage
} from './types';

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Set up CORS and JSON parsing
app.use(express.json());

// Track connected clients
interface Client {
  socket: WebSocket;
  id: string;
  name: string;
  version?: string;
}

let nanobrowserClient: Client | null = null;
let nanomachineClient: Client | null = null;

// Store active tasks and their events
interface TaskEvents {
  [taskId: string]: {
    events: AgentEventMessage['event'][];
    startTime: number;
    endTime?: number;
    status?: 'completed' | 'failed' | 'cancelled';
  };
}

const taskEvents: TaskEvents = {};

// Keep Alive Interval
setInterval(() => {
  // Send ping to nanobrowser client
  if (nanobrowserClient && nanobrowserClient.socket.readyState === WebSocket.OPEN) {
    nanobrowserClient.socket.send(JSON.stringify({ type: 'ping' }));
  }
}, 1000); // Every second

// Handle WebSocket connections
wss.on('connection', (socket: WebSocket, req: IncomingMessage) => {
  console.log(`New client connected from ${req.socket.remoteAddress}:${req.socket.remotePort}`);
  
  // Generate a unique ID for this client
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Handle messages from clients
  socket.on('message', (message: WebSocket.Data) => {
    try {
      const data = JSON.parse(message.toString()) as WebSocketMessage;
      
      // Skip logging for ping/pong messages
      if (data.type !== 'ping' && data.type !== 'pong') {
        console.log(`Received message type: ${data.type}`);
      }
      
      // Handle ping/pong messages
      if (data.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      if (data.type === 'pong') return;
      
      // Handle hello messages to identify clients
      if (data.type === 'hello') {
        const name = data.name as string;
        
        if (name === 'nanobrowser-extension') {
          console.log('Nanobrowser extension connected');
          const version = data.version ? String(data.version) : 'unknown';
          nanobrowserClient = { socket, id: clientId, name, version };
          // notify nanomachine that nanobrowser is ready
          if(nanomachineClient && nanomachineClient.socket.readyState === WebSocket.OPEN) {
            nanomachineClient.socket.send(JSON.stringify({ type: 'nanobrowser', ready: true, version }));
          }
        } else if (name === 'nanomachine-service') {
          console.log('Nanomachine service connected');
          nanomachineClient = { socket, id: clientId, name };
          // notify nanomachine if nanobrowser is ready
          if(nanobrowserClient && nanobrowserClient.socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'nanobrowser', ready: true, version: nanobrowserClient.version }));
          }
        } else {
          console.error(`Invalid client name: ${name}`);
          socket.close();
          return;
        }
        
        // Send welcome message
        socket.send(JSON.stringify({
          type: 'welcome',
          message: 'Connected to bridge'
        }));
        return;
      }
      
      // Handle agent events (from nanobrowser to nanomachine)
      if (data.type === 'agent_event') {
        // Store event
        const event = data as AgentEventMessage;
        const taskId = event.taskId;
        
        if (!taskEvents[taskId]) {
          taskEvents[taskId] = {
            events: [],
            startTime: Date.now()
          };
        }
        
        taskEvents[taskId].events.push(event.event);
        
        // Update task status based on event state
        if (event.event.state === 'task.ok') {
          taskEvents[taskId].status = 'completed';
          taskEvents[taskId].endTime = Date.now();
        } else if (event.event.state === 'task.error') {
          taskEvents[taskId].status = 'failed';
          taskEvents[taskId].endTime = Date.now();
        } else if (event.event.state === 'task.cancel') {
          taskEvents[taskId].status = 'cancelled';
          taskEvents[taskId].endTime = Date.now();
        }
        
        // Forward to nanomachine
        if (nanomachineClient && nanomachineClient.socket.readyState === WebSocket.OPEN) {
          nanomachineClient.socket.send(message.toString());
        }
        return;
      }
      
      // Handle task results (from nanobrowser to nanomachine)
      if (data.type === 'task_result' || data.type === 'task_error') {
        if (nanomachineClient && nanomachineClient.socket.readyState === WebSocket.OPEN) {
          nanomachineClient.socket.send(message.toString());
        }
        return;
      }
      
      // Handle external tasks (from nanomachine to nanobrowser)
      if (data.type === 'external_task') {
        if (nanobrowserClient && nanobrowserClient.socket.readyState === WebSocket.OPEN) {
          nanobrowserClient.socket.send(message.toString());
        }
        return;
      }
      
      // Handle provider configuration (from nanomachine to nanobrowser)
      if (data.type === 'llm_provider') {
        if (nanobrowserClient && nanobrowserClient.socket.readyState === WebSocket.OPEN) {
          nanobrowserClient.socket.send(message.toString());
        }
        return;
      }
      
      // Handle agent model configuration (from nanomachine to nanobrowser)
      if (data.type === 'agent_model') {
        if (nanobrowserClient && nanobrowserClient.socket.readyState === WebSocket.OPEN) {
          nanobrowserClient.socket.send(message.toString());
        }
        return;
      }
      
      // Handle provider/model results (from nanobrowser to nanomachine)
      if (data.type === 'llm_provider_result' || data.type === 'agent_model_result' ||
          data.type === 'llm_provider_error' || data.type === 'agent_model_error') {
        if (nanomachineClient && nanomachineClient.socket.readyState === WebSocket.OPEN) {
          nanomachineClient.socket.send(message.toString());
        }
        return;
      }
      
      console.log(`Unhandled message type: ${data.type}`);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  // Handle disconnections
  socket.on('close', () => {
    if (nanobrowserClient && nanobrowserClient.socket === socket) {
      console.log('Nanobrowser extension disconnected');
      nanobrowserClient = null;
    } else if (nanomachineClient && nanomachineClient.socket === socket) {
      console.log('Nanomachine service disconnected');
      nanomachineClient = null;
    }
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    nanobrowserConnected: nanobrowserClient !== null && nanobrowserClient.socket.readyState === WebSocket.OPEN,
    nanomachineConnected: nanomachineClient !== null && nanomachineClient.socket.readyState === WebSocket.OPEN,
    activeTasks: Object.keys(taskEvents).filter(taskId => !taskEvents[taskId].endTime).length,
    completedTasks: Object.keys(taskEvents).filter(taskId => taskEvents[taskId].status === 'completed').length
  });
});

// Task events endpoint
app.get('/task/:taskId', (req, res) => {
  const taskId = req.params.taskId;
  
  if (taskEvents[taskId]) {
    res.status(200).json(taskEvents[taskId]);
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

// List tasks endpoint
app.get('/tasks', (req, res) => {
  const taskSummaries = Object.entries(taskEvents).map(([taskId, task]) => ({
    taskId,
    startTime: task.startTime,
    endTime: task.endTime,
    status: task.status,
    eventCount: task.events.length
  }));
  
  res.status(200).json(taskSummaries);
});

// Prompt endpoint
app.post('/prompt', (req, res) => {
  const data = req.body as PromptRequest;
  
  // Validate request
  if (!data.task) {
    res.status(400).json({ error: 'Missing task parameter' });
    return;
  }
  
  // Generate a task ID if not provided
  const taskId = data.taskId || `task-${Date.now()}`;
  
  // Forward the prompt to nanobrowser client
  const message: ExternalTaskMessage = {
    type: 'external_task',
    task: data.task,
    taskId,
    tabId: data.tabId
  };
  
  if (nanobrowserClient && nanobrowserClient.socket.readyState === WebSocket.OPEN) {
    nanobrowserClient.socket.send(JSON.stringify(message));
    
    // Send response
    res.status(200).json({
      status: 'accepted',
      message: 'Prompt forwarded to extension',
      taskId
    });
    
    console.log(`Forwarded prompt to nanobrowser: ${data.task}`);
  } else {
    res.status(503).json({
      error: 'Nanobrowser extension not connected',
      status: 'error'
    });
  }
});

// Provider configuration endpoint
app.post('/provider', (req, res) => {
  const data = req.body as LLMProviderMessage;
  
  // Validate request
  if (!data.provider || !data.action) {
    res.status(400).json({ error: 'Missing provider or action parameter' });
    return;
  }
  
  if (nanobrowserClient && nanobrowserClient.socket.readyState === WebSocket.OPEN) {
    nanobrowserClient.socket.send(JSON.stringify(data));
    
    // Send response
    res.status(200).json({
      status: 'accepted',
      message: `Provider ${data.action} request forwarded to extension`,
      providerId: data.provider.id
    });
    
    console.log(`Forwarded provider ${data.action} for ${data.provider.id} to nanobrowser`);
  } else {
    res.status(503).json({
      error: 'Nanobrowser extension not connected',
      status: 'error'
    });
  }
});

// Agent model configuration endpoint
app.post('/model', (req, res) => {
  const data = req.body as AgentModelMessage;
  
  // Validate request
  if (!data.agent || !data.config) {
    res.status(400).json({ error: 'Missing agent or config parameter' });
    return;
  }
  
  if (nanobrowserClient && nanobrowserClient.socket.readyState === WebSocket.OPEN) {
    nanobrowserClient.socket.send(JSON.stringify(data));
    
    // Send response
    res.status(200).json({
      status: 'accepted',
      message: 'Agent model configuration forwarded to extension',
      agent: data.agent
    });
    
    console.log(`Forwarded model config for agent ${data.agent} to nanobrowser`);
  } else {
    res.status(503).json({
      error: 'Nanobrowser extension not connected',
      status: 'error'
    });
  }
});

// Not found handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start the server
export function startServer(port: number = 8787): void {
  server.listen(port, () => {
    console.log('===============================================');
    console.log(`Bridge server running on port ${port}`);
    console.log(`WebSocket server running on ws://localhost:${port}`);
    console.log(`HTTP API available at http://localhost:${port}/prompt`);
    console.log('Ready to connect nanobrowser and nanomachine');
    console.log('===============================================');
  });
}
