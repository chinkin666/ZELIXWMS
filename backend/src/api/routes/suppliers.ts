import { Router } from 'express';
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  bulkImportSuppliers,
  exportSuppliers,
} from '@/api/controllers/supplierController';

export const supplierRouter = Router();

supplierRouter.get('/export', exportSuppliers);
supplierRouter.post('/bulk-import', bulkImportSuppliers);
supplierRouter.get('/', listSuppliers);
supplierRouter.get('/:id', getSupplier);
supplierRouter.post('/', createSupplier);
supplierRouter.put('/:id', updateSupplier);
supplierRouter.delete('/:id', deleteSupplier);
