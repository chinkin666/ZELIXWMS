import { Router } from 'express';
import {
  createOrderSourceCompany,
  deleteOrderSourceCompany,
  getOrderSourceCompany,
  importOrderSourceCompaniesBulk,
  listOrderSourceCompanies,
  updateOrderSourceCompany,
  validateImportOrderSourceCompanies,
} from '@/api/controllers/orderSourceCompanyController';

export const orderSourceCompanyRouter = Router();

orderSourceCompanyRouter.get('/', listOrderSourceCompanies);
orderSourceCompanyRouter.get('/:id', getOrderSourceCompany);
orderSourceCompanyRouter.post('/validate-import', validateImportOrderSourceCompanies);
orderSourceCompanyRouter.post('/import-bulk', importOrderSourceCompaniesBulk);
orderSourceCompanyRouter.post('/', createOrderSourceCompany);
orderSourceCompanyRouter.put('/:id', updateOrderSourceCompany);
orderSourceCompanyRouter.delete('/:id', deleteOrderSourceCompany);

