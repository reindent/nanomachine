// src/server.ts
import * as http from 'http';
import * as WebSocket from 'ws';
import { IncomingMessage, ServerResponse } from 'http';
import { 
  PromptRequest, 
  WebSocketMessage, 
  ExternalTaskMessage,
  AgentEventMessage
} from './types';

interface Client {
  socket: WebSocket;
  id: string;
}

// Create a simple HTTP server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8787;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients: Client[] = [];

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

// Handle WebSocket connections
wss.on('connection', (socket: WebSocket, req: http.IncomingMessage) => {
  console.log('=== NEW CLIENT CONNECTION ===');
  console.log(`Client connected from ${req.socket.remoteAddress}:${req.socket.remotePort}`);
  console.log(`Total clients connected: ${clients.length + 1}`);
  console.log('==============================');
  
  // Generate a unique ID for this client
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  clients.push({ socket, id: clientId });
  console.log(`[SERVER] Assigned client ID: ${clientId}`);
  
  // Send a welcome message
  try {
    socket.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to nanobrowser API bridge',
      clientId
    }));
    console.log(`[SERVER] Sent welcome message to client ${clientId}`);
  } catch (error) {
    console.error(`[SERVER] Error sending welcome message:`, error);
  }
  
  // Handle messages from clients
  socket.on('message', (message: WebSocket.Data) => {
    console.log(`[SERVER] Raw message received: ${message.toString().substring(0, 150)}...`);
    try {
      const data = JSON.parse(message.toString()) as WebSocketMessage;
      console.log(`[SERVER] Received message type: ${data.type} from client ${clientId}`);
      console.log('[SERVER] Message data:', data);
      
      // Handle hello messages
      if (data.type === 'hello') {
        console.log(`[SERVER] Client ${clientId} identified as: ${data.client}`);
        console.log(`[SERVER] Total clients: ${clients.length}`);
      }
      
      // Handle ping messages
      if (data.type === 'ping') {
        // console.log(`[SERVER] Received ping from client ${clientId}`);
        try {
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error(`[SERVER] Error sending pong:`, error);
        }
      }
      
      // Handle task results
      if (data.type === 'task_result' || data.type === 'task_error') {
        const taskId = data.taskId as string;
        console.log(`[SERVER] Received ${data.type} for task ${taskId}`);
        console.log(`[SERVER] Task result details:`, data);
        
        // Mark task as completed or failed
        if (taskEvents[taskId]) {
          taskEvents[taskId].endTime = Date.now();
          taskEvents[taskId].status = data.type === 'task_result' ? 'completed' : 'failed';
          console.log(`[SERVER] Updated task ${taskId} status to ${taskEvents[taskId].status}`);
        } else {
          console.log(`[SERVER] Warning: Received result for unknown task ${taskId}`);
        }
      }
      
      // Handle agent events (from planner, navigator, validator)
      if (data.type === 'agent_event') {
        const agentEvent = data as AgentEventMessage;
        console.log(`[SERVER] ✨ AGENT EVENT ✨ from ${agentEvent.event.actor}: ${agentEvent.event.state} for task ${agentEvent.taskId}`);
        console.log(`[SERVER] Event details: ${JSON.stringify(agentEvent.event.data).substring(0, 150)}...`);
        
        // Initialize task events array if it doesn't exist
        if (!taskEvents[agentEvent.taskId]) {
          taskEvents[agentEvent.taskId] = {
            events: [],
            startTime: Date.now()
          };
          console.log(`[SERVER] Created new task record for ${agentEvent.taskId}`);
        }
        
        // Store the event
        taskEvents[agentEvent.taskId].events.push(agentEvent.event);
        console.log(`[SERVER] Stored event. Total events for task ${agentEvent.taskId}: ${taskEvents[agentEvent.taskId].events.length}`);
        
        // If this is a task completion event, mark the task accordingly
        if (agentEvent.event.state === 'task.ok') {
          taskEvents[agentEvent.taskId].status = 'completed';
          taskEvents[agentEvent.taskId].endTime = Date.now();
          console.log(`[SERVER] Task ${agentEvent.taskId} marked as COMPLETED`);
        } else if (agentEvent.event.state === 'task.fail') {
          taskEvents[agentEvent.taskId].status = 'failed';
          taskEvents[agentEvent.taskId].endTime = Date.now();
          console.log(`[SERVER] Task ${agentEvent.taskId} marked as FAILED`);
        } else if (agentEvent.event.state === 'task.cancel') {
          taskEvents[agentEvent.taskId].status = 'cancelled';
          taskEvents[agentEvent.taskId].endTime = Date.now();
          console.log(`[SERVER] Task ${agentEvent.taskId} marked as CANCELLED`);
        }
      }
    } catch (error) {
      console.error('[SERVER] Error parsing WebSocket message:', error);
      console.error('[SERVER] Raw message that caused error:', message.toString().substring(0, 200));
    }
  });
  
  // Handle disconnections
  socket.on('close', (code: number, reason: string) => {
    console.log(`[SERVER] Client ${clientId} disconnected with code ${code} and reason: ${reason || 'No reason provided'}`);
    const index = clients.findIndex(client => client.socket === socket);
    if (index !== -1) {
      clients.splice(index, 1);
      console.log(`[SERVER] Removed client from active clients list. Remaining clients: ${clients.length}`);
    }
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error(`[SERVER] WebSocket error for client ${clientId}:`, error);
  });
});

// Handle HTTP requests
server.on('request', (req: IncomingMessage, res: ServerResponse) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      clients: clients.length,
      activeTasks: Object.keys(taskEvents).filter(taskId => !taskEvents[taskId].endTime).length,
      completedTasks: Object.keys(taskEvents).filter(taskId => taskEvents[taskId].status === 'completed').length
    }));
    return;
  }
  
  // Task events endpoint
  if (req.method === 'GET' && req.url?.startsWith('/task/')) {
    const taskId = req.url.substring(6); // Remove '/task/' prefix
    
    if (taskEvents[taskId]) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(taskEvents[taskId]));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Task not found' }));
    }
    return;
  }
  
  // List tasks endpoint
  if (req.method === 'GET' && req.url === '/tasks') {
    const taskSummaries = Object.entries(taskEvents).map(([taskId, task]) => ({
      taskId,
      startTime: task.startTime,
      endTime: task.endTime,
      status: task.status,
      eventCount: task.events.length
    }));
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(taskSummaries));
    return;
  }
  
  // Prompt endpoint
  if (req.method === 'POST' && req.url === '/prompt') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body) as PromptRequest;
        
        // Validate request
        if (!data.task) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing task parameter' }));
          return;
        }
        
        // Generate a task ID if not provided
        const taskId = data.taskId || `task-${Date.now()}`;
        
        // Forward the prompt to all connected clients
        const message: ExternalTaskMessage = {
          type: 'external_task',
          task: data.task,
          taskId,
          tabId: data.tabId
        };
        
        let clientCount = 0;
        clients.forEach(client => {
          if (client.socket.readyState === WebSocket.OPEN) {
            client.socket.send(JSON.stringify(message));
            clientCount++;
          }
        });
        
        if (clientCount === 0) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'No extension clients connected',
            status: 'error'
          }));
          return;
        }
        
        // Send response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'accepted',
          message: 'Prompt forwarded to extension',
          taskId
        }));
        
        console.log(`Forwarded prompt to ${clientCount} clients: ${data.task}`);
      } catch (error) {
        console.error('Error processing request:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request format' }));
      }
    });
    
    return;
  }
  
  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Start the server
export function startServer(): void {
  server.listen(PORT, () => {
    console.log('===============================================');
    console.log(`Nanobrowser API server running on port ${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
    console.log(`HTTP API available at http://localhost:${PORT}/prompt`);
    console.log('Ready to receive agent events from nanobrowser extension');
    console.log('===============================================');
  });
}

// If this file is run directly, start the server
if (require.main === module) {
  startServer();
}
