import type { Request, Response } from 'express';
import { z } from 'zod';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { Carrier } from '@/models/carrier';
import mongoose from 'mongoose';
import { processOrderEventBulk } from '@/services/autoProcessingEngine';
import { isBuiltInCarrierId, getBuiltInCarrier } from '@/data/builtInCarriers';
import { AppError, ValidationError } from '@/lib/errors';
import {
  createOrders as createOrdersService,
  updateOrder as updateOrderService,
  deleteOrder as deleteOrderService,
  deleteOrders as deleteOrdersService,
  updateOrderStatus as updateOrderStatusService,
  updateOrderStatusBulk as updateOrderStatusBulkService,
  bulkUpdateOrders as bulkUpdateOrdersService,
  searchOrders,
  getOrderById,
  getOrdersByIds as getOrdersByIdsService,
  filterPayloadSchema,
  type StatusAction,
  type StatusType,
} from '@/services/shipmentOrderService';

// ============================================================
// 错误处理辅助 / エラーハンドリングヘルパー
// ============================================================

/**
 * 统一的错误响应处理 / 統一エラーレスポンスハンドリング
 * AppError 子类自带 statusCode 和 code，其他错误默认 500
 */
const handleError = (res: Response, error: unknown, fallbackMessage: string): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      ...(error.details ? (error.code === 'VALIDATION_ERROR' ? { errors: error.details } : { details: error.details }) : {}),
    });
    return;
  }
  const err = error as any;
  res.status(500).json({
    message: fallbackMessage,
    error: err?.message,
  });
};

// ============================================================
// 控制器（瘦包装器）/ コントローラー（薄いラッパー）
// ============================================================

/**
 * 批量创建订单 / 注文一括作成
 * Route: POST /api/shipment-orders/create/bulk
 */
export const createManualOrdersBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await createOrdersService(req.body);

    // 保持原有的响应格式 / 元のレスポンスフォーマットを維持
    const status = result.failureCount > 0 ? (result.successCount > 0 ? 207 : 500) : 201;
    res.status(status).json({
      message: result.failureCount > 0
        ? `登録: 成功${result.successCount}件 / 失敗${result.failureCount}件`
        : '注文が正常に作成されました',
      data: result,
    });
  } catch (error: unknown) {
    handleError(res, error, 'サーバーエラーが発生しました');
  }
};

/**
 * 搜索/列表查询 / 検索・リスト表示
 * Route: GET /api/shipment-orders
 */
export const listOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const limitRaw = req.query?.limit ?? req.query?.pageSize;
    const pageRaw = req.query?.page;
    const sortByRaw = req.query?.sortBy;
    const sortOrderRaw = req.query?.sortOrder;

    const hasPageParam = pageRaw !== undefined && pageRaw !== null && pageRaw !== '';
    const page = hasPageParam ? (typeof pageRaw === 'string' ? Math.max(Number(pageRaw) || 1, 1) : 1) : 1;
    const parsedLimit = typeof limitRaw === 'string'
      ? Math.min(Math.max(Number(limitRaw) || 10, 1), 5000)
      : typeof limitRaw === 'number'
        ? Math.min(Math.max(limitRaw || 10, 1), 5000)
        : undefined;
    const limit = hasPageParam ? (parsedLimit ?? 10) : parsedLimit;

    const qRaw = req.query?.q;
    let filters: Record<string, { operator: any; value: any }> = {};
    if (typeof qRaw === 'string' && qRaw.trim()) {
      let parsed;
      try {
        parsed = JSON.parse(qRaw);
      } catch {
        res.status(400).json({ message: 'Invalid filter JSON' });
        return;
      }
      const validated = filterPayloadSchema.safeParse(parsed);
      if (validated.success) {
        filters = validated.data as any;
      }
    }

    const result = await searchOrders({
      filters,
      page,
      limit,
      sortBy: typeof sortByRaw === 'string' ? sortByRaw : undefined,
      sortOrder: sortOrderRaw === 'asc' ? 'asc' : sortOrderRaw === 'desc' ? 'desc' : undefined,
      paginated: hasPageParam,
    });

    if (result.mode === 'list') {
      res.json(result.items);
    } else {
      res.json({ items: result.items, total: result.total, page: result.page, limit: result.limit });
    }
  } catch (error: unknown) {
    handleError(res, error, 'Failed to fetch orders');
  }
};

/**
 * 获取单个订单 / 単一注文取得
 * Route: GET /api/shipment-orders/:id
 */
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await getOrderById(req.params?.id);
    res.json(item);
  } catch (error: unknown) {
    handleError(res, error, 'Failed to fetch order');
  }
};

/**
 * 更新单个订单 / 単一注文更新
 * Route: PUT /api/shipment-orders/:id
 */
export const updateOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await updateOrderService(req.params?.id, req.body);
    res.json({
      message: '注文が正常に更新されました',
      data: result,
    });
  } catch (error: unknown) {
    handleError(res, error, 'サーバーエラーが発生しました');
  }
};

/**
 * 删除单个订单 / 単一注文削除
 * Route: DELETE /api/shipment-orders/:id
 */
export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await deleteOrderService(req.params?.id);
    res.json({
      message: '注文が正常に削除されました',
      data: result,
    });
  } catch (error: unknown) {
    handleError(res, error, 'サーバーエラーが発生しました');
  }
};

/**
 * 统一的状态操作处理函数（单个订单）/ 統一ステータスアクション（単一注文）
 * Route: POST /api/shipment-orders/:id/status
 */
export const handleStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, statusType } = req.body;
    const updated = await updateOrderStatusService(req.params?.id, {
      action: action as StatusAction,
      statusType: statusType as StatusType,
    });
    res.json(updated);
  } catch (error: unknown) {
    handleError(res, error, 'Failed to update order status');
  }
};

/**
 * 统一的状态操作处理函数（批量）/ 統一ステータスアクション（一括）
 * Route: POST /api/shipment-orders/status/bulk
 */
export const handleStatusBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, action, statusType } = req.body;
    const result = await updateOrderStatusBulkService(ids, {
      action: action as StatusAction,
      statusType: statusType as StatusType,
    });
    res.json({
      message: 'Bulk status operation completed',
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      console.error('Error in handleStatusBulk:', error);
    }
    handleError(res, error, 'Failed to update order status');
  }
};

/**
 * 通用的批量更新接口 / 汎用一括更新インターフェース
 * Route: POST /api/shipment-orders/update/bulk
 */
export const bulkUpdateOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, updates } = req.body;
    const result = await bulkUpdateOrdersService(ids, updates);
    res.json({
      message: 'Bulk update completed',
      ...result,
    });
  } catch (error: unknown) {
    handleError(res, error, 'Failed to bulk update orders');
  }
};

/**
 * 根据ID批量获取订单 / IDによる注文一括取得
 * Route: POST /api/shipment-orders/by-ids
 */
export const getOrdersByIds = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, includeRawData } = req.body;
    const result = await getOrdersByIdsService(ids, includeRawData);
    res.json(result);
  } catch (error: unknown) {
    handleError(res, error, 'Failed to fetch orders');
  }
};

/**
 * 批量删除订单 / 注文一括削除
 * Route: POST /api/shipment-orders/delete/bulk
 */
export const deleteOrdersBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    const result = await deleteOrdersService(ids);
    res.json({
      message: '注文が正常に削除されました',
      ...result,
    });
  } catch (error: unknown) {
    handleError(res, error, 'Failed to delete orders');
  }
};

// ============================================================
// Carrier receipt import（エッジケース: コントローラーに残す）
// 送り状取り込みは複雑なため、一旦コントローラーに残す
// ============================================================

const importCarrierReceiptSchema = z.object({
  orderMatchField: z.enum(['orderNumber', 'customerManagementNumber', 'recipient.phone', 'recipient.postalCode']),
  items: z
    .array(
      z.object({
        matchValue: z.any(),
        carrierRawRow: z.record(z.any()),
      }),
    )
    .min(1),
});

export const importCarrierReceiptRows = async (req: Request, res: Response): Promise<void> => {
  const parsed = importCarrierReceiptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    return;
  }

  try {
    const { orderMatchField, items } = parsed.data;
    const now = new Date();

    const normalizeKey = (v: any): string => {
      if (v === undefined || v === null) return '';
      const s = typeof v === 'string' ? v : String(v);
      return s.trim();
    };

    // 1 match key -> 1 raw row (if duplicated in file, treat as invalid to avoid overwrite)
    const grouped = new Map<string, Record<string, unknown>>();
    const duplicatedInFile: string[] = [];
    let skippedEmpty = 0;
    for (const it of items) {
      const key = normalizeKey(it.matchValue);
      if (!key) {
        skippedEmpty += 1;
        continue;
      }
      if (grouped.has(key)) {
        duplicatedInFile.push(key);
        continue;
      }
      grouped.set(key, it.carrierRawRow as any);
    }

    const keys = Array.from(grouped.keys()).filter((k) => !duplicatedInFile.includes(k));
    if (keys.length === 0) {
      res.json({
        message: 'No valid rows to import',
        data: { totalRows: items.length, skippedEmpty, matchedOrders: 0, updatedOrders: 0, unmatched: [], ambiguous: duplicatedInFile },
      });
      return;
    }

    const docs = await ShipmentOrder.find({ [orderMatchField]: { $in: keys } })
      .select(['_id', orderMatchField, 'carrierId', 'trackingId', 'carrierRawRow'])
      .lean();

    const docMap = new Map<string, any>();
    const rawIdMap = new Map<string, any>();
    const carrierIdsSet = new Set<string>();
    for (const d of docs) {
      const id = String((d as any)?._id);
      docMap.set(id, d);
      rawIdMap.set(id, (d as any)?._id);
      const cid = (d as any)?.carrierId;
      if (cid) carrierIdsSet.add(String(cid));
    }

    const carrierIds = Array.from(carrierIdsSet);
    const carrierIdFilters = carrierIds.map((cid) =>
      mongoose.Types.ObjectId.isValid(cid) ? new mongoose.Types.ObjectId(cid) : cid,
    );
    const carriers = await Carrier.collection
      .find({ _id: { $in: carrierIdFilters } as any }, { projection: { _id: 1, trackingIdColumnName: 1 } })
      .toArray();

    const carrierTrackingMap = new Map<string, string | undefined>();
    for (const c of carriers) {
      carrierTrackingMap.set(String((c as any)?._id), (c as any)?.trackingIdColumnName);
    }

    for (const cid of carrierIds) {
      if (!carrierTrackingMap.has(cid) && isBuiltInCarrierId(cid)) {
        const builtIn = getBuiltInCarrier(cid);
        if (builtIn) {
          carrierTrackingMap.set(cid, builtIn.trackingIdColumnName);
        }
      }
    }

    const extractTrackingId = (
      row: Record<string, unknown> | undefined,
      columnName: string | undefined,
    ): string | undefined => {
      if (!row || !columnName) return undefined;
      const raw = (row as any)?.[columnName];
      if (raw === undefined || raw === null) return undefined;
      const s = String(raw).trim();
      return s ? s : undefined;
    };

    const getNestedValue = (obj: any, path: string): any => {
      if (!obj || !path) return undefined;
      const parts = path.split('.');
      let current = obj;
      for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
      }
      return current;
    };

    const valueToIds = new Map<string, string[]>();
    for (const d of docs) {
      const v = normalizeKey(getNestedValue(d, orderMatchField));
      if (!v) continue;
      if (!valueToIds.has(v)) valueToIds.set(v, []);
      valueToIds.get(v)!.push(String((d as any)._id));
    }

    const ambiguous: string[] = [];
    const unmatched: string[] = [];
    const overwrittenOrders: string[] = [];

    const ops: any[] = [];
    let matchedOrders = 0;
    for (const [key, rawRow] of grouped.entries()) {
      if (duplicatedInFile.includes(key)) continue;
      const ids = valueToIds.get(key) || [];
      if (ids.length === 0) {
        unmatched.push(key);
        continue;
      }
      if (ids.length > 1) {
        ambiguous.push(key);
        continue;
      }
      matchedOrders += 1;
      const id = ids[0];
      const doc = docMap.get(id);
      const trackingIdColumnName = doc?.carrierId ? carrierTrackingMap.get(String(doc.carrierId)) : undefined;
      if ((doc as any)?.status?.carrierReceipt?.isReceived) {
        overwrittenOrders.push(key);
      }
      const candidateTrackingId =
        extractTrackingId(rawRow as any, trackingIdColumnName) ||
        extractTrackingId(doc?.carrierRawRow as any, trackingIdColumnName);
      // Sanitize rawRow keys
      const sanitizedRow: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawRow)) {
        const safeKey = k.replace(/\./g, '_').replace(/^\$/, '_$');
        sanitizedRow[safeKey] = v;
      }
      const setPayload: Record<string, unknown> = {
        carrierRawRow: sanitizedRow,
        'status.carrierReceipt.isReceived': true,
        'status.carrierReceipt.receivedAt': now,
        updatedAt: now,
      };
      if (candidateTrackingId) {
        setPayload.trackingId = candidateTrackingId;
      }
      const rawId = rawIdMap.get(id) ?? id;
      ops.push({
        updateOne: {
          filter: { _id: rawId },
          update: { $set: setPayload },
        },
      });
    }

    let updatedOrders = 0;
    if (ops.length) {
      const r = await ShipmentOrder.bulkWrite(ops, { ordered: false });
      updatedOrders = r.modifiedCount || 0;
    }

    const carrierMatchedIds = ops.map((op) => String((op as any).updateOne.filter._id));

    res.json({
      message: overwrittenOrders.length > 0
        ? `送り状データを取り込みました（${overwrittenOrders.length}件は既存データを上書きしました）`
        : '送り状データを取り込みました',
      data: {
        totalRows: items.length,
        skippedEmpty,
        matchedOrders,
        updatedOrders,
        overwrittenOrders,
        unmatched,
        ambiguous,
        duplicatedInFile,
      },
    });

    // Auto-processing hook (fire-and-forget)
    if (carrierMatchedIds.length > 0) {
      processOrderEventBulk(carrierMatchedIds, 'order.carrierReceived').catch(console.error);
    }
  } catch (error: any) {
    console.error('[importCarrierReceiptRows] error:', error);
    res.status(500).json({ message: 'Failed to import carrier receipt rows', error: error.message });
  }
};
