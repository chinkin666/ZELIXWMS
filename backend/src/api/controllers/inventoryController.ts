/**
 * 在庫コントローラー / Inventory Controller
 *
 * HTTP リクエスト/レスポンスの薄いラッパー。
 * Thin wrapper over inventoryService for HTTP req/res handling.
 * ビジネスロジックは inventoryService に委譲する。
 */
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { reserveStockForOrder } from '@/services/stockService';
import * as inventoryService from '@/services/inventoryService';
import { AppError } from '@/lib/errors';

/**
 * エラーレスポンスヘルパー / Error response helper
 * AppError はステータスコードを保持、それ以外は 500
 */
function handleError(res: Response, error: unknown, fallbackMessage: string): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message, code: error.code, details: error.details });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  res.status(500).json({ message: fallbackMessage, error: message });
}

/** 在庫一覧（StockQuant） / List stock */
export const listStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, productSku, locationId, showZero } = req.query;
    const quants = await inventoryService.listStock({
      productId: typeof productId === 'string' ? productId.trim() : undefined,
      productSku: typeof productSku === 'string' ? productSku.trim() : undefined,
      locationId: typeof locationId === 'string' ? locationId.trim() : undefined,
      showZero: showZero === 'true',
    });
    res.json(quants);
  } catch (error) {
    handleError(res, error, '在庫一覧の取得に失敗しました');
  }
};

/** 在庫集計（商品単位） / Inventory summary */
export const listStockSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const summary = await inventoryService.getInventorySummary({
      search: typeof search === 'string' ? search.trim() : undefined,
    });
    res.json(summary);
  } catch (error) {
    handleError(res, error, '在庫集計の取得に失敗しました');
  }
};

/** 商品別在庫詳細 / Product stock detail */
export const getProductStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const quants = await inventoryService.getProductStock(productId);
    res.json(quants);
  } catch (error) {
    handleError(res, error, '商品別在庫の取得に失敗しました');
  }
};

/** 在庫調整（棚卸し） / Stock adjustment */
export const adjustStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, locationId, lotId, adjustQuantity, memo } = req.body;
    const result = await inventoryService.adjustStock({
      productId,
      locationId,
      lotId,
      adjustQuantity,
      memo,
    });
    res.json(result);
  } catch (error) {
    handleError(res, error, '在庫調整に失敗しました');
  }
};

/** 入出庫履歴 / Movement history */
export const listMovements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, moveType, state, page, limit } = req.query;
    const result = await inventoryService.listMovements(
      {
        productId: typeof productId === 'string' ? productId.trim() : undefined,
        moveType: typeof moveType === 'string' ? moveType.trim() : undefined,
        state: typeof state === 'string' ? state.trim() : undefined,
      },
      {
        page: Number(page) || undefined,
        limit: Number(limit) || undefined,
      },
    );
    res.json(result);
  } catch (error) {
    handleError(res, error, '入出庫履歴の取得に失敗しました');
  }
};

/** 安全在庫割れアラート / Low stock alerts */
export const listLowStockAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await inventoryService.listLowStockAlerts();
    res.json(alerts);
  } catch (error) {
    handleError(res, error, '安全在庫アラートの取得に失敗しました');
  }
};

/** 出荷引当（出荷作業画面から手動実行） / Reserve stock for shipment orders */
export const reserveOrdersStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'ids（出荷指示IDの配列）は必須です' });
      return;
    }

    const validIds = ids.filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      res.status(400).json({ message: '有効なIDがありません' });
      return;
    }

    const orders = await ShipmentOrder.find({
      _id: { $in: validIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
    }).lean();

    const results: Array<{
      orderId: string;
      orderNumber: string;
      reservationCount: number;
      errors: string[];
    }> = [];

    for (const order of orders) {
      const products = (order.products || []).map((p: any) => ({
        productId: p.productId,
        productSku: p.productSku,
        productName: p.productName,
        inputSku: p.inputSku,
        quantity: p.quantity,
      }));

      const result = await reserveStockForOrder(String(order._id), order.orderNumber, products);

      results.push({
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        reservationCount: result.reservations.length,
        errors: result.errors,
      });
    }

    const totalReserved = results.reduce((sum, r) => sum + r.reservationCount, 0);
    const allErrors = results.flatMap((r) => r.errors);

    res.json({
      message: `${orders.length}件の出荷指示に対して在庫引当を実行しました（${totalReserved}件引当）`,
      results,
      totalReserved,
      errors: allErrors,
    });
  } catch (error) {
    handleError(res, error, '在庫引当に失敗しました');
  }
};

/** 在庫移動（ロケーション間） / Inter-location transfer */
export const transferStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, fromLocationId, toLocationId, quantity, lotId, memo } = req.body;
    const result = await inventoryService.transferStock({
      productId,
      fromLocationId,
      toLocationId,
      quantity,
      lotId,
      memo,
    });
    res.json(result);
  } catch (error) {
    handleError(res, error, '在庫移動に失敗しました');
  }
};

/** 一括在庫調整 / Bulk stock adjustment */
export const bulkAdjustStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { adjustments } = req.body;
    const result = await inventoryService.bulkAdjustStock(adjustments);
    res.json(result);
  } catch (error) {
    handleError(res, error, '一括調整に失敗しました');
  }
};

/** 0在庫レコードのクリーンアップ / Cleanup zero-stock records */
export const cleanupZeroStock = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { deletedCount } = await inventoryService.cleanupZeroStock();
    res.json({ message: `${deletedCount}件の0在庫レコードを削除しました`, deletedCount });
  } catch (error) {
    handleError(res, error, '0在庫の削除に失敗しました');
  }
};
