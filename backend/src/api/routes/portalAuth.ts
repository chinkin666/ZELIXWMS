import { Router } from 'express';
import { portalLogin, invitePortalUser } from '@/api/controllers/portalAuthController';
import { getPortalDashboard } from '@/api/controllers/portalDashboardController';

export const portalAuthRouter = Router();

// 認証（公開）/ 认证（公开）
portalAuthRouter.post('/auth/login', portalLogin);

// 招待（管理者のみ）/ 邀请（仅管理员）
portalAuthRouter.post('/auth/invite', invitePortalUser);

// ダッシュボード / 仪表板
portalAuthRouter.get('/dashboard', getPortalDashboard);
