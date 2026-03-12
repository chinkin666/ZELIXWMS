import { Router } from 'express';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaults,
} from '@/api/controllers/inventoryCategoryController';

export const inventoryCategoryRouter = Router();

inventoryCategoryRouter.get('/', listCategories);
inventoryCategoryRouter.post('/seed', seedDefaults);
inventoryCategoryRouter.get('/:id', getCategory);
inventoryCategoryRouter.post('/', createCategory);
inventoryCategoryRouter.put('/:id', updateCategory);
inventoryCategoryRouter.delete('/:id', deleteCategory);
