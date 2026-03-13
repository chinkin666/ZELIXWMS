import { Router } from 'express';
import {
  listWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  exportWarehouses,
} from '@/api/controllers/warehouseController';

export const warehouseRouter = Router();

warehouseRouter.get('/export', exportWarehouses);
warehouseRouter.get('/', listWarehouses);
warehouseRouter.get('/:id', getWarehouse);
warehouseRouter.post('/', createWarehouse);
warehouseRouter.put('/:id', updateWarehouse);
warehouseRouter.delete('/:id', deleteWarehouse);
