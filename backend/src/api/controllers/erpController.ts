/**
 * ERP エクスポートコントローラー / ERP 导出控制器
 *
 * 会計・ERP システム向けのデータエクスポートインターフェース。
 * 面向会计/ERP 系统的数据导出接口。
 */
import type { Request, Response } from 'express';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { StockQuant } from '@/models/stockQuant';
import { AppError } from '@/lib/errors';

/**
 * エラーレスポンスヘルパー / 错误响应辅助函数
 */
function handleError(res: Response, error: unknown, fallbackMessage: string): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message, code: error.code, details: error.details });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  res.status(500).json({ message: fallbackMessage, error: message });
}

/**
 * 日付範囲パラメータのパース / 日期范围参数解析
 */
function parseDateRange(from?: string, to?: string): { fromDate: Date; toDate: Date } | null {
  if (!from || !to) {
    return null;
  }
  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return null;
  }

  // toDate の末尾を当日の終わりに設定 / 将 toDate 设置为当天结束
  toDate.setHours(23, 59, 59, 999);
  return { fromDate, toDate };
}

/**
 * 出荷データエクスポート / 出货数据导出
 *
 * 指定期間の出荷済み注文をフラット形式でエクスポートする。
 * 以扁平格式导出指定期间的已出货订单。
 *
 * GET /api/erp/export/shipments?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export const exportShipments = async (req: Request, res: Response): Promise<void> => {
  try {
    const range = parseDateRange(
      req.query.from as string | undefined,
      req.query.to as string | undefined,
    );

    if (!range) {
      res.status(400).json({
        message: 'from と to パラメータ（YYYY-MM-DD）が必要です / from and to parameters (YYYY-MM-DD) are required',
      });
      return;
    }

    const orders = await ShipmentOrder.find({
      'status.shipped.isShipped': true,
      'status.shipped.shippedAt': { $gte: range.fromDate, $lte: range.toDate },
    })
      .select({
        orderNumber: 1,
        trackingId: 1,
        'recipient.name': 1,
        'recipient.postalCode': 1,
        'recipient.prefecture': 1,
        'recipient.city': 1,
        'recipient.street': 1,
        'status.shipped.shippedAt': 1,
        '_productsMeta.totalQuantity': 1,
        '_productsMeta.totalPrice': 1,
        'costSummary.shippingCost': 1,
        'costSummary.totalCost': 1,
      })
      .lean();

    // フラット形式に変換 / 转换为扁平格式
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      trackingId: o.trackingId ?? '',
      recipientName: o.recipient?.name ?? '',
      recipientPostalCode: o.recipient?.postalCode ?? '',
      recipientPrefecture: o.recipient?.prefecture ?? '',
      recipientCity: o.recipient?.city ?? '',
      recipientStreet: o.recipient?.street ?? '',
      shippedAt: o.status?.shipped?.shippedAt ?? null,
      totalQuantity: o._productsMeta?.totalQuantity ?? 0,
      totalPrice: o._productsMeta?.totalPrice ?? 0,
      shippingCost: o.costSummary?.shippingCost ?? 0,
      totalCost: o.costSummary?.totalCost ?? 0,
    }));

    res.json({
      from: req.query.from,
      to: req.query.to,
      count: rows.length,
      rows,
    });
  } catch (error) {
    handleError(res, error, '出荷データエクスポートに失敗しました / Failed to export shipment data');
  }
};

/**
 * 請求書データエクスポート（スタブ） / 发票数据导出（桩）
 *
 * 指定期間の請求書データをエクスポートする。
 * 导出指定期间的发票数据。
 *
 * GET /api/erp/export/invoices?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export const exportInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const range = parseDateRange(
      req.query.from as string | undefined,
      req.query.to as string | undefined,
    );

    if (!range) {
      res.status(400).json({
        message: 'from と to パラメータ（YYYY-MM-DD）が必要です / from and to parameters (YYYY-MM-DD) are required',
      });
      return;
    }

    // 未実装スタブ / 未实装桩
    res.json({
      from: req.query.from,
      to: req.query.to,
      count: 0,
      rows: [],
      message: '未実装：請求書エクスポートは実装されていません / Not implemented: invoice export not available yet',
    });
  } catch (error) {
    handleError(res, error, '請求書データエクスポートに失敗しました / Failed to export invoice data');
  }
};

/**
 * 在庫データエクスポート（実データ） / 库存数据导出（实际数据）
 *
 * 現在の在庫をフラット形式でエクスポートする。
 * 以扁平格式导出当前库存。
 *
 * GET /api/erp/export/inventory
 */
export const exportInventory = async (_req: Request, res: Response): Promise<void> => {
  try {
    const quants = await StockQuant.aggregate([
      {
        $group: {
          _id: '$productSku',
          available: { $sum: { $subtract: ['$quantity', '$reservedQuantity'] } },
          reserved: { $sum: '$reservedQuantity' },
          total: { $sum: '$quantity' },
          locationCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          sku: '$_id',
          available: 1,
          reserved: 1,
          total: 1,
          locationCount: 1,
        },
      },
    ]);

    res.json({
      exportedAt: new Date().toISOString(),
      count: quants.length,
      rows: quants,
    });
  } catch (error) {
    handleError(res, error, '在庫データエクスポートに失敗しました / Failed to export inventory data');
  }
};
