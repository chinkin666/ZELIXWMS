import { Router } from 'express';
import { portalLogin, invitePortalUser } from '@/api/controllers/portalAuthController';
import { getPortalDashboard } from '@/api/controllers/portalDashboardController';
// CRIT-01/02: 認証ミドルウェア追加 / 添加认证中间件
import { requireAuth } from '@/api/middleware/auth';

export const portalAuthRouter = Router();

// 認証（公開）/ 认证（公开）
portalAuthRouter.post('/auth/login', portalLogin);

// 招待（認証必須・管理者のみ）/ 邀请（需要认证・仅管理员）
portalAuthRouter.post('/auth/invite', requireAuth, invitePortalUser);

// ダッシュボード（認証必須）/ 仪表板（需要认证）
portalAuthRouter.get('/dashboard', requireAuth, getPortalDashboard);
