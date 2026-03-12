import { Router } from 'express';
import {
  listInboundOrders,
  getInboundOrder,
  createInboundOrder,
  updateInboundOrder,
  confirmInboundOrder,
  receiveInboundLine,
  putawayInboundLine,
  bulkReceiveInbound,
  completeInboundOrder,
  cancelInboundOrder,
  deleteInboundOrder,
  searchInboundHistory,
} from '@/api/controllers/inboundOrderController';

export const inboundOrderRouter = Router();

inboundOrderRouter.get('/', listInboundOrders);
inboundOrderRouter.get('/history', searchInboundHistory);
inboundOrderRouter.post('/', createInboundOrder);
inboundOrderRouter.get('/:id', getInboundOrder);
inboundOrderRouter.put('/:id', updateInboundOrder);
inboundOrderRouter.delete('/:id', deleteInboundOrder);
inboundOrderRouter.post('/:id/confirm', confirmInboundOrder);
inboundOrderRouter.post('/:id/receive', receiveInboundLine);
inboundOrderRouter.post('/:id/bulk-receive', bulkReceiveInbound);
inboundOrderRouter.post('/:id/putaway', putawayInboundLine);
inboundOrderRouter.post('/:id/complete', completeInboundOrder);
inboundOrderRouter.post('/:id/cancel', cancelInboundOrder);
