import { Router } from 'express';
import {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  toggleTenantStatus,
} from '@/api/controllers/tenantController';

export const tenantRouter = Router();

tenantRouter.get('/', listTenants);
tenantRouter.get('/:id', getTenant);
tenantRouter.post('/', createTenant);
tenantRouter.put('/:id', updateTenant);
tenantRouter.put('/:id/status', toggleTenantStatus);
tenantRouter.delete('/:id', deleteTenant);
