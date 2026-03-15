import { Router } from 'express';
import {
  listShops,
  getShop,
  createShop,
  updateShop,
  deleteShop,
} from '@/api/controllers/shopController';

export const shopRouter = Router();

shopRouter.get('/', listShops);
shopRouter.get('/:id', getShop);
shopRouter.post('/', createShop);
shopRouter.put('/:id', updateShop);
shopRouter.delete('/:id', deleteShop);
