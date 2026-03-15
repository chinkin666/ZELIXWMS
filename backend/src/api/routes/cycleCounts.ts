import { Router } from 'express';
import {
  listCycleCounts, createCycleCount, getCycleCount,
  generateItems, submitCount, completeCycleCount, coverageStats,
} from '@/api/controllers/cycleCountController';
import { getAgingAlerts } from '@/api/controllers/agingAlertController';

export const cycleCountRouter = Router();

cycleCountRouter.get('/coverage', coverageStats);
cycleCountRouter.get('/aging-alerts', getAgingAlerts);
cycleCountRouter.get('/', listCycleCounts);
cycleCountRouter.post('/', createCycleCount);
cycleCountRouter.get('/:id', getCycleCount);
cycleCountRouter.post('/:id/generate', generateItems);
cycleCountRouter.post('/:id/count', submitCount);
cycleCountRouter.post('/:id/complete', completeCycleCount);
