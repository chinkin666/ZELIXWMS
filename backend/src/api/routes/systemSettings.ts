import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  resetSettings,
} from '@/api/controllers/systemSettingsController';
// CRIT-05: 設定変更は admin のみ / 设置变更仅限 admin
import { requireRole } from '@/api/middleware/auth';

export const systemSettingsRouter = Router();

// GET は認証済みユーザーがアクセス可能 / GET 已认证用户可访问
systemSettingsRouter.get('/', getSettings);
// 書き込み・リセットは admin のみ / 写入・重置仅限 admin
systemSettingsRouter.put('/', requireRole('admin'), updateSettings);
systemSettingsRouter.post('/reset', requireRole('admin'), resetSettings);
