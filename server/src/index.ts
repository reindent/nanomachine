import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { router as taskRoutes } from './routes/tasks';
import { router as statusRoutes } from './routes/status';
import { Task, SystemStatus } from './types';
import createVNCService from './vncService';

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

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Send initial data on connection
  socket.emit('tasks:update', mockTasks);
  socket.emit('status:update', mockSystemStatus);
  
  // Handle chat messages
  socket.on('chat:message', (message) => {
    console.log(`Received message: ${JSON.stringify(message)}`);
    // Echo the message back to all clients (including sender)
    io.emit('chat:message', {
      id: `msg-${Date.now()}`,
      text: message.text,
      sender: message.sender,
      timestamp: new Date().toISOString()
    });
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
