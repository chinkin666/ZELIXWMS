/**
 * 荷主ポータルルート / 货主门户路由
 *
 * 荷主（client）ロールのユーザー向けAPI。
 * 认证必須 + client ロール限定。
 *
 * 面向荷主（client）角色用户的API。
 * 需要认证 + 限定 client 角色。
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '@/api/middleware/auth';
import { getClientDashboard, getClientStock, searchTracking } from '@/api/controllers/clientPortalController';

export const clientPortalRouter = Router();

// 全エンドポイントに認証必須 + client ロール（admin も許可）
// 所有端点需要认证 + client 角色（也允许 admin）
clientPortalRouter.use(requireAuth);
clientPortalRouter.use(requireRole('client', 'admin', 'manager'));

// ダッシュボード / 仪表板
clientPortalRouter.get('/dashboard', getClientDashboard);

// 在庫照会 / 库存查询
clientPortalRouter.get('/stock', getClientStock);

// 追跡番号検索 / 追踪号查询
clientPortalRouter.get('/tracking', searchTracking);
