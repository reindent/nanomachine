/**
 * Agent Coordinator Service
 * 
 * Coordinates the strategist and executor agents to handle user requests.
 */
import { generateStrategyPlan } from './strategistAgent';
import { executeTask } from './executorAgent';
import { parseTasks } from './taskParser';
import bridgeService from '../bridgeService';
import { EventEmitter } from 'events';
import { Server } from 'socket.io';

// Socket.io instance reference
let io: Server;

/**
 * Configure the agent coordinator with the Socket.IO server instance
 * @param socketIo The Socket.IO server instance
 */
export function configureAgentCoordinator(socketIo: Server) {
  io = socketIo;
}

/**
 * Result of a task execution
 */
export interface TaskExecutionResult {
  task: string;
  result: any;
}

/**
 * Creates a promise that will resolve when a task is completed
 * This uses the bridge service event system instead of polling
 * @param taskId The task ID to wait for
 * @returns A promise that resolves when the task is completed
 */
function createTaskCompletionPromise(taskId: string): Promise<void> {
  return new Promise((resolve) => {
    // One-time event listener for task completion
    const taskUpdateListener = (update: any) => {
      if (update.taskId === taskId && (update.type === 'task_result' || update.type === 'task_error')) {
        // Task has completed or errored out, clean up listener and resolve
        bridgeService.onTaskUpdate(taskUpdateListener);
        console.log(`Task ${taskId} completed with status: ${update.type}`);
        resolve();
      }
    };
    
    // Register the listener
    bridgeService.onTaskUpdate(taskUpdateListener);
    console.log(`Waiting for completion of task ${taskId}...`);
  });
}

/**
 * Process a user request through the strategist and executor agents
 * 
 * @param userRequest The user's request message
 * @param chatId The chat ID associated with the request
 * @returns An object with the strategy plan and execution results
 */
export async function processUserRequest(userRequest: string, chatId: string): Promise<{
  strategyPlan: string;
  executionResults: TaskExecutionResult[];
}> {
  try {
    console.log(`Processing user request: ${userRequest}`);
    
    // Generate a strategy plan using the strategist agent
    const strategyPlan = await generateStrategyPlan(userRequest);
    console.log(`Generated strategy plan: ${strategyPlan}`);
    
    // Send the strategy plan as a message to the client if io is available
    if (io) {
      io.emit('chat:message', {
        id: `strategy-${Date.now()}`,
        chatId,
        text: `**Strategy Plan:**\n\n${strategyPlan}`,
        sender: 'agent',
        timestamp: new Date().toISOString()
      });
    }
    
    // Parse tasks from the strategy plan
    const tasks = parseTasks(strategyPlan);
    console.log(`Parsed ${tasks.length} tasks from strategy plan`);
    
    // Execute each task sequentially
    const executionResults: TaskExecutionResult[] = [];
    
    for (const task of tasks) {
      console.log(`Executing task: ${task}`);
      const result = await executeTask(task, chatId);
      
      // If this is a browser task with a taskId, wait for it to complete using an event
      if (result.taskId) {
        console.log(`Browser task ${result.taskId} started, waiting for completion event...`);
        await createTaskCompletionPromise(result.taskId);
        console.log(`Browser task ${result.taskId} completed, continuing execution`);
      }
      
      executionResults.push({
        task,
        result
      });
    }
    
    return {
      strategyPlan,
      executionResults
    };
  } catch (error) {
    console.error('Error processing user request:', error);
    throw error;
  }
}
