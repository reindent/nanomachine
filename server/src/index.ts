/**
 * Nanomachine
 * 
 * Copyright (c) 2025-present Reindent LLC
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { Message } from './models';
import { configureTaskService } from './services/taskService';
import { router as statusRoutes } from './routes/status';
import { router as bridgeRoutes } from './routes/bridge';
import { AgentEventMessage } from './types/bridge';
import { configureAgentCoordinator, processUserRequest } from './services/agents/agentCoordinator';
import { configureExecutorAgent } from './services/agents/executorAgent';
import createVNCService from './vnc/vncService';
import { configureNanobrowser } from './services/nanobrowserService';
import bridgeService from './services/bridgeService';
import { connectToDatabase } from './utils/database';
import chatRoutes from './routes/chatRoutes';
import taskRoutes from './routes/taskRoutes';
import { Chat, Task, TaskEvent } from './models';
import { addMessageToChat, configureChatService, createChat } from './services/chatService';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Simple counter for active sessions
let activeSessionCount = 0;

// Initialize VNC service
createVNCService(io);

// Configure the agent coordinator and task service with Socket.IO
configureAgentCoordinator(io);
configureTaskService(io);
configureChatService(io);

// Configure executor agent with the socket.io instance
configureExecutorAgent(io);

const PORT = process.env.SERVER_PORT || 3100;

// Function to broadcast system status to all connected clients
const broadcastSystemStatus = () => {
  const systemStatus = {
    websocketStatus: 'connected',
    nanomachineClientVersion: process.env.CLIENT_VERSION || '1.0.0',
    nanobrowserVersion: bridgeService.getNanobrowserVersion(),
    serverStatus: bridgeService.isBridgeConnected() ? 'online' : 'offline',
    activeSessions: activeSessionCount
  };
  io.emit('status:update', systemStatus);
};

// Set up periodic status updates
setInterval(broadcastSystemStatus, 10000); // Update every 10 seconds
broadcastSystemStatus(); // Initial broadcast

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectToDatabase()
  .then(() => console.log('MongoDB connection established'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/bridge', bridgeRoutes);
app.use('/api/chats', chatRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Store the last meaningful response for each task
const lastResponses: Record<string, string> = {};

// Helper function to save a message to the database
async function saveMessageToChat(chatId: string, content: string | undefined, role: string, taskId?: string): Promise<void> {
  try {
    // Ensure content is never undefined or empty
    const safeContent = content || 'No content available';
    const safeRole = role === 'agent' || role === 'user' || role === 'system' ? role : 'system';
    
    // Create new message
    const newMessage = new Message({
      chatId,
      role: safeRole,
      content: safeContent,
      timestamp: new Date(),
      metadata: taskId ? { taskId } : undefined
    });
    
    await newMessage.save();
    
    // Update chat's lastMessageAt timestamp
    await Chat.findByIdAndUpdate(chatId, { lastMessageAt: new Date() });
    
    console.log(`Saved ${safeRole} message to chat ${chatId}${taskId ? ` for task ${taskId}` : ''}`);
  } catch (error) {
    console.error('Error saving message to chat:', error);
  }
}

// Socket.IO event handlers
io.on('connection', async (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Increment active session counter
  activeSessionCount++;
  broadcastSystemStatus();
  
  try {
    // Send initial data on connection
    const tasks = await Task.find({ archived: false }).sort({ startTime: -1 }).limit(10);
    socket.emit('tasks:update', tasks);
    
    // Get system status for this client
    const systemStatus = {
      websocketStatus: 'connected',
      nanomachineClientVersion: process.env.CLIENT_VERSION || '1.0.0',
      nanobrowserVersion: bridgeService.getNanobrowserVersion(),
      serverStatus: bridgeService.isBridgeConnected() ? 'online' : 'offline',
      activeSessions: activeSessionCount
    };
    socket.emit('status:update', systemStatus);
  } catch (error) {
    console.error('Error fetching initial data:', error);
  }
  
  // Handle chat messages
  socket.on('chat:message', async (message) => {
    console.log(`Received message: ${JSON.stringify(message)}`);
    
    let chatId = message.chatId;
    try {
      // Create a new chat if no chatId is provided (first message)
      // Check for undefined, null, empty string, or invalid ObjectId format
      if (!chatId || chatId === '' || !(await Chat.findById(chatId))) {
        chatId = await createChat();
      }

      // TODO: check edge cases where we don't want the client to keep typing
      await addMessageToChat(chatId, message.text, message.sender, true);

      // If it's a user message, process it through our agent system
      if (message.sender === 'user') {
        try {
          // Process the user request through the agent coordinator
          const { finalResponse } = await processUserRequest(message.text, chatId);
          
          // After all tasks are completed, send the final response to the user
          await addMessageToChat(chatId, finalResponse, 'agent', false);
        } catch (error) {
          console.error('Error forwarding message to bridge:', error);
          
          // Notify user of error
          await addMessageToChat(chatId, 'Sorry, I encountered an error processing your request.', 'system', false);
        }
      }
    } catch (dbError) {
      console.error('Database error handling message:', dbError);
    }
  });
  
  // Handle task refresh requests
  socket.on('tasks:refresh', async () => {
    try {
      const tasks = await Task.find({ archived: false }).sort({ startTime: -1 }).limit(10);
      socket.emit('tasks:update', tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  });
  
  // Handle task archive request
  socket.on('task:archive', async (taskId) => {
    try {
      const task = await Task.findOne({ taskId });
      if (task) {
        task.archived = true;
        await task.save();
        console.log(`Task ${taskId} archived`);
        
        // Send updated task list
        const tasks = await Task.find({ archived: false }).sort({ startTime: -1 }).limit(10);
        socket.emit('tasks:update', tasks);
      }
    } catch (error) {
      console.error('Error archiving task:', error);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    // Decrement active session counter (ensure it never goes below 0)
    activeSessionCount = Math.max(0, activeSessionCount - 1);
    broadcastSystemStatus();
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO enabled for real-time communication`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/*`);
});
