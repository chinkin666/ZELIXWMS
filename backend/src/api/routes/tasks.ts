import { Router } from 'express';
import {
  listTasks,
  getTask,
  createTask,
  assignTask,
  startTask,
  completeTask,
  cancelTask,
  holdTask,
  getNextTask,
  getTaskQueue,
} from '@/api/controllers/taskController';

export const taskRouter = Router();

// /next and /queue must be registered before /:id
taskRouter.get('/next', getNextTask);
taskRouter.get('/queue', getTaskQueue);
taskRouter.get('/', listTasks);
taskRouter.get('/:id', getTask);
taskRouter.post('/', createTask);
taskRouter.put('/:id/assign', assignTask);
taskRouter.put('/:id/start', startTask);
taskRouter.put('/:id/complete', completeTask);
taskRouter.put('/:id/cancel', cancelTask);
taskRouter.put('/:id/hold', holdTask);
