import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { router as taskRoutes } from './routes/tasks';
import { router as statusRoutes } from './routes/status';
import { router as bridgeRoutes } from './routes/bridge';
import { Task, SystemStatus } from './types';
import { AgentEventMessage } from './types/bridge';
import createVNCService from './vncService';
import bridgeService from './services/bridgeService';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize VNC service
createVNCService(io);
const PORT = process.env.SERVER_PORT || 3100;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/bridge', bridgeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Mock data for socket events
const mockTasks: Task[] = [
  {
    id: 'task-001',
    status: 'completed',
    message: 'Successfully completed website navigation task',
    timestamp: '2025-04-11T08:30:00Z',
  },
  {
    id: 'task-002',
    status: 'running',
    progress: 65,
    message: 'Processing data extraction from target website',
    timestamp: '2025-04-11T09:15:00Z',
  },
  {
    id: 'task-003',
    status: 'idle',
    message: 'Waiting for execution',
    timestamp: '2025-04-11T09:10:00Z',
  },
];

const mockSystemStatus: SystemStatus = {
  websocketStatus: 'connected',
  nanomachineClientVersion: '0.1.4',
  nanobrowserVersion: '1.2.0',
  serverStatus: 'online',
  activeSessions: 1
};

// Set up bridge event forwarding to Socket.IO clients
bridgeService.onAgentEvent((event: AgentEventMessage) => {
  console.log(`Forwarding agent event to clients: ${event.event.state}`);
  console.log('Agent event details:', JSON.stringify(event, null, 2));
  
  // Emit the event to all connected clients
  io.emit('agent:event', event);
  console.log(`Emitted 'agent:event' to ${io.engine.clientsCount} clients`);
  
  // Convert relevant agent events to chat messages
  if (event.event.state === 'task.complete' || 
      event.event.state === 'task.progress' || 
      event.event.state === 'task.error') {
    const chatMessage = {
      id: `msg-${Date.now()}`,
      text: event.event.data.message || event.event.data.details || `${event.event.actor}: ${event.event.state}`,
      sender: event.event.actor === 'system' ? 'system' : 'agent',
      timestamp: new Date().toISOString()
    };
    io.emit('chat:message', chatMessage);
    console.log(`Emitted chat message for agent event: ${chatMessage.text}`);
  }
});

// Listen for task updates from bridge
bridgeService.onTaskUpdate((message) => {
  console.log(`Task update received: ${message.type}`);
  
  // For task errors, send a chat message to make sure the user sees it
  if (message.type === 'task_error') {
    const errorMessage = {
      id: `error-${Date.now()}`,
      text: `Error: ${message.error}`,
      sender: 'system',
      timestamp: new Date().toISOString()
    };
    io.emit('chat:message', errorMessage);
    console.log(`Emitted error message: ${errorMessage.text}`);
  }
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Send initial data on connection
  socket.emit('tasks:update', mockTasks);
  socket.emit('status:update', mockSystemStatus);
  
  // Handle chat messages
  socket.on('chat:message', async (message) => {
    console.log(`Received message: ${JSON.stringify(message)}`);
    
    // Echo the message back to all clients (including sender)
    io.emit('chat:message', {
      id: `msg-${Date.now()}`,
      text: message.text,
      sender: message.sender,
      timestamp: new Date().toISOString()
    });
    
    // If it's a user message, forward it to the bridge
    if (message.sender === 'user') {
      try {
        const result = await bridgeService.sendPrompt(message.text);
        console.log(`Prompt sent to bridge, task ID: ${result.taskId}`);
      } catch (error) {
        console.error('Error forwarding message to bridge:', error);
        
        // Notify user of error
        socket.emit('chat:message', {
          id: `msg-error-${Date.now()}`,
          text: 'Sorry, I encountered an error processing your request.',
          sender: 'agent',
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  
  // Handle task refresh requests
  socket.on('tasks:refresh', () => {
    // Simulate task update
    const updatedTasks = [...mockTasks];
    const randomIndex = Math.floor(Math.random() * mockTasks.length);
    
    if (updatedTasks[randomIndex].status === 'running') {
      const currentProgress = updatedTasks[randomIndex].progress || 0;
      const newProgress = Math.min(currentProgress + 15, 100);
      
      if (newProgress === 100) {
        updatedTasks[randomIndex] = {
          ...updatedTasks[randomIndex],
          message: 'Task completed successfully',
          status: 'completed',
          progress: undefined
        };
      } else {
        updatedTasks[randomIndex] = {
          ...updatedTasks[randomIndex],
          progress: newProgress,
          message: `Processing data extraction (${newProgress}% complete)`,
        };
      }
    }
    
    // Broadcast updated tasks to all clients
    io.emit('tasks:update', updatedTasks);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO enabled for real-time communication`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/*`);
});
