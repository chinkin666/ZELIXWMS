/**
 * 通知路由 / 通知ルート
 */

import { Router } from 'express';
import {
  listNotifications,
  unreadCount,
  markRead,
  markReadAll,
  getPreferences,
  updatePreferences,
} from '@/api/controllers/notificationController';

export const notificationRouter = Router();

// 站内通知 / サイト内通知
notificationRouter.get('/', listNotifications);
notificationRouter.get('/unread-count', unreadCount);
notificationRouter.post('/:id/read', markRead);
notificationRouter.post('/read-all', markReadAll);

// 通知偏好 / 通知設定
notificationRouter.get('/preferences', getPreferences);
notificationRouter.put('/preferences', updatePreferences);
