import { Router } from 'express';
import {
  listLabelingTasks, createLabelingTask, getLabelingTask,
  startPrint, startLabel, verifyLabel, batchCreateFromOrder,
} from '@/api/controllers/labelingTaskController';

export const labelingTaskRouter = Router();
labelingTaskRouter.get('/', listLabelingTasks);
labelingTaskRouter.post('/', createLabelingTask);
labelingTaskRouter.post('/batch-create', batchCreateFromOrder);
labelingTaskRouter.get('/:id', getLabelingTask);
labelingTaskRouter.post('/:id/start-print', startPrint);
labelingTaskRouter.post('/:id/start-label', startLabel);
labelingTaskRouter.post('/:id/verify', verifyLabel);
