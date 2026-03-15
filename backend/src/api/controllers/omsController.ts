/**
 * OMS 连接控制器 / OMS 連携コントローラー
 *
 * 外部 OMS/EC システムとの注文取込・在庫同期インターフェース。
 * 外部 OMS/EC システムからの注文インポートと在庫同期のインターフェース。
 */
import type { Request, Response } from 'express';
import { StockQuant } from '@/models/stockQuant';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

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
 * 注文取込（スタブ） / 订单导入（桩）
 *
 * 外部システムから注文データを受け取り、ShipmentOrder を作成する。
 * 现阶段仅验证并返回未实装提示。
 *
 * POST /api/oms/orders
 */
export const importOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orders } = req.body;

    // 入力バリデーション / 输入验证
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      res.status(400).json({
        accepted: false,
        message: '注文データが必要です / Orders array is required',
      });
      return;
    }

    // 各注文の必須フィールドチェック / 各订单的必填字段检查
    const errors: Array<{ index: number; message: string }> = [];
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (!order.externalOrderId) {
        errors.push({ index: i, message: 'externalOrderId は必須です / externalOrderId is required' });
      }
      if (!order.sku) {
        errors.push({ index: i, message: 'sku は必須です / sku is required' });
      }
      if (typeof order.quantity !== 'number' || order.quantity <= 0) {
        errors.push({ index: i, message: 'quantity は正の数値が必要です / quantity must be a positive number' });
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        accepted: false,
        message: 'バリデーションエラー / Validation errors',
        errors,
      });
      return;
    }

    logger.info({ orderCount: orders.length }, 'OMS 注文取込リクエスト受信 / OMS order import request received');

    // 未実装スタブ / 未实装桩
    res.status(202).json({
      accepted: true,
      message: '未実装：注文は受理されましたが処理されていません / Not implemented: orders accepted but not processed yet',
      receivedCount: orders.length,
    });
  } catch (error) {
    handleError(res, error, '注文取込に失敗しました / Failed to import orders');
  }
};

/**
 * 在庫一覧照会（実データ） / 库存查询（实际数据）
 *
 * StockQuant を SKU 単位で集計し、外部システム向けに返す。
 * 按 SKU 汇总 StockQuant，返回给外部系统。
 *
 * GET /api/oms/stock
 */
export const getStock = async (_req: Request, res: Response): Promise<void> => {
  try {
    const aggregated = await StockQuant.aggregate([
      {
        $group: {
          _id: '$productSku',
          available: { $sum: { $subtract: ['$quantity', '$reservedQuantity'] } },
          reserved: { $sum: '$reservedQuantity' },
          total: { $sum: '$quantity' },
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
        },
      },
    ]);

    res.json({ items: aggregated });
  } catch (error) {
    handleError(res, error, '在庫照会に失敗しました / Failed to query stock');
  }
};

/**
 * SKU 単位在庫照会（実データ） / SKU级库存查询（实际数据）
 *
 * 指定 SKU の在庫を集計して返す。
 * 汇总指定 SKU 的库存并返回。
 *
 * GET /api/oms/stock/:sku
 */
export const getStockBySku = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sku } = req.params;

    if (!sku || typeof sku !== 'string') {
      res.status(400).json({ message: 'SKU パラメータが必要です / SKU parameter is required' });
      return;
    }

    const aggregated = await StockQuant.aggregate([
      { $match: { productSku: sku } },
      {
        $group: {
          _id: '$productSku',
          available: { $sum: { $subtract: ['$quantity', '$reservedQuantity'] } },
          reserved: { $sum: '$reservedQuantity' },
          total: { $sum: '$quantity' },
        },
      },
      {
        $project: {
          _id: 0,
          sku: '$_id',
          available: 1,
          reserved: 1,
          total: 1,
        },
      },
    ]);

    if (aggregated.length === 0) {
      res.json({ sku, available: 0, reserved: 0, total: 0 });
      return;
    }

    res.json(aggregated[0]);
  } catch (error) {
    handleError(res, error, 'SKU 在庫照会に失敗しました / Failed to query stock by SKU');
  }
};

/**
 * 出荷完了通知（スタブ） / 出货完成通知（桩）
 *
 * 外部システムからの出荷完了 Webhook を受信する。
 * 接收来自外部系统的出货完成 Webhook。
 *
 * POST /api/oms/shipment-notify
 */
export const shipmentNotify = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info({ body: req.body }, '出荷完了通知受信 / Shipment notification received');

    // 未実装スタブ / 未实装桩
    res.json({
      received: true,
      message: '未実装：通知は受信されましたが処理されていません / Not implemented: notification received but not processed yet',
    });
  } catch (error) {
    handleError(res, error, '出荷通知の処理に失敗しました / Failed to process shipment notification');
  }
};
