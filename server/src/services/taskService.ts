import Task from '../models/Task';
import { Server } from 'socket.io';

let io: Server;

/**
 * Configure the task service with Socket.IO
 * @param socketIo Socket.IO server instance
 */
export function configureTaskService(socketIo: Server) {
  io = socketIo;
}

/**
 * Create a new task record
 * 
 * @param originalTask Original task from the strategy plan
 * @param enrichedTask Task enriched with context (if applicable)
 * @param chatId Chat ID associated with the task
 * @param status Initial status of the task
 * @param taskType Type of task (browser, shell, data)
 * @returns The created task
 */
export async function createTask(
  originalTask: string,
  enrichedTask: string | null,
  chatId: string,
  status: 'pending' | 'running' | 'completed' | 'error' = 'pending',
  taskType: 'browser' | 'shell' | 'data' = 'shell'
): Promise<any> {
  try {
    // Create a new task record
    const task = await Task.create({
      prompt: originalTask, // Always use the original task from the strategist
      enrichedPrompt: enrichedTask, // Store the enriched version if available
      chatId,
      status,
      type: taskType,
      archived: false,
      startTime: new Date()
    });
    console.log(`Created task record: ${task.id}`);
    
    // Notify clients that a new task was created
    if (io) io.emit('task:created', task);
    
    return task;
  } catch (error) {
    console.error(`Error creating task record: ${error}`);
    throw error;
  }
}

/**
 * Update a task's status
 * 
 * @param taskId ID of the task to update
 * @param status New status
 * @param result Task result (if completed)
 * @returns The updated task
 */
export async function updateTask(
  taskId: string,
  status: 'pending' | 'running' | 'completed' | 'error',
  result?: any
): Promise<any> {
  try {
    const task = await Task.findById(taskId);
    
    if (!task) {
      console.error(`Task ${taskId} not found`);
      return null;
    }
    
    task.status = status;
    
    if (status === 'completed' || status === 'error') {
      task.endTime = new Date();
      if (result) {
        task.result = result;
      }
    }
    
    await task.save();
    console.log(`Updated task ${taskId} status to ${status}`);
    
    // Notify clients that the task was updated
    if (io) io.emit('task:update', task);
    
    return task;
  } catch (error) {
    console.error(`Error updating task status: ${error}`);
    throw error;
  }
}
