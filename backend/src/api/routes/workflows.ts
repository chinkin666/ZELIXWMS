import { Router } from 'express';
import {
  startReceiving,
  confirmLine,
  startPutaway,
  completePutaway,
  getInboundStatus,
  createWave,
  startPicking,
  completePickTask,
  startSorting,
  completeSorting,
  completePacking,
  getOutboundProgress,
  triggerReplenishment,
  completeReplenish,
  getReplenishStatus,
  getSummary,
} from '@/api/controllers/workflowController';

export const workflowRouter = Router();

// Inbound
workflowRouter.post('/inbound/:orderId/start-receiving', startReceiving);
workflowRouter.post('/inbound/:orderId/confirm-line', confirmLine);
workflowRouter.post('/inbound/:orderId/start-putaway', startPutaway);
workflowRouter.post('/inbound/:orderId/complete-putaway', completePutaway);
workflowRouter.get('/inbound/:orderId/status', getInboundStatus);

// Outbound
workflowRouter.post('/outbound/wave', createWave);
workflowRouter.post('/outbound/wave/:waveId/start-picking', startPicking);
workflowRouter.post('/outbound/picking/:taskId/complete', completePickTask);
workflowRouter.post('/outbound/wave/:waveId/start-sorting', startSorting);
workflowRouter.post('/outbound/wave/:waveId/complete-sorting', completeSorting);
workflowRouter.post('/outbound/packing/:taskId/complete', completePacking);
workflowRouter.get('/outbound/wave/:waveId/progress', getOutboundProgress);

// Replenishment
workflowRouter.post('/replenishment/trigger', triggerReplenishment);
workflowRouter.post('/replenishment/:taskId/complete', completeReplenish);
workflowRouter.get('/replenishment/status', getReplenishStatus);

// Summary
workflowRouter.get('/summary', getSummary);
