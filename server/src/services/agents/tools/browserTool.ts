/**
 * Browser Tool
 * 
 * This tool handles browser operations through the bridge service.
 * It properly handles the asynchronous nature of browser tasks and integrates with the event system.
 */

// Tool description for use by other agents
export const BROWSER_TOOL_DESCRIPTION = {
  name: "Browser Tool",
  description: "Interfaces with the Nanobrowser extension to perform web-based tasks such as searching, navigating to websites, extracting information, and interacting with web elements.",
  capabilities: [
    "Web search and information retrieval",
    "Website navigation and content extraction",
    "Form filling and submission",
    "Screenshot capture",
    "Data collection from multiple sources"
  ],
  bestFor: [
    "Research tasks requiring web access",
    "Finding specific information online",
    "Comparing data across multiple websites",
    "Extracting structured data from web pages"
  ]
};
import 'dotenv/config';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { EventEmitter } from 'events';
import bridgeService from '../../bridgeService';
import { Tool, ToolResponse } from '../executorAgent';

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

    // Handle task failure
    if (event.event.state === 'task.fail') {
      const errorMessage = event.event.data.message || event.event.data.details || `${event.event.actor}: ${event.event.state}`;
      console.log(`Browser task ${event.taskId} failed: ${errorMessage}`);
      
      // Emit task completion event with failure
      taskEvents.emit(`nanobrowser_completed:${event.taskId}`, {
        success: false,
        taskId: event.taskId,
        message: errorMessage
      });
      
      // Clean up stored response
      delete lastResponses[event.taskId];
    }
    
    // When task is completed (task.ok), process the result
    if (event.event.state === 'task.ok') {
      const lastResponse = lastResponses[event.taskId];
      if (lastResponse) {
        console.log(`Browser task ${event.taskId} completed with response`);

        // Emit task completion event with success
        taskEvents.emit(`nanobrowser_completed:${event.taskId}`, {
          success: true,
          taskId: event.taskId,
          message: lastResponse
        });
        
        // Clean up stored response
        delete lastResponses[event.taskId];
      }
    }
  });
  
  // Listen for task updates
  bridgeService.onTaskUpdate(async (message) => {
    console.log(`Browser tool received task update: ${message.type} for task ${message.taskId}`);

    try {
      // Handle task result
      if (message.type === 'task_result') {
        // Use the last response if available, otherwise use the result from the message
        const result = lastResponses[message.taskId] || message.result;
        
        // Emit task completion event
        taskEvents.emit(`nanobrowser_completed:${message.taskId}`, {
          success: true,
          taskId: message.taskId,
          message: result
        });
        
        // Clean up stored response
        delete lastResponses[message.taskId];
      } 
      // Handle task error
      else if (message.type === 'task_error') {
        // Emit task completion event with failure
        taskEvents.emit(`nanobrowser_completed:${message.taskId}`, {
          success: false,
          taskId: message.taskId,
          message: message.error
        });
        
        // Clean up stored response
        delete lastResponses[message.taskId];
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  });
}

/**
 * Creates a promise that will resolve when a task is completed
 * @param nanobrowserTaskId The task ID to wait for
 * @returns A promise that resolves with the task result when completed
 */
function createNanobrowserTaskCompletionPromise(nanobrowserTaskId: string): Promise<any> {
  return new Promise((resolve) => {
    console.log(`Creating completion promise for browser task ${nanobrowserTaskId}...`);
    
    // Check if we already have a listener for this task
    const hasListeners = taskEvents.listenerCount(`nanobrowser_completed:${nanobrowserTaskId}`) > 0;
    if (hasListeners) {
      console.log(`Warning: Existing listeners found for task ${nanobrowserTaskId}`);
    }
    
    // Set up a one-time listener for task completion
    taskEvents.once(`nanobrowser_completed:${nanobrowserTaskId}`, (result) => {
      console.log(`Received completion event for nanobrowser task ${nanobrowserTaskId}:`, result);
      resolve(result);
    });
  });
}

/**
 * Browser tool for web operations
 */
export
const browserTool = async (task: string, options: any = {}): Promise<ToolResponse> => {
  console.log(`Executing browser task: ${task}`);
  try {
    // Get the original task if provided in options
    const originalTask = options.originalTask || task;
    
    // Use the existing bridge service to execute browser tasks
    const initResult = await bridgeService.sendPrompt(task);
    console.log(`Browser task sent to bridge, task ID: ${initResult.taskId}`);

    // Wait for the task to complete
    const result = await createNanobrowserTaskCompletionPromise(initResult.taskId);
    console.log(`Browser task ${initResult.taskId} completed with result:`, result);
    
    return result;
  } catch (error) {
    console.error('Error executing browser task:', error);
    return {
      success: false,
      message: `Error executing browser task: ${error}`
    };
  }
};
