import { Router } from 'express';
import {
  listSubClients,
  getSubClient,
  createSubClient,
  updateSubClient,
  deleteSubClient,
} from '@/api/controllers/subClientController';

export const subClientRouter = Router();

subClientRouter.get('/', listSubClients);
subClientRouter.get('/:id', getSubClient);
subClientRouter.post('/', createSubClient);
subClientRouter.put('/:id', updateSubClient);
subClientRouter.delete('/:id', deleteSubClient);
