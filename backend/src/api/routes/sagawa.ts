/**
 * @deprecated 佐川急便旧路由（互换桥接）/ 佐川急便旧ルート（互換ブリッジ）
 *
 * 已迁移到插件: /api/plugins/sagawa-express/*
 * プラグインに移行済み: /api/plugins/sagawa-express/*
 *
 * 此路由保留用于向后兼容，将在未来版本中删除。
 * このルートは後方互換のために残しており、将来のバージョンで削除予定。
 */

import { Router } from 'express';
import {
  exportSagawaCsv,
  importSagawaTracking,
  getSagawaInvoiceTypes,
} from '@/api/controllers/sagawaController';
import { logger } from '@/lib/logger';

export const sagawaRouter = Router();

// 添加 deprecation 警告中间件 / デプリケーション警告ミドルウェア
sagawaRouter.use((_req, res, next) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Link', '</api/plugins/sagawa-express>; rel="successor-version"');
  logger.warn('Deprecated sagawa route used, migrate to /api/plugins/sagawa-express / 非推奨の佐川ルートが使用されました');
  next();
});

sagawaRouter.get('/invoice-types', getSagawaInvoiceTypes);
sagawaRouter.post('/export', exportSagawaCsv);
sagawaRouter.post('/import-tracking', importSagawaTracking);
