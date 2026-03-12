import { Router } from 'express';
import {
  listSetProducts,
  getSetProduct,
  createSetProduct,
  updateSetProduct,
  deleteSetProduct,
  createSetOrder,
  listSetOrders,
  getSetOrder,
  completeSetOrder,
  cancelSetOrder,
} from '@/api/controllers/setProductController';

export const setProductRouter = Router();

// SetOrder routes MUST come before /:id to avoid conflicts
setProductRouter.post('/orders', createSetOrder);
setProductRouter.get('/orders/list', listSetOrders);
setProductRouter.get('/orders/:id', getSetOrder);
setProductRouter.post('/orders/:id/complete', completeSetOrder);
setProductRouter.post('/orders/:id/cancel', cancelSetOrder);

// SetProduct CRUD
setProductRouter.get('/', listSetProducts);
setProductRouter.post('/', createSetProduct);
setProductRouter.get('/:id', getSetProduct);
setProductRouter.put('/:id', updateSetProduct);
setProductRouter.delete('/:id', deleteSetProduct);
