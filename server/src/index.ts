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

// Set up bridge event forwarding to Socket.IO clients
bridgeService.onAgentEvent(async (event: AgentEventMessage) => {
  console.log(`Forwarding agent event to clients: ${event.event.state}`);
  
  // Emit the event to all connected clients
  io.emit('agent:event', event);
  console.log(`Emitted 'agent:event' to ${io.engine.clientsCount} clients`);
  
  // Store meaningful responses from validator or planner
  if ((event.event.actor === 'validator' || event.event.actor === 'planner') && 
      event.event.state === 'step.ok' && 
      event.event.data.details) {
    lastResponses[event.taskId] = event.event.data.details;
    console.log(`Stored last response for task ${event.taskId}: ${event.event.data.details}`);
  }
  
  // Find the associated task
  const task = await Task.findOne({ taskId: event.taskId });
  if (task && task.chatId) {
    // Handle task failure
    if (event.event.state === 'task.fail') {
      const messageText = event.event.data.message || event.event.data.details || `${event.event.actor}: ${event.event.state}`;
      const messageRole = event.event.actor === 'system' ? 'system' : 'agent';
      
      // Emit chat message to clients
      const chatMessage = {
        id: `msg-${Date.now()}`,
        chatId: task.chatId,
        text: messageText,
        sender: messageRole,
        timestamp: new Date().toISOString()
      };
      io.emit('chat:message', chatMessage);
      console.log(`Task failed. Emitted system error message: ${chatMessage.text}`);
      
      // Save message to database for this chat
      saveMessageToChat(task.chatId, messageText, messageRole, event.taskId);

      // Clean up stored response
      delete lastResponses[event.taskId];
    }
  
    // When task is completed (task.ok), send the last meaningful response as a chat message
    if (event.event.state === 'task.ok') {
      const lastResponse = lastResponses[event.taskId];
      if (lastResponse) {
        const chatMessage = {
          id: `msg-${Date.now()}`,
          chatId: task.chatId,
          text: lastResponse,
          sender: 'agent',
          timestamp: new Date().toISOString()
        };
        io.emit('chat:message', chatMessage);
        console.log(`Task completed. Emitted final response: ${lastResponse}`);
        
        // Save message to database for this chat
        saveMessageToChat(task.chatId, lastResponse, 'agent', event.taskId);

        // Clean up stored response
        delete lastResponses[event.taskId];
      }
    }
  }
});

// Listen for task updates from bridge
bridgeService.onTaskUpdate(async(message) => {
  console.log(`Task update received: ${message.type}`);
  
  // Update task status based on task results/errors
  const task = await Task.findOne({ taskId: message.taskId });
  if (task) {
    try {
      // Update task status
      if (message.type === 'task_result') {
        task.status = 'completed';
        task.result = message.result;
        task.endTime = new Date();
        await task.save();
        console.log(`Task ${message.taskId} completed`);
        io.emit('task:completed', task);
      } else if (message.type === 'task_error') {
        task.status = 'failed';
        task.error = message.error;
        task.endTime = new Date();
        await task.save();
        console.log(`Task ${message.taskId} failed`);
        io.emit('task:failed', task);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }
  
  // For task errors, send chat message and save to database
  if (message.type === 'task_error') {
    const timestamp = new Date();
    let content, role;
    
    content = `Error: ${message.error}`;
    role = 'system';
    
    // Emit message to clients
    const socketMessage = {
      id: `${message.type}-${Date.now()}`,
      text: content,
      sender: role,
      timestamp: timestamp.toISOString()
    };
    io.emit('chat:message', socketMessage);
  }
});

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
          const { strategyPlan, executionResults } = await processUserRequest(message.text, message.chatId);
          
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
          
          // Save the strategy message to the database
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
