import { Router } from 'express';
import {
  listShippingRates,
  getShippingRate,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
  calculateShippingCost,
} from '@/api/controllers/shippingRateController';

export const shippingRateRouter = Router();

// 料金計算（:id より先に定義）/ 费用计算（在 :id 之前定义）
shippingRateRouter.post('/calculate', calculateShippingCost);

// CRUD
shippingRateRouter.get('/', listShippingRates);
shippingRateRouter.get('/:id', getShippingRate);
shippingRateRouter.post('/', createShippingRate);
shippingRateRouter.put('/:id', updateShippingRate);
shippingRateRouter.delete('/:id', deleteShippingRate);
