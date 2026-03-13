import { Router } from 'express';
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  exportClients,
} from '@/api/controllers/clientController';

export const clientRouter = Router();

clientRouter.get('/export', exportClients);
clientRouter.get('/', listClients);
clientRouter.get('/:id', getClient);
clientRouter.post('/', createClient);
clientRouter.put('/:id', updateClient);
clientRouter.delete('/:id', deleteClient);
