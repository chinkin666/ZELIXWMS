/**
 * 日本郵便ゆうパック插件路由 / 日本邮政Yu-Pack插件路由
 *
 * 挂载到 /api/plugins/japanpost-yupack/*
 * /api/plugins/japanpost-yupack/* にマウント
 */

import { Router, type Request, type Response } from 'express';
import type { ModelProxy, PluginLogger } from '@zelix/plugin-sdk';
import { YUPACK_DELIVERY_TYPES, YUPACK_TIME_ZONES, YUPACK_SIZES } from './data/deliveryTypes';
import { generateCsvRows, generateCsvString, type YupackExportConfig } from './services/yupackCsvService';
import { parseYupackTrackingCsv } from './services/yupackTrackingService';

/**
 * 创建路由 / ルーターを作成
 */
export function createRouter(
  getConfig: (tenantId: string) => Promise<Record<string, unknown>>,
  pluginLogger: PluginLogger,
  models: ModelProxy,
) {
  const router = Router();

  /**
   * GET /status — 插件状态 / プラグインステータス
   */
  router.get('/status', (_req: Request, res: Response) => {
    res.json({ plugin: 'japanpost-yupack', version: '1.0.0', status: 'running' });
  });

  /**
   * GET /delivery-types — 配送種別一覧 / 配送类型列表
   */
  router.get('/delivery-types', (_req: Request, res: Response) => {
    res.json(YUPACK_DELIVERY_TYPES);
  });

  /**
   * GET /time-zones — 配達時間帯一覧 / 配送时间段列表
   */
  router.get('/time-zones', (_req: Request, res: Response) => {
    res.json(YUPACK_TIME_ZONES);
  });

  /**
   * GET /sizes — サイズ区分一覧 / 尺寸分类列表
   */
  router.get('/sizes', (_req: Request, res: Response) => {
    res.json(YUPACK_SIZES);
  });

  /**
   * GET /config — 当前配置 / 現在の設定
   */
  router.get('/config', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
      const config = await getConfig(tenantId);
      res.json({
        customerCode: config.customerCode || '',
        defaultSize: config.defaultSize || '80',
        defaultDeliveryType: config.defaultDeliveryType || '0',
        senderName: config.senderName || '',
        senderPostalCode: config.senderPostalCode || '',
        senderAddress: config.senderAddress || '',
        senderPhone: config.senderPhone || '',
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * POST /export — ゆうプリR CSV 导出 / ゆうプリR CSV エクスポート
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
      const mergedConfig: YupackExportConfig = {
        customerCode: (reqConfig?.customerCode || pluginConfig.customerCode || '') as string,
        defaultSize: (reqConfig?.defaultSize || pluginConfig.defaultSize || '80') as string,
        defaultDeliveryType: (reqConfig?.defaultDeliveryType || pluginConfig.defaultDeliveryType || '0') as string,
        senderName: (reqConfig?.senderName || pluginConfig.senderName || '') as string,
        senderPostalCode: (reqConfig?.senderPostalCode || pluginConfig.senderPostalCode || '') as string,
        senderAddress: (reqConfig?.senderAddress || pluginConfig.senderAddress || '') as string,
        senderPhone: (reqConfig?.senderPhone || pluginConfig.senderPhone || '') as string,
      };

      // 通过 ModelProxy 获取模型 / ModelProxy 経由でモデルを取得
      const ShipmentOrder = models.getModel('ShipmentOrder') as any;
      const orders = await ShipmentOrder.find({ _id: { $in: orderIds } }).lean();

      if (orders.length === 0) {
        res.status(404).json({ error: '注文が見つかりません / 未找到订单' });
        return;
      }

      const rows = generateCsvRows(orders, mergedConfig);
      const csv = generateCsvString(rows);

      pluginLogger.info(
        { count: orders.length },
        'Yu-Pack CSV exported / ゆうパックCSVエクスポート完了',
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="yupack_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      pluginLogger.error({ err }, 'Yu-Pack CSV export error / ゆうパックCSVエクスポートエラー');
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * POST /import-tracking — 追跡番号インポート / 追踪号导入
   */
  router.post('/import-tracking', async (req: Request, res: Response) => {
    try {
      const { csvContent } = req.body;

      if (!csvContent) {
        res.status(400).json({ error: 'CSVデータが必要です / 需要CSV数据' });
        return;
      }

      const trackingMap = parseYupackTrackingCsv(csvContent);

      if (trackingMap.size === 0) {
        res.status(400).json({ error: '追跡番号が見つかりません / 未找到追踪号' });
        return;
      }

      // 通过 ModelProxy 获取模型 / ModelProxy 経由でモデルを取得
      const ShipmentOrder = models.getModel('ShipmentOrder') as any;
      let updated = 0;

      for (const [orderNumber, trackingNumber] of trackingMap) {
        const result = await ShipmentOrder.updateOne(
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

      pluginLogger.info(
        { total: trackingMap.size, updated },
        'Yu-Pack tracking imported / ゆうパック追跡番号インポート完了',
      );

      res.json({
        total: trackingMap.size,
        updated,
        skipped: trackingMap.size - updated,
      });
    } catch (err) {
      pluginLogger.error({ err }, 'Yu-Pack tracking import error / ゆうパック追跡番号インポートエラー');
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
