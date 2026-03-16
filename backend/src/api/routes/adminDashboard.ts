import { Router } from 'express';
import { getAdminDashboard } from '@/api/controllers/adminDashboardController';

export const adminDashboardRouter = Router();
adminDashboardRouter.get('/', getAdminDashboard);
