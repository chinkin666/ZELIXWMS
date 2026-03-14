/**
 * 佐川急便 Controller / 佐川急便コントローラー
 *
 * CSV 导出与追跡番号取込。
 * CSV 出力と追跡番号取込。
 */

import type { Request, Response } from 'express';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { SagawaService, parseSagawaTrackingCsv } from '@/services/sagawaService';
import { logger } from '@/lib/logger';

/**
 * 导出佐川 CSV / 佐川 CSV エクスポート
 * POST /api/carriers/sagawa/export
 */
export async function exportSagawaCsv(req: Request, res: Response) {
  try {
    const { orderIds, config } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      res.status(400).json({ error: '注文IDが必要です' });
      return;
    }

    const orders = await ShipmentOrder.find({ _id: { $in: orderIds } }).lean();
    if (orders.length === 0) {
      res.status(404).json({ error: '注文が見つかりません' });
      return;
    }

    const service = new SagawaService(config || {});
    const rows = service.generateCsvRows(orders);
    const csv = service.generateCsvString(rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sagawa_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    logger.error({ err }, 'Sagawa CSV export error / 佐川CSVエクスポートエラー');
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * 导入追跡番号 / 追跡番号インポート
 * POST /api/carriers/sagawa/import-tracking
 */
export async function importSagawaTracking(req: Request, res: Response) {
  try {
    const { csvContent } = req.body;

    if (!csvContent) {
      res.status(400).json({ error: 'CSVデータが必要です' });
      return;
    }

    const trackingMap = parseSagawaTrackingCsv(csvContent);

    if (trackingMap.size === 0) {
      res.status(400).json({ error: '追跡番号が見つかりません' });
      return;
    }

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

    res.json({
      total: trackingMap.size,
      updated,
      skipped: trackingMap.size - updated,
    });
  } catch (err) {
    logger.error({ err }, 'Sagawa tracking import error / 佐川追跡番号インポートエラー');
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * 获取佐川送り状種類 / 佐川送り状種類取得
 * GET /api/carriers/sagawa/invoice-types
 */
export async function getSagawaInvoiceTypes(_req: Request, res: Response) {
  res.json(SagawaService.getInvoiceTypes());
}
