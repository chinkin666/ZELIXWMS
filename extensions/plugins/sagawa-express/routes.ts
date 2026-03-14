/**
 * 佐川急便插件路由 / 佐川急便プラグインルート
 *
 * 挂载到 /api/plugins/sagawa-express/*
 * /api/plugins/sagawa-express/* にマウント
 */

import { Router, type Request, type Response } from 'express';
import { SAGAWA_INVOICE_TYPES } from './data/invoiceTypes';
import { generateCsvRows, generateCsvString, type SagawaExportConfig } from './services/sagawaCsvService';
import { parseSagawaTrackingCsv } from './services/sagawaTrackingService';

/**
 * 创建路由 / ルーターを作成
 * @param getConfig 获取插件配置的函数 / プラグイン設定取得関数
 * @param pluginLogger 插件 logger / プラグインロガー
 */
export function createRouter(getConfig: (tenantId: string) => Promise<Record<string, any>>, pluginLogger: any) {
  const router = Router();

  // 需要延迟加载 ShipmentOrder 模型（避免循环依赖）
  // ShipmentOrder モデルは遅延ロードが必要（循環依存回避）
  let ShipmentOrder: any = null;
  function getShipmentOrderModel() {
    if (!ShipmentOrder) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ShipmentOrder = require('../../../backend/src/models/shipmentOrder').ShipmentOrder;
    }
    return ShipmentOrder;
  }

  /**
   * GET /status — 插件状态 / プラグインステータス
   */
  router.get('/status', (_req: Request, res: Response) => {
    res.json({ plugin: 'sagawa-express', version: '1.0.0', status: 'running' });
  });

  /**
   * GET /invoice-types — 送り状种类 / 送り状種類一覧
   */
  router.get('/invoice-types', (_req: Request, res: Response) => {
    res.json(SAGAWA_INVOICE_TYPES);
  });

  /**
   * GET /config — 当前配置 / 現在の設定
   */
  router.get('/config', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
      const config = await getConfig(tenantId);
      res.json({
        billingCode: config.billingCode || '',
        defaultInvoiceType: config.defaultInvoiceType || '0',
        defaultSize: config.defaultSize || '80',
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * POST /export — CSV 导出 / CSV エクスポート
   */
  router.post('/export', async (req: Request, res: Response) => {
    try {
      const { orderIds, config: reqConfig } = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        res.status(400).json({ error: '注文IDが必要です / 需要订单ID' });
        return;
      }

      // 合并配置：请求参数 > 插件配置 > 默认值
      // 設定マージ：リクエスト > プラグイン設定 > デフォルト
      const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
      const pluginConfig = await getConfig(tenantId);
      const mergedConfig: SagawaExportConfig = {
        billingCode: reqConfig?.billingCode || pluginConfig.billingCode || '',
        defaultInvoiceType: reqConfig?.defaultInvoiceType || pluginConfig.defaultInvoiceType || '0',
        defaultSize: reqConfig?.defaultSize || pluginConfig.defaultSize || '80',
      };

      const Model = getShipmentOrderModel();
      const orders = await Model.find({ _id: { $in: orderIds } }).lean();

      if (orders.length === 0) {
        res.status(404).json({ error: '注文が見つかりません / 未找到订单' });
        return;
      }

      const rows = generateCsvRows(orders, mergedConfig);
      const csv = generateCsvString(rows);

      pluginLogger.info({ count: orders.length }, 'Sagawa CSV exported / 佐川CSVエクスポート完了');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="sagawa_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      pluginLogger.error({ err }, 'Sagawa CSV export error / 佐川CSVエクスポートエラー');
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * POST /import-tracking — 追踪号导入 / 追跡番号インポート
   */
  router.post('/import-tracking', async (req: Request, res: Response) => {
    try {
      const { csvContent } = req.body;

      if (!csvContent) {
        res.status(400).json({ error: 'CSVデータが必要です / 需要CSV数据' });
        return;
      }

      const trackingMap = parseSagawaTrackingCsv(csvContent);

      if (trackingMap.size === 0) {
        res.status(400).json({ error: '追跡番号が見つかりません / 未找到追踪号' });
        return;
      }

      const Model = getShipmentOrderModel();
      let updated = 0;

      for (const [orderNumber, trackingNumber] of trackingMap) {
        const result = await Model.updateOne(
          { orderNumber },
          {
            $set: {
              trackingId: trackingNumber,
              'status.shipped.isShipped': true,
              'status.shipped.shippedAt': new Date(),
            },
          },
        );
        if (result.modifiedCount > 0) updated++;
      }

      pluginLogger.info({ total: trackingMap.size, updated }, 'Sagawa tracking imported / 佐川追跡番号インポート完了');

      res.json({
        total: trackingMap.size,
        updated,
        skipped: trackingMap.size - updated,
      });
    } catch (err) {
      pluginLogger.error({ err }, 'Sagawa tracking import error / 佐川追跡番号インポートエラー');
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
