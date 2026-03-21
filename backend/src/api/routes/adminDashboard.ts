import { Router } from 'express';
import { getAdminDashboard } from '@/api/controllers/adminDashboardController';
import { requireRole } from '@/api/middleware/auth';

export const adminDashboardRouter = Router();
// 管理者のみアクセス可能 / 仅管理员可访问
adminDashboardRouter.get('/', requireRole('admin'), getAdminDashboard);
