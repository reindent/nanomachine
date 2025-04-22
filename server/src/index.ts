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
import { router as statusRoutes } from './routes/status';
import { router as bridgeRoutes } from './routes/bridge';
import { AgentEventMessage } from './types/bridge';
import createVNCService from './vnc/vncService';
import { configureNanobrowser } from './services/nanobrowserService';
import { processUserRequest, configureAgentCoordinator } from './services/agents/agentCoordinator';
import { configureExecutorAgent } from './services/agents/executorAgent';
import bridgeService from './services/bridgeService';
import { connectToDatabase } from './utils/database';
import chatRoutes from './routes/chatRoutes';
import taskRoutes from './routes/taskRoutes';
import { Chat, Message, Task, TaskEvent } from './models';

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

// Configure agent coordinator with the socket.io instance
configureAgentCoordinator(io);

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
    
    try {
      // Create a new chat if no chatId is provided (first message)
      // Check for undefined, null, empty string, or invalid ObjectId format
      if (!message.chatId || message.chatId === '') {
        console.log('No valid chatId provided, creating new chat');
        const newChat = new Chat({
          title: `New Session ${new Date().toLocaleString()}`,
          lastMessageAt: new Date()
        });
        const savedChat = await newChat.save();
        message.chatId = savedChat.id;
        console.log(`Created new chat with ID: ${message.chatId}`);
        
        // Notify all clients that a new chat was created
        io.emit('chat:created', {
          chatId: savedChat.id,
          title: savedChat.title,
          lastMessageAt: savedChat.lastMessageAt,
          isActive: true,
          createdAt: savedChat.createdAt,
          updatedAt: savedChat.updatedAt
        });
        io.emit('chat:select', savedChat.id);
      } else {
        // Verify that the chat exists
        const chatExists = await Chat.findById(message.chatId);
        if (!chatExists) {
          console.log(`Chat with ID ${message.chatId} not found, creating new chat`);
          const newChat = new Chat({
            title: `New Session ${new Date().toLocaleString()}`,
            lastMessageAt: new Date()
          });
          const savedChat = await newChat.save();
          message.chatId = savedChat.id;
          console.log(`Created new chat with ID: ${message.chatId}`);
          
          // Notify all clients that a new chat was created
          io.emit('chat:created', {
            chatId: savedChat.id,
            title: savedChat.title,
            lastMessageAt: savedChat.lastMessageAt,
            isActive: true,
            createdAt: savedChat.createdAt,
            updatedAt: savedChat.updatedAt
          });
          io.emit('chat:select', savedChat.id);
        }
      }
      
      // Save message to database
      const newMessage = new Message({
        chatId: message.chatId,
        role: message.sender,
        content: message.text,
        timestamp: new Date()
      });
      await newMessage.save();
      
      // Update the chat's lastMessageAt timestamp
      await Chat.findByIdAndUpdate(message.chatId, { lastMessageAt: new Date() });
      
      // IMPORTANT: Always echo the message back to ALL clients immediately
      // Use a simple format that matches what the client expects
      const echoMessage = {
        id: `msg-${Date.now()}`, // Simple ID that doesn't depend on database
        chatId: message.chatId,
        text: message.text,
        sender: message.sender,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to ALL connected clients without filtering
      io.emit('chat:message', echoMessage);
      console.log(`Echoed message to all clients: ${message.text} (${message.sender}) with chatId: ${message.chatId}`);
      
      // If it's a user message, process it through our agent system
      if (message.sender === 'user') {
        try {
          // Process the user request through the agent coordinator
          const { strategyPlan, executionResults, finalResponse } = await processUserRequest(message.text, message.chatId);
          
          // Send a system message with the strategy plan
          const strategyMessage = {
            id: `msg-${Date.now()}-strategy`,
            chatId: message.chatId,
            text: `**Strategy Plan:**\n\n${strategyPlan}`,
            sender: 'system',
            timestamp: new Date().toISOString()
          };
          
          // Broadcast the strategy plan to all clients
          io.emit('chat:message', strategyMessage);
          
          // Save the strategy plan to the database
          const strategyDbMessage = new Message({
            chatId: message.chatId,
            role: 'system',
            content: `**Strategy Plan:**\n\n${strategyPlan}`,
            timestamp: new Date()
          });
          await strategyDbMessage.save();
          
          // Process each execution result
          for (const executionResult of executionResults) {
            // For browser tasks, we've already sent them to the bridge and created task records
            if (executionResult.result.taskId) {
              // Check if a task with this ID already exists
              const existingTask = await Task.findOne({ taskId: executionResult.result.taskId });

              if (!existingTask) {
                try {
                  // Create a task record for browser tasks
                  const task = new Task({
                    taskId: executionResult.result.taskId,
                    prompt: executionResult.task,
                    chatId: message.chatId,
                    status: 'running',
                    archived: false,
                    startTime: new Date()
                  });
                  await task.save();
                  
                  // Notify clients that a new task was created
                  io.emit('task:created', task);
                } catch (error) {
                  console.error(`Error creating task record: ${error}`);
                }
              } else {
                console.log(`Task ${executionResult.result.taskId} already exists, skipping creation`);
              }
            } else {
              // For filesystem tasks (or other non-browser tasks), send a system message with the result
              const resultMessage = {
                id: `msg-${Date.now()}-result-${executionResults.indexOf(executionResult)}`,
                chatId: message.chatId,
                text: `**Task Result:**\n\nTask: ${executionResult.task}\nResult: ${executionResult.result.message}`,
                sender: 'system',
                timestamp: new Date().toISOString()
              };
              
              // Broadcast the result to all clients
              io.emit('chat:message', resultMessage);
              
              // Save the result message to the database
              const resultDbMessage = new Message({
                chatId: message.chatId,
                role: 'system',
                content: `**Task Result:**\n\nTask: ${executionResult.task}\nResult: ${executionResult.result.message}`,
                timestamp: new Date()
              });
              await resultDbMessage.save();
            }
          }
          
          // After all tasks are completed, send the final response to the user
          const finalResponseMessage = {
            id: `msg-${Date.now()}-final`,
            chatId: message.chatId,
            text: finalResponse,
            sender: 'agent',
            timestamp: new Date().toISOString()
          };
          
          // Broadcast the final response to all clients
          io.emit('chat:message', finalResponseMessage);
          
          // Save the final response to the database
          const finalResponseDbMessage = new Message({
            chatId: message.chatId,
            role: 'agent',
            content: finalResponse,
            timestamp: new Date()
          });
          await finalResponseDbMessage.save();
          
        } catch (error) {
          console.error('Error forwarding message to bridge:', error);
          
          // Notify user of error
          socket.emit('chat:message', {
            id: `msg-error-${Date.now()}`,
            chatId: message.chatId,
            text: 'Sorry, I encountered an error processing your request.',
            sender: 'system',
            timestamp: new Date().toISOString()
          });
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
