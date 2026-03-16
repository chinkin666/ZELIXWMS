import { Router } from 'express';
import {
  listOutboundRequests,
  createOutboundRequest,
  getOutboundRequest,
  approveOutboundRequest,
  shipOutboundRequest,
} from '@/api/controllers/outboundRequestController';

export const outboundRequestRouter = Router();

outboundRequestRouter.get('/', listOutboundRequests);
outboundRequestRouter.post('/', createOutboundRequest);
outboundRequestRouter.get('/:id', getOutboundRequest);
outboundRequestRouter.post('/:id/approve', approveOutboundRequest);
outboundRequestRouter.post('/:id/ship', shipOutboundRequest);
