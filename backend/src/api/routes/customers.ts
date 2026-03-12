import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkImportCustomers,
  exportCustomers,
} from '@/api/controllers/customerController';

export const customerRouter = Router();

customerRouter.get('/export', exportCustomers);
customerRouter.post('/bulk-import', bulkImportCustomers);
customerRouter.get('/', listCustomers);
customerRouter.get('/:id', getCustomer);
customerRouter.post('/', createCustomer);
customerRouter.put('/:id', updateCustomer);
customerRouter.delete('/:id', deleteCustomer);
