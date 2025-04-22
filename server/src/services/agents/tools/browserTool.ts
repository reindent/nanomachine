/**
 * Browser Tool
 * 
 * This tool handles browser operations through the bridge service.
 * It properly handles the asynchronous nature of browser tasks and integrates with the event system.
 */
import 'dotenv/config';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { EventEmitter } from 'events';
import bridgeService from '../../bridgeService';
import { Tool } from '../executorAgent';

// Import the Task model
const Task = mongoose.model('Task');

// Event emitter for task completion events
const taskEvents = new EventEmitter();

// Store for last responses from tasks
const lastResponses: Record<string, string> = {};

// Socket.io instance reference
let io: Server;

// Flag to track if event listeners are set up
let listenersInitialized = false;

/**
 * Configure the browser tool with the Socket.IO server instance
 * @param socketIo The Socket.IO server instance
 */
export function configureBrowserTool(socketIo: Server) {
  io = socketIo;
  
  // Set up listeners for agent events if not already initialized
  if (!listenersInitialized) {
    setupEventListeners();
    listenersInitialized = true;
  }
}

/**
 * Set up listeners for agent events and task updates
 */
function setupEventListeners() {
  console.log('Setting up browser tool event listeners');
  
  // Listen for agent events
  bridgeService.onAgentEvent(async (event) => {
    console.log(`Browser tool received agent event: ${event.event.state} for task ${event.taskId}`);
    
    // Store meaningful responses from validator or planner
    if ((event.event.actor === 'validator' || event.event.actor === 'planner') && 
        event.event.state === 'step.ok' && 
        event.event.data.details) {
      lastResponses[event.taskId] = event.event.data.details;
      console.log(`Browser tool stored last response for task ${event.taskId}`);
    }
    
    // Find the associated task
    const task = await Task.findOne({ taskId: event.taskId });
    if (task) {
      // Handle task failure
      if (event.event.state === 'task.fail') {
        const errorMessage = event.event.data.message || event.event.data.details || `${event.event.actor}: ${event.event.state}`;
        console.log(`Browser task ${event.taskId} failed: ${errorMessage}`);
        
        // Update task status
        task.status = 'failed';
        task.error = errorMessage;
        task.endTime = new Date();
        await task.save();
        
        // Emit task completion event with failure
        taskEvents.emit(`task_completed:${event.taskId}`, {
          success: false,
          taskId: event.taskId,
          error: errorMessage
        });
        
        // Clean up stored response
        delete lastResponses[event.taskId];
      }
      
      // When task is completed (task.ok), process the result
      if (event.event.state === 'task.ok') {
        const lastResponse = lastResponses[event.taskId];
        if (lastResponse) {
          console.log(`Browser task ${event.taskId} completed with response`);
          
          // Update task status
          task.status = 'completed';
          task.result = lastResponse;
          task.endTime = new Date();
          await task.save();
          
          // Emit task completion event with success
          taskEvents.emit(`task_completed:${event.taskId}`, {
            success: true,
            taskId: event.taskId,
            result: lastResponse
          });
          
          // Clean up stored response
          delete lastResponses[event.taskId];
        }
      }
    }
  });
  
  // Listen for task updates
  bridgeService.onTaskUpdate(async (message) => {
    console.log(`Browser tool received task update: ${message.type} for task ${message.taskId}`);
    
    // Find the associated task
    const task = await Task.findOne({ taskId: message.taskId });
    if (task) {
      try {
        // Handle task result
        if (message.type === 'task_result') {
          // Update task status
          task.status = 'completed';
          task.result = message.result || lastResponses[message.taskId];
          task.endTime = new Date();
          await task.save();
          
          // Use the last response if available, otherwise use the result from the message
          const result = lastResponses[message.taskId] || message.result;
          
          // Emit task completion event
          taskEvents.emit(`task_completed:${message.taskId}`, {
            success: true,
            taskId: message.taskId,
            result: result
          });
          
          // Clean up stored response
          delete lastResponses[message.taskId];
        } 
        // Handle task error
        else if (message.type === 'task_error') {
          // Update task status
          task.status = 'failed';
          task.error = message.error;
          task.endTime = new Date();
          await task.save();
          
          // Emit task completion event with failure
          taskEvents.emit(`task_completed:${message.taskId}`, {
            success: false,
            taskId: message.taskId,
            error: message.error
          });
          
          // Clean up stored response
          delete lastResponses[message.taskId];
        }
      } catch (error) {
        console.error('Error updating task:', error);
      }
    }
  });
}

/**
 * Creates a promise that will resolve when a task is completed
 * @param taskId The task ID to wait for
 * @returns A promise that resolves with the task result when completed
 */
function createTaskCompletionPromise(taskId: string): Promise<any> {
  return new Promise((resolve) => {
    console.log(`Creating completion promise for browser task ${taskId}...`);
    
    // Check if we already have a listener for this task
    const hasListeners = taskEvents.listenerCount(`task_completed:${taskId}`) > 0;
    if (hasListeners) {
      console.log(`Warning: Existing listeners found for task ${taskId}`);
    }
    
    // Set up a one-time listener for task completion
    taskEvents.once(`task_completed:${taskId}`, (result) => {
      console.log(`Received completion event for task ${taskId}:`, result);
      resolve(result);
    });
  });
}

/**
 * Browser tool for web operations
 */
export const browserTool: Tool = {
  name: 'BROWSER',
  execute: async (task: string, chatId: string) => {
    console.log(`Executing browser task: ${task}`);
    try {
      // Use the existing bridge service to execute browser tasks
      const initResult = await bridgeService.sendPrompt(task);
      console.log(`Browser task sent to bridge, task ID: ${initResult.taskId}`);
      
      // Create a task record in the database
      try {
        const taskRecord = new (mongoose.model('Task'))({
          taskId: initResult.taskId,
          chatId: chatId,
          prompt: task,
          status: 'running',
          startTime: new Date()
        });
        await taskRecord.save();
        console.log(`Created task record for ${initResult.taskId}`);
      } catch (dbError) {
        console.error('Error creating task record:', dbError);
        // Continue even if task record creation fails
      }
      
      // Wait for the task to complete
      const result = await createTaskCompletionPromise(initResult.taskId);
      console.log(`Browser task ${initResult.taskId} completed with result:`, result);
      
      return result;
    } catch (error) {
      console.error('Error executing browser task:', error);
      return {
        success: false,
        message: `Error executing browser task: ${error}`
      };
    }
  }
};
