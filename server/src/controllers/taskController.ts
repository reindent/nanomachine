import { Request, Response } from 'express';
import { Task, TaskEvent } from '../models';
import { v4 as uuidv4 } from 'uuid';

// Get all tasks
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await Task.find()
      .sort({ startTime: -1 })
      .limit(50);
    
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// Get a single task by ID
export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({ taskId: id });
    
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    res.status(200).json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

// Create a new task
export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, tabId, taskId = uuidv4() } = req.body;
    
    if (!prompt) {
      res.status(400).json({ error: 'Task prompt is required' });
      return;
    }
    
    const task = new Task({
      taskId,
      prompt,
      tabId,
      status: 'pending',
      startTime: new Date()
    });
    
    await task.save();
    
    res.status(201).json({
      status: 'success',
      message: 'Task created successfully',
      taskId: task.taskId
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

// Update a task status
export const updateTaskStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, result, error } = req.body;
    
    const task = await Task.findOne({ taskId: id });
    
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    if (status) task.status = status;
    if (result !== undefined) task.result = result;
    if (error) task.error = error;
    
    // If the task is completed, failed, or cancelled, set the end time
    if (['completed', 'failed', 'cancelled'].includes(status)) {
      task.endTime = new Date();
    }
    
    await task.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Task updated successfully',
      taskId: task.taskId
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// Get events for a task
export const getTaskEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const events = await TaskEvent.find({ taskId: id })
      .sort({ timestamp: 1 });
    
    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching task events:', error);
    res.status(500).json({ error: 'Failed to fetch task events' });
  }
};

// Create a task event
export const createTaskEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { actor, state, data } = req.body;
    
    // Check if task exists
    const task = await Task.findOne({ taskId: id });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    const event = new TaskEvent({
      taskId: id,
      actor,
      state,
      timestamp: new Date(),
      data: {
        step: data?.step || 0,
        maxSteps: data?.maxSteps || 0,
        details: data?.details || ''
      }
    });
    
    await event.save();
    
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating task event:', error);
    res.status(500).json({ error: 'Failed to create task event' });
  }
};
