import express from 'express';
import { Task } from '../types';

const router = express.Router();

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

// GET all tasks
router.get('/', (req, res) => {
  res.json(mockTasks);
});

// GET task by ID
router.get('/:id', (req, res) => {
  const task = mockTasks.find(t => t.id === req.params.id);
  
  if (!task) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }
  
  res.json(task);
});

// POST simulate task refresh (updates a random task)
router.post('/refresh', (req, res) => {
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
        // Remove progress for completed tasks
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
  
  // Return the updated tasks after a simulated delay
  res.json(updatedTasks);
});

export { router };
