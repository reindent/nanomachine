import express from 'express';
import * as taskController from '../controllers/taskController';

const router = express.Router();

// Task routes
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTaskStatus);

// Task event routes
router.get('/:id/events', taskController.getTaskEvents);
router.post('/:id/events', taskController.createTaskEvent);

export default router;
