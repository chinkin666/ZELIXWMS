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
  getQueueStats,
  cleanQueue,
} from '@/api/controllers/queueController';
import {
  listPlugins,
  getPlugin,
  enablePlugin,
  disablePlugin,
  getPluginConfig,
  updatePluginConfig,
  pluginHealthCheck,
  pluginsHealthDashboard,
  getSdkInfo,
} from '@/api/controllers/pluginController';
import {
  listScripts,
  getScript,
  createScript,
  updateScript,
  deleteScript,
  toggleScript,
  validateScript,
  testScript,
  getScriptLogs,
} from '@/api/controllers/scriptController';
import {
  listDefinitions,
  getActiveDefinitions,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  validateValues,
} from '@/api/controllers/customFieldController';
import { requireFeatureFlag } from '@/api/middleware/featureFlagGuard';
import {
  listFlags,
  getFlagStatus,
  createFlag,
  updateFlag,
  deleteFlag,
  toggleFlag,
  setTenantOverride,
  removeTenantOverride,
} from '@/api/controllers/featureFlagController';

export const extensionRouter = Router();

// Hook 查看 / Hook 確認
extensionRouter.get('/hooks', listHooks);
extensionRouter.get('/hooks/summary', hooksSummary);

// 事件日志 / イベントログ
extensionRouter.get('/logs', listEventLogs);
extensionRouter.get('/logs/stats', eventLogStats);

// Webhook 管理 / Webhook 管理（功能开关: extensions.webhooks）
const webhookGuard = requireFeatureFlag('extensions.webhooks');
extensionRouter.get('/webhooks', webhookGuard, listWebhooks);
extensionRouter.post('/webhooks', webhookGuard, createWebhook);
extensionRouter.get('/webhooks/:id', webhookGuard, getWebhook);
extensionRouter.put('/webhooks/:id', webhookGuard, updateWebhook);
extensionRouter.delete('/webhooks/:id', webhookGuard, deleteWebhook);
extensionRouter.post('/webhooks/:id/test', webhookGuard, testWebhook);
extensionRouter.post('/webhooks/:id/toggle', webhookGuard, toggleWebhook);
extensionRouter.get('/webhooks/:id/logs', webhookGuard, getWebhookLogs);

// 插件管理 / プラグイン管理（功能开关: extensions.plugins）
const pluginGuard = requireFeatureFlag('extensions.plugins');
extensionRouter.get('/plugins', pluginGuard, listPlugins);
extensionRouter.get('/plugins/:name', pluginGuard, getPlugin);
extensionRouter.post('/plugins/:name/enable', pluginGuard, enablePlugin);
extensionRouter.post('/plugins/:name/disable', pluginGuard, disablePlugin);
extensionRouter.get('/plugins/:name/config', pluginGuard, getPluginConfig);
extensionRouter.put('/plugins/:name/config', pluginGuard, updatePluginConfig);
extensionRouter.get('/plugins/:name/health', pluginGuard, pluginHealthCheck);

// 插件健康仪表板 + SDK 信息 / プラグインヘルスダッシュボード + SDK 情報
extensionRouter.get('/plugins-health', pluginGuard, pluginsHealthDashboard);
extensionRouter.get('/sdk-info', getSdkInfo);

// 脚本管理 / スクリプト管理（功能开关: extensions.scripts）
const scriptGuard = requireFeatureFlag('extensions.scripts');
extensionRouter.get('/scripts', scriptGuard, listScripts);
extensionRouter.post('/scripts', scriptGuard, createScript);
extensionRouter.get('/scripts/:id', scriptGuard, getScript);
extensionRouter.put('/scripts/:id', scriptGuard, updateScript);
extensionRouter.delete('/scripts/:id', scriptGuard, deleteScript);
extensionRouter.post('/scripts/:id/toggle', scriptGuard, toggleScript);
extensionRouter.post('/scripts/:id/validate', scriptGuard, validateScript);
extensionRouter.post('/scripts/:id/test', scriptGuard, testScript);
extensionRouter.get('/scripts/:id/logs', scriptGuard, getScriptLogs);

// 自定义字段管理 / カスタムフィールド管理
extensionRouter.get('/custom-fields', listDefinitions);
extensionRouter.post('/custom-fields', createDefinition);
extensionRouter.get('/custom-fields/:entityType/active', getActiveDefinitions);
extensionRouter.post('/custom-fields/:entityType/validate', validateValues);
extensionRouter.put('/custom-fields/:id', updateDefinition);
extensionRouter.delete('/custom-fields/:id', deleteDefinition);

// 功能开关管理 / フィーチャーフラグ管理
extensionRouter.get('/feature-flags', listFlags);
extensionRouter.get('/feature-flags/status', getFlagStatus);
extensionRouter.post('/feature-flags', createFlag);
extensionRouter.put('/feature-flags/:id', updateFlag);
extensionRouter.delete('/feature-flags/:id', deleteFlag);
extensionRouter.post('/feature-flags/:id/toggle', toggleFlag);
extensionRouter.post('/feature-flags/:id/tenant-override', setTenantOverride);
extensionRouter.delete('/feature-flags/:id/tenant-override/:tenantId', removeTenantOverride);

// 队列监控 / キュー監視
extensionRouter.get('/queues/stats', getQueueStats);
extensionRouter.post('/queues/:name/clean', cleanQueue);
