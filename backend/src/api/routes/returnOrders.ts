import { Router } from 'express';
import {
  listReturnOrders,
  getReturnOrder,
  createReturnOrder,
  updateReturnOrder,
  startInspection,
  inspectLines,
  completeReturnOrder,
  cancelReturnOrder,
  deleteReturnOrder,
  bulkCreateReturns,
} from '@/api/controllers/returnOrderController';

export const returnOrderRouter = Router();

returnOrderRouter.get('/', listReturnOrders);
returnOrderRouter.post('/', createReturnOrder);
returnOrderRouter.post('/bulk-create', bulkCreateReturns);
returnOrderRouter.get('/:id', getReturnOrder);
returnOrderRouter.put('/:id', updateReturnOrder);
returnOrderRouter.delete('/:id', deleteReturnOrder);
returnOrderRouter.post('/:id/start-inspection', startInspection);
returnOrderRouter.post('/:id/inspect', inspectLines);
returnOrderRouter.post('/:id/complete', completeReturnOrder);
returnOrderRouter.post('/:id/cancel', cancelReturnOrder);
