import { Router } from 'express';
import {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  toggleTenantStatus,
} from '@/api/controllers/tenantController';
// CRIT-04: テナント管理は admin のみ / 租户管理仅限 admin
import { requireRole } from '@/api/middleware/auth';

export const tenantRouter = Router();

// 全テナントルートに admin ロールチェック適用 / 所有租户路由添加 admin 角色检查
tenantRouter.get('/', requireRole('admin'), listTenants);
tenantRouter.get('/:id', requireRole('admin'), getTenant);
tenantRouter.post('/', requireRole('admin'), createTenant);
tenantRouter.put('/:id', requireRole('admin'), updateTenant);
tenantRouter.put('/:id/status', requireRole('admin'), toggleTenantStatus);
tenantRouter.delete('/:id', requireRole('admin'), deleteTenant);
