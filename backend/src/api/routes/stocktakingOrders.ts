import { Router } from 'express';
import {
  listStocktakingOrders,
  getStocktakingOrder,
  createStocktakingOrder,
  updateStocktakingOrder,
  startStocktakingOrder,
  recordCount,
  completeStocktakingOrder,
  adjustStocktakingOrder,
  cancelStocktakingOrder,
  deleteStocktakingOrder,
} from '@/api/controllers/stocktakingController';

export const stocktakingOrderRouter = Router();

stocktakingOrderRouter.get('/', listStocktakingOrders);
stocktakingOrderRouter.post('/', createStocktakingOrder);
stocktakingOrderRouter.get('/:id', getStocktakingOrder);
stocktakingOrderRouter.put('/:id', updateStocktakingOrder);
stocktakingOrderRouter.delete('/:id', deleteStocktakingOrder);
stocktakingOrderRouter.post('/:id/start', startStocktakingOrder);
stocktakingOrderRouter.post('/:id/count', recordCount);
stocktakingOrderRouter.post('/:id/complete', completeStocktakingOrder);
stocktakingOrderRouter.post('/:id/adjust', adjustStocktakingOrder);
stocktakingOrderRouter.post('/:id/cancel', cancelStocktakingOrder);
