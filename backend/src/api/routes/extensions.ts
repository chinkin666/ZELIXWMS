/**
 * 扩展系统路由 / 拡張システムルート
 *
 * Phase 1: hooks 查看 + 事件日志
 * Phase 2+: webhooks, plugins, scripts, custom-fields, feature-flags
 */

import { Router } from 'express';
import {
  listHooks,
  hooksSummary,
  listEventLogs,
  eventLogStats,
} from '@/api/controllers/extensionController';
import {
  listWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  toggleWebhook,
  getWebhookLogs,
} from '@/api/controllers/webhookController';
import {
  listPlugins,
  getPlugin,
  enablePlugin,
  disablePlugin,
  getPluginConfig,
  updatePluginConfig,
} from '@/api/controllers/pluginController';

export const extensionRouter = Router();

// Hook 查看 / Hook 確認
extensionRouter.get('/hooks', listHooks);
extensionRouter.get('/hooks/summary', hooksSummary);

// 事件日志 / イベントログ
extensionRouter.get('/logs', listEventLogs);
extensionRouter.get('/logs/stats', eventLogStats);

// Webhook 管理 / Webhook 管理
extensionRouter.get('/webhooks', listWebhooks);
extensionRouter.post('/webhooks', createWebhook);
extensionRouter.get('/webhooks/:id', getWebhook);
extensionRouter.put('/webhooks/:id', updateWebhook);
extensionRouter.delete('/webhooks/:id', deleteWebhook);
extensionRouter.post('/webhooks/:id/test', testWebhook);
extensionRouter.post('/webhooks/:id/toggle', toggleWebhook);
extensionRouter.get('/webhooks/:id/logs', getWebhookLogs);

// 插件管理 / プラグイン管理
extensionRouter.get('/plugins', listPlugins);
extensionRouter.get('/plugins/:name', getPlugin);
extensionRouter.post('/plugins/:name/enable', enablePlugin);
extensionRouter.post('/plugins/:name/disable', disablePlugin);
extensionRouter.get('/plugins/:name/config', getPluginConfig);
extensionRouter.put('/plugins/:name/config', updatePluginConfig);

// Phase 4: extensionRouter.use('/scripts', scriptController)
// Phase 5: extensionRouter.use('/custom-fields', customFieldController)
// Phase 5: extensionRouter.use('/feature-flags', featureFlagController)
