import type { OrderDocument } from '@/models/order';
import { ShipmentOrder, calculateProductsMeta } from '@/models/shipmentOrder';
import { generateOrderNumbers } from '@/utils/idGenerator';
import { Product } from '@/models/product';
import { OrderSourceCompany } from '@/models/orderSourceCompany';
import { Carrier } from '@/models/carrier';
import { naturalSort } from '@/utils/naturalSort';
import { fetchYamatoSortCodeBatchByPostcode, type YamatoCalcBatchByPostcodeItem } from '@/services/yamatoCalcService';
import { createOrderSchema, orderDocumentSchema } from '@/schemas/orderSchema';
import { z } from 'zod';
import mongoose from 'mongoose';
import { processOrderEvent, processOrderEventBulk } from '@/services/autoProcessingEngine';
import { isBuiltInCarrierId, getBuiltInCarrier } from '@/data/builtInCarriers';
import { completeStockForOrder, unreserveStockForOrder } from '@/services/stockService';
import { extensionManager } from '@/core/extensions';
import { HOOK_EVENTS } from '@/core/extensions/types';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { logOperation } from '@/services/operationLogger';
import { createAutoCharge } from '@/services/chargeService';
import { logger } from '@/lib/logger';

// ============================================================
// 类型定义 / 型定義
// ============================================================

export interface UploadArtifact {
  uploadId: string;
  tenantId: string;
  filename: string;
  mimeType: string;
  storedPath: string;
}

/**
 * 軽量クエリ用の projection（原始データを除外）
 * 軽量クエリ用プロジェクション / 轻量查询投影
 */
const LIGHT_PROJECTION = {
  sourceRawRows: 0,
  carrierRawRow: 0,
};

/** 批量创建输入项 / 一括作成入力項目 */
export interface CreateOrderBulkItem {
  clientId: string;
  order: z.infer<typeof createOrderSchema>;
}

/** 批量创建结果 / 一括作成結果 */
export interface CreateOrdersBulkResult {
  total: number;
  successCount: number;
  failureCount: number;
  successes: Array<{ clientId: string; insertedId: string }>;
  failures: Array<{ clientId?: string; field?: string; message: string }>;
}

/** 更新订单输入 / 注文更新入力 */
export interface UpdateOrderInput {
  [key: string]: any;
}

/** 更新订单结果 / 注文更新結果 */
export interface UpdateOrderResult {
  order: any;
}

/** 删除订单结果 / 注文削除結果 */
export interface DeleteOrdersBulkResult {
  deletedCount: number;
  requestedCount: number;
}

/** 状态操作类型 / ステータスアクションタイプ */
export type StatusAction =
  | 'mark-print-ready'
  | 'mark-printed'
  | 'mark-shipped'
  | 'mark-ec-exported'
  | 'mark-inspected'
  | 'mark-held'
  | 'unhold'
  | 'unconfirm';

/** 状态类型 / ステータスタイプ */
export type StatusType = 'confirm' | 'carrierReceipt' | 'printed' | 'shipped' | 'ecExported' | 'inspected' | 'held';

/** 状态操作输入 / ステータスアクション入力 */
export interface StatusActionInput {
  action: StatusAction;
  statusType?: StatusType;
}

/** 批量状态操作结果 / 一括ステータスアクション結果 */
export interface StatusBulkResult {
  action: string;
  statusType?: string;
  matchedCount: number;
  modifiedCount: number;
  requestedCount: number;
}

/**
 * Status类型到字段的映射 / ステータスタイプからフィールドへのマッピング
 * 用于支持各种status操作 / 各ステータス操作をサポート
 */
const STATUS_FIELD_MAP: Record<string, { isField: string; atField: string }> = {
  confirm: {
    isField: 'status.confirm.isConfirmed',
    atField: 'status.confirm.confirmedAt',
  },
  carrierReceipt: {
    isField: 'status.carrierReceipt.isReceived',
    atField: 'status.carrierReceipt.receivedAt',
  },
  printed: {
    isField: 'status.printed.isPrinted',
    atField: 'status.printed.printedAt',
  },
  shipped: {
    isField: 'status.shipped.isShipped',
    atField: 'status.shipped.shippedAt',
  },
  ecExported: {
    isField: 'status.ecExported.isExported',
    atField: 'status.ecExported.exportedAt',
  },
  inspected: {
    isField: 'status.inspected.isInspected',
    atField: 'status.inspected.inspectedAt',
  },
  held: {
    isField: 'status.held.isHeld',
    atField: 'status.held.heldAt',
  },
};

// 保护字段：不允许更新这些字段 / 保護フィールド：更新不可
const PROTECTED_FIELDS_UPDATE = ['_id', 'orderNumber', 'createdAt', 'tenantId', 'status', 'sourceRawRows', 'carrierRawRow'];
const PROTECTED_FIELDS_BULK_UPDATE = ['_id', 'orderNumber', 'createdAt', 'tenantId', 'sourceRawRows', 'carrierRawRow'];

// 可选字符串字段（空字符串时跳过） / オプション文字列フィールド（空文字列はスキップ）
const OPTIONAL_STRING_FIELDS = [
  'deliveryTimeSlot',
  'deliveryDatePreference',
  'orderSourceCompanyId',
  'honorific',
];

// ============================================================
// 过滤器 / フィルター
// ============================================================

type Operator =
  | 'is'
  | 'isNot'
  | 'contains'
  | 'notContains'
  | 'hasAnyValue'
  | 'isEmpty'
  | 'equals'
  | 'notEquals'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'between'
  | 'before'
  | 'after'
  | 'in'
  // Relative date operators from frontend (SearchForm builds value but keeps operator)
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'thisMonth'
  | 'last7Days'
  | 'last30Days'
  | 'next7Days'
  | 'next30Days';

type FilterPayload = Record<string, { operator: Operator; value: any }>;

export const filterPayloadSchema: z.ZodType<FilterPayload> = z.record(
  z.object({
    operator: z.string(),
    value: z.any().optional(),
  }),
) as any;

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isBlank = (v: any): boolean => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

const parseYmd = (raw: any): { y: number; m: number; d: number } | null => {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  const m = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mm) || !Number.isFinite(d)) return null;
  if (mm < 1 || mm > 12) return null;
  if (d < 1 || d > 31) return null;
  return { y, m: mm, d };
};

/**
 * Convert a client "date-only" (YYYY/MM/DD or YYYY-MM-DD) into a date range
 * 将用户输入的日期理解为日本时间（JST, UTC+9），并转换为 UTC 时间范围用于 MongoDB 查询
 * ユーザー入力の日付をJST（UTC+9）として解釈し、MongoDBクエリ用のUTC時間範囲に変換
 */
const localDayToDateRange = (
  dateOnly: string,
): { start: Date; end: Date } | null => {
  const parts = parseYmd(dateOnly);
  if (!parts) return null;

  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

  const utcMidnight = Date.UTC(parts.y, parts.m - 1, parts.d, 0, 0, 0, 0);
  const utcEndOfDay = Date.UTC(parts.y, parts.m - 1, parts.d, 23, 59, 59, 999);

  const start = new Date(utcMidnight - JST_OFFSET_MS);
  const end = new Date(utcEndOfDay - JST_OFFSET_MS);

  return { start, end };
};

const buildEmptyCondition = (field: string) => ({
  $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: '' }],
});

const buildHasAnyCondition = (field: string) => ({
  $and: [{ [field]: { $exists: true } }, { [field]: { $ne: null } }, { [field]: { $ne: '' } }],
});

const toNumber = (v: any): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * 根据过滤器构建 MongoDB 查询条件 / フィルターからMongoDBクエリ条件を構築
 */
export const buildMongoQueryFromFilters = (filters: FilterPayload): Record<string, any> => {
  const and: any[] = [];

  const dateFields = new Set(['createdAt', 'updatedAt', 'sourceOrderAt']);
  const dateOnlyStringFields = new Set(['shipPlanDate', 'deliveryDatePreference']);
  const booleanFields = new Set<string>([
    'status.shipped.isShipped',
    'status.ecExported.isExported',
    'status.confirm.isConfirmed',
    'status.printed.isPrinted',
    'status.carrierReceipt.isReceived',
  ]);
  const numberFields = new Set<string>([]);
  const objectIdFields = new Set<string>(['_id', 'carrierId']);

  const buildObjectIdEqualsExpr = (field: string, raw: any) => {
    const s = typeof raw === 'string' ? raw.trim() : raw instanceof mongoose.Types.ObjectId ? raw.toHexString() : String(raw ?? '').trim();
    if (!s) return null;
    return { $expr: { $eq: [{ $toString: `$${field}` }, s] } };
  };

  const buildObjectIdNotEqualsExpr = (field: string, raw: any) => {
    const s = typeof raw === 'string' ? raw.trim() : raw instanceof mongoose.Types.ObjectId ? raw.toHexString() : String(raw ?? '').trim();
    if (!s) return null;
    return {
      $or: [
        { [field]: { $exists: false } },
        { [field]: null },
        { $expr: { $ne: [{ $toString: `$${field}` }, s] } },
      ],
    };
  };

  // 許可フィールドの白名単（セキュリティ: 任意フィールドへのクエリを防止）
  // 允许的字段白名单（安全: 防止对任意字段的查询）
  const allowedFields = new Set([
    ...dateFields, ...dateOnlyStringFields, ...booleanFields, ...numberFields, ...objectIdFields,
    '_productsMeta.totalQuantity', '_productsMeta.skuCount', '_productsMeta.totalPrice',
    '_productsMeta.names', '_productsMeta.skus', '_productsMeta.barcodes',
    'productName', 'productSku', 'productBarcode', 'handlingTags',
    'status.confirm.isConfirmed', 'status.shipped.isShipped',
    // デフォルト文字列フィールド / 默认字符串字段
    'orderNumber', 'senderName', 'recipient.name', 'recipient.phone', 'recipient.postalCode',
    'recipient.prefecture', 'recipient.city', 'recipient.address1', 'recipient.address2',
    'deliveryTimeSlot', 'memo', 'trackingId', 'carrier', 'carrierServiceType',
    'orderSourceCompanyId', 'coolType', 'honorific', 'warehouseId',
  ]);

  for (const [field, cond] of Object.entries(filters || {})) {
    const op = cond?.operator as Operator;
    const value = (cond as any)?.value;

    if (!field || typeof field !== 'string') continue;
    // 許可されていないフィールドを無視 / 忽略未许可的字段
    if (!allowedFields.has(field)) continue;

    // Empty / any-value operators are type-agnostic.
    if (op === 'isEmpty') {
      and.push(buildEmptyCondition(field));
      continue;
    }
    if (op === 'hasAnyValue') {
      and.push(buildHasAnyCondition(field));
      continue;
    }

    // Boolean fields
    if (booleanFields.has(field)) {
      const boolVal = Boolean(value);
      if (op === 'is' || op === 'equals') {
        if (boolVal === false) {
          and.push({
            $or: [
              { [field]: false },
              { [field]: { $exists: false } },
              { [field]: null },
            ],
          });
        } else {
          and.push({ [field]: true });
        }
      } else if (op === 'isNot' || op === 'notEquals') {
        if (boolVal === false) {
          and.push({ [field]: true });
        } else {
          and.push({
            $or: [
              { [field]: false },
              { [field]: { $exists: false } },
              { [field]: null },
            ],
          });
        }
      }
      continue;
    }

    // Date (stored as Date in Mongo)
    if (dateFields.has(field)) {
      const handleEqualsLike = (dateOnly: string) => {
        const range = localDayToDateRange(dateOnly);
        if (!range) return;
        and.push({ [field]: { $gte: range.start, $lte: range.end } });
      };

      const handleBetweenDays = (start: string, end: string) => {
        const r1 = localDayToDateRange(start);
        const r2 = localDayToDateRange(end);
        if (!r1 || !r2) return;
        and.push({ [field]: { $gte: r1.start, $lte: r2.end } });
      };

      if (Array.isArray(value) && (op === 'between' || op === 'thisWeek' || op === 'thisMonth' || op === 'last7Days' || op === 'last30Days' || op === 'next7Days' || op === 'next30Days')) {
        const [a, b] = value as [any, any];
        if (typeof a === 'string' && typeof b === 'string') handleBetweenDays(a, b);
        continue;
      }

      if (typeof value === 'string' && (op === 'equals' || op === 'is' || op === 'today' || op === 'yesterday')) {
        handleEqualsLike(value);
        continue;
      }

      if (typeof value === 'string' && op === 'before') {
        const r = localDayToDateRange(value);
        if (r) and.push({ [field]: { $lt: r.start } });
        continue;
      }
      if (typeof value === 'string' && op === 'after') {
        const r = localDayToDateRange(value);
        if (r) and.push({ [field]: { $gte: r.start } });
        continue;
      }

      if (typeof value === 'string' && (op === 'notEquals' || op === 'isNot')) {
        const r = localDayToDateRange(value);
        if (r) {
          and.push({
            $or: [{ [field]: { $lt: r.start } }, { [field]: { $gt: r.end } }],
          });
        }
        continue;
      }

      continue;
    }

    // Date-only fields stored as string (e.g., 'YYYY/MM/DD')
    if (dateOnlyStringFields.has(field)) {
      const asYmd = (s: any): string | null => {
        if (typeof s !== 'string') return null;
        const p = parseYmd(s);
        if (!p) return null;
        return `${String(p.y).padStart(4, '0')}/${String(p.m).padStart(2, '0')}/${String(p.d).padStart(2, '0')}`;
      };

      if (Array.isArray(value) && (op === 'between' || op === 'thisWeek' || op === 'thisMonth' || op === 'last7Days' || op === 'last30Days' || op === 'next7Days' || op === 'next30Days')) {
        const [a, b] = value as [any, any];
        const aa = asYmd(a);
        const bb = asYmd(b);
        if (aa && bb) {
          and.push({ [field]: { $gte: aa, $lte: bb } });
        }
        continue;
      }

      if (typeof value === 'string' && (op === 'equals' || op === 'is' || op === 'today' || op === 'yesterday')) {
        const v = asYmd(value);
        if (v) {
          and.push({ [field]: { $in: [v, v.replace(/\//g, '-')] } });
        }
        continue;
      }

      if (typeof value === 'string' && (op === 'notEquals' || op === 'isNot')) {
        const v = asYmd(value);
        if (v) and.push({ [field]: { $nin: [v, v.replace(/\//g, '-')] } });
        continue;
      }

      if (typeof value === 'string' && op === 'before') {
        const v = asYmd(value);
        if (v) and.push({ [field]: { $lt: v } });
        continue;
      }
      if (typeof value === 'string' && op === 'after') {
        const v = asYmd(value);
        if (v) and.push({ [field]: { $gte: v } });
        continue;
      }

      continue;
    }

    // Number fields (none currently, but keep extensible)
    if (numberFields.has(field)) {
      const n = Array.isArray(value) ? value.map(toNumber) : toNumber(value);
      if (op === 'equals') and.push({ [field]: n });
      if (op === 'notEquals') and.push({ [field]: { $ne: n } });
      if (op === 'greaterThan') and.push({ [field]: { $gt: n } });
      if (op === 'greaterThanOrEqual') and.push({ [field]: { $gte: n } });
      if (op === 'lessThan') and.push({ [field]: { $lt: n } });
      if (op === 'lessThanOrEqual') and.push({ [field]: { $lte: n } });
      if (op === 'between' && Array.isArray(n) && n.length === 2 && n[0] !== null && n[1] !== null) {
        and.push({ [field]: { $gte: n[0], $lte: n[1] } });
      }
      continue;
    }

    // ObjectId fields
    if (objectIdFields.has(field)) {
      if (op === 'is' || op === 'equals') {
        if (isBlank(value)) continue;
        if (Array.isArray(value) && value.length > 0) {
          const exprs = value.map((v: any) => buildObjectIdEqualsExpr(field, v)).filter((e: any) => e !== null);
          if (exprs.length > 0) {
            and.push({ $or: exprs });
          }
        } else {
          const expr = buildObjectIdEqualsExpr(field, value);
          if (expr) and.push(expr);
        }
        continue;
      }
      if (op === 'in') {
        if (Array.isArray(value) && value.length > 0) {
          const exprs = value.map((v: any) => buildObjectIdEqualsExpr(field, v)).filter((e: any) => e !== null);
          if (exprs.length > 0) {
            and.push({ $or: exprs });
          }
        }
        continue;
      }
      if (op === 'isNot' || op === 'notEquals') {
        if (isBlank(value)) continue;
        const expr = buildObjectIdNotEqualsExpr(field, value);
        if (expr) and.push(expr);
        continue;
      }
      continue;
    }

    // 商品总数 (_productsMeta.totalQuantity)
    if (field === '_productsMeta.totalQuantity') {
      const numValue = typeof value === 'number' ? value : Number(value);
      if (isNaN(numValue)) continue;
      if (op === 'equals' || op === 'is') {
        and.push({ '_productsMeta.totalQuantity': numValue });
      } else if (op === 'notEquals' || op === 'isNot') {
        and.push({ '_productsMeta.totalQuantity': { $ne: numValue } });
      } else if (op === 'greaterThan') {
        and.push({ '_productsMeta.totalQuantity': { $gt: numValue } });
      } else if (op === 'greaterThanOrEqual') {
        and.push({ '_productsMeta.totalQuantity': { $gte: numValue } });
      } else if (op === 'lessThan') {
        and.push({ '_productsMeta.totalQuantity': { $lt: numValue } });
      } else if (op === 'lessThanOrEqual') {
        and.push({ '_productsMeta.totalQuantity': { $lte: numValue } });
      } else if (op === 'between' && Array.isArray(value) && value.length === 2) {
        const [min, max] = [Number(value[0]), Number(value[1])];
        if (!isNaN(min) && !isNaN(max)) {
          and.push({ '_productsMeta.totalQuantity': { $gte: min, $lte: max } });
        }
      }
      continue;
    }

    // SKU種類数 (_productsMeta.skuCount)
    if (field === '_productsMeta.skuCount') {
      const numValue = typeof value === 'number' ? value : Number(value);
      if (isNaN(numValue)) continue;
      if (op === 'equals' || op === 'is') {
        and.push({ '_productsMeta.skuCount': numValue });
      } else if (op === 'notEquals' || op === 'isNot') {
        and.push({ '_productsMeta.skuCount': { $ne: numValue } });
      } else if (op === 'greaterThan') {
        and.push({ '_productsMeta.skuCount': { $gt: numValue } });
      } else if (op === 'greaterThanOrEqual') {
        and.push({ '_productsMeta.skuCount': { $gte: numValue } });
      } else if (op === 'lessThan') {
        and.push({ '_productsMeta.skuCount': { $lt: numValue } });
      } else if (op === 'lessThanOrEqual') {
        and.push({ '_productsMeta.skuCount': { $lte: numValue } });
      } else if (op === 'between' && Array.isArray(value) && value.length === 2) {
        const [min, max] = [Number(value[0]), Number(value[1])];
        if (!isNaN(min) && !isNaN(max)) {
          and.push({ '_productsMeta.skuCount': { $gte: min, $lte: max } });
        }
      }
      continue;
    }

    // 合計金額 (_productsMeta.totalPrice)
    if (field === '_productsMeta.totalPrice') {
      const numValue = typeof value === 'number' ? value : Number(value);
      if (isNaN(numValue)) continue;
      if (op === 'equals' || op === 'is') {
        and.push({ '_productsMeta.totalPrice': numValue });
      } else if (op === 'notEquals' || op === 'isNot') {
        and.push({ '_productsMeta.totalPrice': { $ne: numValue } });
      } else if (op === 'greaterThan') {
        and.push({ '_productsMeta.totalPrice': { $gt: numValue } });
      } else if (op === 'greaterThanOrEqual') {
        and.push({ '_productsMeta.totalPrice': { $gte: numValue } });
      } else if (op === 'lessThan') {
        and.push({ '_productsMeta.totalPrice': { $lt: numValue } });
      } else if (op === 'lessThanOrEqual') {
        and.push({ '_productsMeta.totalPrice': { $lte: numValue } });
      } else if (op === 'between' && Array.isArray(value) && value.length === 2) {
        const [min, max] = [Number(value[0]), Number(value[1])];
        if (!isNaN(min) && !isNaN(max)) {
          and.push({ '_productsMeta.totalPrice': { $gte: min, $lte: max } });
        }
      }
      continue;
    }

    // 商品名 (_productsMeta.names)
    if (field === 'productName' || field === '_productsMeta.names') {
      const q = typeof value === 'string' ? value : String(value ?? '');
      if (isBlank(q)) continue;

      if (op === 'contains') {
        const re = new RegExp(escapeRegex(q), 'i');
        and.push({ '_productsMeta.names': re });
      } else if (op === 'is') {
        const trimmedQ = q.trim();
        const re = new RegExp(`^${escapeRegex(trimmedQ)}$`, 'i');
        and.push({ '_productsMeta.names': re });
      } else if (op === 'notContains') {
        const re = new RegExp(escapeRegex(q), 'i');
        and.push({ $nor: [{ '_productsMeta.names': re }] });
      } else if (op === 'isNot') {
        const trimmedQ = q.trim();
        const re = new RegExp(`^${escapeRegex(trimmedQ)}$`, 'i');
        and.push({ $nor: [{ '_productsMeta.names': re }] });
      }
      continue;
    }

    // 商品SKU管理番号 (_productsMeta.skus)
    if (field === 'productSku' || field === '_productsMeta.skus') {
      const q = typeof value === 'string' ? value : String(value ?? '');
      if (isBlank(q)) continue;

      if (op === 'contains') {
        const re = new RegExp(escapeRegex(q), 'i');
        and.push({ '_productsMeta.skus': re });
      } else if (op === 'is') {
        const trimmedQ = q.trim();
        const re = new RegExp(`^${escapeRegex(trimmedQ)}$`, 'i');
        and.push({ '_productsMeta.skus': re });
      } else if (op === 'notContains') {
        const re = new RegExp(escapeRegex(q), 'i');
        and.push({ $nor: [{ '_productsMeta.skus': re }] });
      } else if (op === 'isNot') {
        const trimmedQ = q.trim();
        const re = new RegExp(`^${escapeRegex(trimmedQ)}$`, 'i');
        and.push({ $nor: [{ '_productsMeta.skus': re }] });
      }
      continue;
    }

    // 商品バーコード (_productsMeta.barcodes)
    if (field === '_productsMeta.barcodes' || field === 'productBarcode') {
      const q = typeof value === 'string' ? value : String(value ?? '');
      if (isBlank(q)) continue;

      if (op === 'contains') {
        const re = new RegExp(escapeRegex(q), 'i');
        and.push({ '_productsMeta.barcodes': re });
      } else if (op === 'is') {
        const trimmedQ = q.trim();
        const re = new RegExp(`^${escapeRegex(trimmedQ)}$`, 'i');
        and.push({ '_productsMeta.barcodes': re });
      } else if (op === 'notContains') {
        const re = new RegExp(escapeRegex(q), 'i');
        and.push({ $nor: [{ '_productsMeta.barcodes': re }] });
      } else if (op === 'isNot') {
        const trimmedQ = q.trim();
        const re = new RegExp(`^${escapeRegex(trimmedQ)}$`, 'i');
        and.push({ $nor: [{ '_productsMeta.barcodes': re }] });
      }
      continue;
    }

    // Special handling: handlingTags is array of strings
    if (field === 'handlingTags') {
      if (op === 'contains' || op === 'notContains') {
        const q = typeof value === 'string' ? value : Array.isArray(value) ? value.join(' ') : String(value ?? '');
        if (isBlank(q)) continue;
        const re = new RegExp(escapeRegex(q), 'i');
        const expr = { [field]: { $elemMatch: { $regex: re } } };
        and.push(op === 'notContains' ? { $nor: [expr] } : expr);
        continue;
      }
      if (op === 'is') {
        and.push({ [field]: value });
        continue;
      }
      if (op === 'isNot') {
        and.push({ [field]: { $ne: value } });
        continue;
      }
      continue;
    }

    // Special handling: status.confirm.isConfirmed
    if (field === 'status.confirm.isConfirmed' && (op === 'is' || op === 'equals')) {
      if (value === false) {
        and.push({
          $or: [
            { 'status.confirm.isConfirmed': false },
            { 'status.confirm.isConfirmed': { $exists: false } },
          ],
        });
      } else if (value === true) {
        and.push({ 'status.confirm.isConfirmed': true });
      }
      continue;
    }

    // Special handling: status.shipped.isShipped
    if (field === 'status.shipped.isShipped' && (op === 'isNot' || op === 'notEquals')) {
      if (value === true) {
        and.push({
          $or: [
            { 'status.shipped.isShipped': false },
            { 'status.shipped.isShipped': null },
            { 'status.shipped.isShipped': { $exists: false } },
          ],
        });
      } else if (value === false) {
        and.push({ 'status.shipped.isShipped': true });
      }
      continue;
    }

    // Default: treat as string/select
    if (op === 'is' || op === 'equals') {
      if (isBlank(value)) continue;
      and.push({ [field]: value });
      continue;
    }
    if (op === 'isNot' || op === 'notEquals') {
      if (isBlank(value)) continue;
      and.push({ [field]: { $ne: value } });
      continue;
    }
    if (op === 'contains' || op === 'notContains') {
      const q = typeof value === 'string' ? value : Array.isArray(value) ? value.join(' ') : String(value ?? '');
      if (isBlank(q)) continue;
      const re = new RegExp(escapeRegex(q), 'i');
      const expr = { [field]: { $regex: re } };
      and.push(op === 'notContains' ? { $nor: [expr] } : expr);
      continue;
    }
  }

  return and.length ? { $and: and } : {};
};

// ============================================================
// Zod schemas for bulk create / 一括作成用Zodスキーマ
// ============================================================

const createOrderBulkSchema = z.object({
  items: z
    .array(
      z.object({
        clientId: z.string().min(1, 'clientId is required'),
        order: createOrderSchema,
      }),
    )
    .min(1, 'items is required'),
});

type CreateOrderBulkInput = z.infer<typeof createOrderBulkSchema>;

const zodIssuesToBulkErrors = (issues: z.ZodIssue[], body: any): Array<{ clientId?: string; field?: string; message: string }> => {
  const rawItems: any[] = Array.isArray(body?.items) ? body.items : [];
  return issues.map((issue) => {
    const p = issue.path ?? [];
    const idx = p.length >= 2 && p[0] === 'items' && typeof p[1] === 'number' ? (p[1] as number) : null;
    const clientId = idx !== null ? rawItems?.[idx]?.clientId : undefined;
    const orderFieldPath =
      idx !== null && p[0] === 'items' && p[2] === 'order'
        ? p.slice(3).filter((x) => typeof x === 'string' || typeof x === 'number').join('.')
        : undefined;
    return {
      clientId: typeof clientId === 'string' ? clientId : undefined,
      field: orderFieldPath,
      message: issue.message,
    };
  });
};

// ============================================================
// 既存关数（保持向后兼容） / 既存関数（後方互換性を維持）
// ============================================================

export const ingestCsv = async (_artifact: UploadArtifact): Promise<OrderDocument[]> => {
  throw new Error('ingestCsv not implemented');
};

/**
 * 为订单数组生成订单号 / 注文配列に注文番号を生成
 * 批量生成时，按顺序为每个订单生成唯一的订单号
 */
export const assignOrderNumbers = async (orders: Partial<OrderDocument>[]): Promise<OrderDocument[]> => {
  const orderNumbers = await generateOrderNumbers(orders.length);
  return orders.map((order, i) => ({ ...order, orderNumber: orderNumbers[i] } as OrderDocument));
};

export const persistShipmentOrders = async (orders: OrderDocument[]): Promise<{ insertedIds: string[] }> => {
  // insertMany 不会触发 pre-save hooks，所以需要手动计算 _productsMeta
  const ordersWithMeta = orders.map((order) => {
    const products = order.products || [];
    const _productsMeta = calculateProductsMeta(products);
    return {
      ...order,
      _productsMeta,
    };
  });

  const inserted = await ShipmentOrder.insertMany(ordersWithMeta as any[], { ordered: true });
  return { insertedIds: inserted.map((d) => String(d._id)) };
};

// ============================================================
// 核心业务操作 / コアビジネスオペレーション
// ============================================================

/**
 * 批量创建订单 / 注文一括作成
 *
 * 包含商品ID验证、依赖主信息自动填充、仕分けコード自動計算、订单号生成、数据库插入
 * 商品IDバリデーション、依頼主情報自動入力、仕分けコード自動計算、注文番号生成、DB挿入を含む
 *
 * @throws ValidationError - 输入验证失败时 / 入力バリデーション失敗時
 */
export const createOrders = async (
  rawPayload: unknown,
): Promise<CreateOrdersBulkResult> => {
  const parsed = createOrderBulkSchema.safeParse(rawPayload);

  if (!parsed.success) {
    throw new ValidationError('バリデーションエラー', zodIssuesToBulkErrors(parsed.error.issues, rawPayload));
  }

  // === 商品ID (productId) 存在性バリデーション ===
  const allProductIds = new Set<string>();

  for (const item of parsed.data.items) {
    const products = item.order?.products;
    if (Array.isArray(products)) {
      for (let i = 0; i < products.length; i++) {
        const p = products[i] as any;
        if (p.productId && typeof p.productId === 'string' && p.productId.trim()) {
          allProductIds.add(p.productId.trim());
        }
      }
    }
  }

  if (allProductIds.size > 0) {
    const productIdArray = Array.from(allProductIds);
    const existingProducts = await Product.find(
      { _id: { $in: productIdArray } },
      { _id: 1 },
    ).lean();
    const existingIds = new Set(existingProducts.map((p) => String((p as any)._id)));

    if (existingIds.size !== allProductIds.size) {
      const errors: Array<{ clientId?: string; field?: string; message: string }> = [];
      for (const item of parsed.data.items) {
        const products = item.order?.products || [];
        for (let i = 0; i < products.length; i++) {
          const p = products[i] as any;
          if (p.productId && !existingIds.has(p.productId)) {
            errors.push({
              clientId: item.clientId,
              field: `products.${i}.productId`,
              message: `商品が見つかりません（削除された可能性があります）: ${p.inputSku || p.productId}`,
            });
          }
        }
      }
      throw new ValidationError('商品が見つかりません', errors);
    }
  }

  const now = new Date().toISOString();

  type BulkRow = { clientId: string; order: any };

  const baseRows: BulkRow[] = parsed.data.items.map((item) => {
    const order = {
      ...item.order,
      createdAt: now,
      updatedAt: now,
      status: {
        carrierReceipt: { isReceived: false },
        printed: { isPrinted: false },
      },
    };
    return { clientId: item.clientId, order };
  });

  // --- hatsuBaseNo1, hatsuBaseNo2 auto fill (non-blocking) ---
  // --- 依頼主情報から発店コードの自動入力（非ブロッキング） ---
  try {
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const r of baseRows) {
      const id = (r.order as any)?.orderSourceCompanyId;
      if (typeof id === 'string' && id.trim()) ids.add(id.trim());
      const senderName = (r.order as any)?.senderName;
      if (typeof senderName === 'string' && senderName.trim()) names.add(senderName.trim());
    }

    const companiesById = new Map<string, any>();
    const companiesByName = new Map<string, any>();

    if (ids.size > 0) {
      const list = await OrderSourceCompany.find({ _id: { $in: Array.from(ids) } }).lean();
      for (const c of list as any[]) companiesById.set(String((c as any)?._id), c);
    }
    if (names.size > 0) {
      const list = await OrderSourceCompany.find({ senderName: { $in: Array.from(names) } }).lean();
      for (const c of list as any[]) companiesByName.set(String((c as any)?.senderName || '').trim(), c);
    }

    for (const r of baseRows) {
      const o: any = r.order;
      const company =
        (typeof o?.orderSourceCompanyId === 'string' && o.orderSourceCompanyId.trim()
          ? companiesById.get(o.orderSourceCompanyId.trim())
          : null) ||
        (typeof o?.senderName === 'string' && o.senderName.trim()
          ? companiesByName.get(o.senderName.trim())
          : null);

      if (company) {
        if (!o.hatsuBaseNo1 && (company as any)?.hatsuBaseNo1) {
          (r.order as any).hatsuBaseNo1 = String((company as any).hatsuBaseNo1);
        }
        if (!o.hatsuBaseNo2 && (company as any)?.hatsuBaseNo2) {
          (r.order as any).hatsuBaseNo2 = String((company as any).hatsuBaseNo2);
        }
      }
    }
  } catch {
    // ignore
  }

  // --- carrierData.yamato.sortingCode auto calculation (non-blocking) ---
  // --- 仕分けコードの自動計算（非ブロッキング） ---
  try {
    const calcItems: YamatoCalcBatchByPostcodeItem[] = [];
    for (const r of baseRows) {
      const o: any = r.order;
      const destinationPostalCode = o?.recipient?.postalCode;
      const departureBaseNo = o?.carrierData?.yamato?.hatsuBaseNo1;
      const existingSortingCode = o?.carrierData?.yamato?.sortingCode;
      if (destinationPostalCode && departureBaseNo && !existingSortingCode) {
        calcItems.push({
          clientId: r.clientId,
          destinationPostalCode: String(destinationPostalCode).replace(/-/g, ''),
          departureBaseNo: String(departureBaseNo),
        });
      }
    }

    if (calcItems.length > 0) {
      const sortCodeMap = await fetchYamatoSortCodeBatchByPostcode(calcItems);
      for (const r of baseRows) {
        const sortCode = sortCodeMap.get(r.clientId);
        if (sortCode) {
          const o: any = r.order;
          if (!o.carrierData) o.carrierData = {};
          if (!o.carrierData.yamato) o.carrierData.yamato = {};
          o.carrierData.yamato.sortingCode = sortCode;
        }
      }
    }
  } catch {
    // ignore - non-blocking
  }

  const failures: Array<{ clientId?: string; field?: string; message: string }> = [];

  // 自动为所有订单生成订单号 / 全注文に自動で注文番号を生成
  let ordersWithNumbers: any[] = [];
  try {
    ordersWithNumbers = await assignOrderNumbers(baseRows.map((r) => r.order));
  } catch (error: any) {
    for (const row of baseRows) {
      failures.push({
        clientId: row.clientId,
        message: `出荷管理Noの生成に失敗しました: ${error.message}`,
      });
    }
    return {
      total: baseRows.length,
      successCount: 0,
      failureCount: failures.length,
      successes: [],
      failures,
    };
  }

  const rowsWithOrderNumbers = baseRows.map((row, index) => ({
    ...row,
    order: ordersWithNumbers[index],
  }));

  const toInsert = rowsWithOrderNumbers;
  const docs = toInsert.map((r) => r.order);

  // 为每个订单计算 _productsMeta / 各注文の _productsMeta を計算
  const docsWithMeta = docs.map((doc) => {
    const products = doc.products || [];
    const _productsMeta = calculateProductsMeta(products);
    return { ...doc, _productsMeta };
  });

  type SuccessRow = { clientId: string; insertedId: string };
  const successes: SuccessRow[] = [];

  if (docsWithMeta.length === 0) {
    return {
      total: baseRows.length,
      successCount: 0,
      failureCount: failures.length,
      successes,
      failures,
    };
  }

  let insertedIds: Record<string, any> = {};
  let writeErrors: Array<{ index: number; code?: number; errmsg?: string; message?: string }> = [];

  try {
    const r: any = await (ShipmentOrder as any).collection.insertMany(docsWithMeta, { ordered: false });
    insertedIds = r?.insertedIds ?? {};
  } catch (e: any) {
    insertedIds = e?.result?.insertedIds ?? e?.insertedIds ?? {};
    writeErrors = Array.isArray(e?.writeErrors) ? e.writeErrors : Array.isArray(e?.result?.writeErrors) ? e.result.writeErrors : [];
  }

  for (const [k, v] of Object.entries(insertedIds || {})) {
    const idx = Number(k);
    const meta = Number.isFinite(idx) ? toInsert[idx] : null;
    if (!meta) continue;
    const id = (v as any)?._id ?? v;
    successes.push({ clientId: meta.clientId, insertedId: String(id) });
  }

  for (const we of writeErrors || []) {
    const idx = (we as any)?.index;
    if (typeof idx !== 'number' || idx < 0 || idx >= toInsert.length) continue;
    const meta = toInsert[idx];
    const code = (we as any)?.code;
    const msgRaw = (we as any)?.errmsg || (we as any)?.message || '書き込みに失敗しました';

    if (code === 11000) {
      failures.push({
        clientId: meta.clientId,
        field: 'orderNumber',
        message: `出荷管理Noが重複しています（${msgRaw}）`,
      });
    } else {
      failures.push({
        clientId: meta.clientId,
        message: msgRaw,
      });
    }
  }

  // Auto-processing hook (fire-and-forget) / 自動処理フック（fire-and-forget）
  const createdIds = successes.map((s) => s.insertedId).filter(Boolean);
  if (createdIds.length > 0) {
    processOrderEventBulk(createdIds, 'order.created').catch((err: unknown) => logger.error(err));
    for (const orderId of createdIds) {
      extensionManager.emit(HOOK_EVENTS.ORDER_CREATED, { orderId }).catch((err: unknown) => logger.error(err));
    }
  }

  // 操作ログ記録 / 操作日志记录 (fire-and-forget)
  if (successes.length > 0) {
    logOperation({
      action: 'order_create',
      description: `出荷指示を作成: ${successes.length}件`,
      referenceType: 'shipmentOrder',
      quantity: successes.length,
    }).catch(() => {});
  }

  return {
    total: baseRows.length,
    successCount: successes.length,
    failureCount: failures.length,
    successes,
    failures,
  };
};

/**
 * 更新单个订单 / 単一注文の更新
 *
 * 包含字段验证、保护字段过滤、Zod schema 验证
 * フィールドバリデーション、保護フィールドフィルタリング、Zodスキーマバリデーションを含む
 *
 * @throws ValidationError - 输入验证失败时 / 入力バリデーション失敗時
 * @throws NotFoundError - 订单不存在时 / 注文が存在しない場合
 */
export const updateOrder = async (
  id: string,
  body: Record<string, any>,
): Promise<UpdateOrderResult> => {
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid id');
  }

  // 检查订单是否存在 / 注文の存在確認
  const existing = await ShipmentOrder.findById(id).lean();
  if (!existing) {
    throw new NotFoundError('Order not found');
  }

  // 获取要更新的字段（排除系统字段） / 更新フィールドの取得（システムフィールドを除外）
  const fieldsToValidate: Record<string, any> = {};
  for (const [key, value] of Object.entries(body)) {
    if (PROTECTED_FIELDS_UPDATE.includes(key)) continue;
    if (value === undefined || value === null) continue;

    if (OPTIONAL_STRING_FIELDS.includes(key) && typeof value === 'string' && value.trim() === '') {
      continue;
    }

    // orderer 对象：如果所有字段都是空字符串，则跳过 / orderer: 全フィールドが空文字列の場合スキップ
    if (key === 'orderer' && typeof value === 'object' && value !== null) {
      const hasNonEmptyValue = Object.values(value).some(
        (v) => typeof v === 'string' && v.trim() !== ''
      );
      if (!hasNonEmptyValue) continue;
    }
    fieldsToValidate[key] = value;
  }

  // 如果没有要更新的字段 / 更新フィールドがない場合
  if (Object.keys(fieldsToValidate).length === 0) {
    return { order: existing };
  }

  // 使用 orderDocumentSchema.partial() 验证 / orderDocumentSchema.partial() でバリデーション
  const parseResult = orderDocumentSchema.partial().safeParse(fieldsToValidate);

  if (!parseResult.success) {
    throw new ValidationError('バリデーションエラー', parseResult.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })));
  }

  const validatedData = parseResult.data;

  const now = new Date().toISOString();
  const fieldsToUpdate: Record<string, any> = {
    ...validatedData,
    updatedAt: now,
  };

  const updated = await ShipmentOrder.findByIdAndUpdate(
    id,
    { $set: fieldsToUpdate },
    { new: true },
  ).lean();

  if (!updated) {
    throw new NotFoundError('Order not found');
  }

  // 操作ログ / 操作日志 (fire-and-forget)
  logOperation({
    action: 'order_update',
    description: `出荷指示を更新: ${updated.orderNumber}（${Object.keys(fieldsToUpdate).join(', ')}）`,
    referenceNumber: updated.orderNumber,
    referenceType: 'shipmentOrder',
    referenceId: id,
  }).catch(() => {});

  return { order: updated };
};

/**
 * 批量删除订单 / 注文一括削除
 *
 * @throws ValidationError - 输入验证失败时 / 入力バリデーション失敗時
 */
export const deleteOrders = async (ids: string[]): Promise<DeleteOrdersBulkResult> => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('Invalid request: ids array is required');
  }

  const validIds = ids.filter(
    (id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
  );

  if (validIds.length === 0) {
    throw new ValidationError('No valid ids provided');
  }

  const result = await ShipmentOrder.deleteMany({
    _id: { $in: validIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
  });

  return {
    deletedCount: result.deletedCount,
    requestedCount: validIds.length,
  };
};

/**
 * 单个订单删除 / 単一注文削除
 *
 * @throws ValidationError - 无效ID / 無効なID
 * @throws NotFoundError - 订单不存在 / 注文が存在しない
 */
export const deleteOrder = async (id: string): Promise<{ order: any }> => {
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid id');
  }

  const deleted = await ShipmentOrder.findByIdAndDelete(id).lean();

  if (!deleted) {
    throw new NotFoundError('Order not found');
  }

  // 扩展系统事件 / 拡張システムイベント (fire-and-forget)
  extensionManager.emit(HOOK_EVENTS.ORDER_CANCELLED, {
    orderId: id,
    reason: 'deleted',
    orderNumber: deleted.orderNumber,
  }).catch((err: unknown) => logger.error(err));

  // 操作ログ / 操作日志 (fire-and-forget)
  logOperation({
    action: 'order_cancel',
    description: `出荷指示を削除: ${deleted.orderNumber}`,
    referenceNumber: deleted.orderNumber,
    referenceType: 'shipmentOrder',
    referenceId: id,
  }).catch(() => {});

  return { order: deleted };
};

/**
 * 确认订单（状态转换为已确认） / 注文確認（ステータスを確認済みに遷移）
 * 对应 action: 'mark-print-ready'
 *
 * @throws ValidationError - 无效ID / 無効なID
 * @throws NotFoundError - 订单不存在 / 注文が存在しない
 */
export const confirmOrders = async (ids: string[]): Promise<StatusBulkResult> => {
  return updateOrderStatusBulk(ids, { action: 'mark-print-ready' });
};

// ステータスアクションの日本語ラベル / 状态操作的日语标签
const STATUS_ACTION_LABELS: Record<string, string> = {
  'mark-print-ready': '出荷確認',
  'mark-printed': '印刷完了',
  'mark-shipped': '出荷完了',
  'mark-ec-exported': 'EC出力完了',
  'mark-inspected': '検品完了',
  'mark-held': '保留',
  'unhold': '保留解除',
  'unconfirm': '確認取消',
};

/**
 * 构建状态更新的 MongoDB payload / ステータス更新のMongoDBペイロードを構築
 *
 * @throws ValidationError - 无效的action或statusType / 無効なactionまたはstatusType
 */
const buildStatusUpdatePayload = (input: StatusActionInput): Record<string, any> => {
  const { action, statusType } = input;
  const now = new Date();

  if (action === 'mark-print-ready') {
    return { $set: { 'status.confirm.isConfirmed': true, 'status.confirm.confirmedAt': now, updatedAt: now } };
  }
  if (action === 'mark-printed') {
    return { $set: { 'status.printed.isPrinted': true, 'status.printed.printedAt': now, updatedAt: now } };
  }
  if (action === 'mark-shipped') {
    return { $set: { 'status.shipped.isShipped': true, 'status.shipped.shippedAt': now, updatedAt: now } };
  }
  if (action === 'mark-ec-exported') {
    return { $set: { 'status.ecExported.isExported': true, 'status.ecExported.exportedAt': now, updatedAt: now } };
  }
  if (action === 'mark-inspected') {
    return { $set: { 'status.inspected.isInspected': true, 'status.inspected.inspectedAt': now, updatedAt: now } };
  }
  if (action === 'mark-held') {
    return { $set: { 'status.held.isHeld': true, 'status.held.heldAt': now, updatedAt: now } };
  }
  if (action === 'unhold') {
    return { $set: { 'status.held.isHeld': false, 'status.held.heldAt': null, updatedAt: now } };
  }
  if (action === 'unconfirm') {
    if (!statusType || typeof statusType !== 'string') {
      throw new ValidationError('Invalid request: statusType is required for unconfirm action');
    }
    const fieldMap = STATUS_FIELD_MAP[statusType];
    if (!fieldMap) {
      throw new ValidationError(
        `Invalid statusType: ${statusType}. Supported types: ${Object.keys(STATUS_FIELD_MAP).join(', ')}`
      );
    }
    return { $set: { [fieldMap.isField]: false, [fieldMap.atField]: null, updatedAt: now } };
  }

  throw new ValidationError(
    `Invalid action: ${action}. Supported actions: mark-print-ready, mark-printed, mark-shipped, mark-ec-exported, mark-inspected, mark-held, unhold, unconfirm`
  );
};

/**
 * 触发状态变更相关的异步副作用 / ステータス変更に関連する非同期副作用をトリガー
 * (auto-processing, stock hooks, extension events)
 */
const emitStatusSideEffects = (action: string, statusType: string | undefined, orderIds: string[], updatedOrders?: any[]): void => {
  // Auto-processing hook (fire-and-forget)
  const actionEventMap: Record<string, string> = {
    'mark-print-ready': 'order.confirmed',
    'mark-printed': 'order.printed',
    'mark-shipped': 'order.shipped',
    'mark-ec-exported': 'order.ecExported',
    'mark-inspected': 'order.inspected',
  };
  const triggerEvent = actionEventMap[action];
  if (triggerEvent) {
    processOrderEventBulk(orderIds, triggerEvent as any).catch((err: unknown) => logger.error(err));
  }

  // Stock hooks (fire-and-forget)
  // 引当は出荷作業画面から手動実行（mark-print-ready では自動引当しない）
  if (action === 'mark-shipped') {
    (async () => {
      for (const id of orderIds) {
        await completeStockForOrder(id).catch((err: unknown) => logger.error(err));
      }
    })().catch((err: unknown) => logger.error(err));
  } else if (action === 'unconfirm' && statusType === 'confirm') {
    (async () => {
      for (const id of orderIds) {
        await unreserveStockForOrder(id).catch((err: unknown) => logger.error(err));
      }
    })().catch((err: unknown) => logger.error(err));
  }

  // 扩展系统事件 / 拡張システムイベント
  const extensionEventMap: Record<string, string> = {
    'mark-print-ready': HOOK_EVENTS.ORDER_CONFIRMED,
    'mark-shipped': HOOK_EVENTS.ORDER_SHIPPED,
    'mark-held': HOOK_EVENTS.ORDER_HELD,
    'unhold': HOOK_EVENTS.ORDER_UNHELD,
  };
  const extEvent = extensionEventMap[action];
  if (extEvent) {
    for (let i = 0; i < orderIds.length; i++) {
      const orderId = orderIds[i];
      const order = updatedOrders?.[i];
      extensionManager.emit(extEvent as any, { orderId, ...(order ? { order } : {}) }).catch((err: unknown) => logger.error(err));
    }
  }
  if (action === 'unconfirm' && statusType === 'confirm') {
    for (const orderId of orderIds) {
      extensionManager.emit(HOOK_EVENTS.ORDER_CANCELLED, { orderId, reason: 'unconfirm' }).catch((err: unknown) => logger.error(err));
    }
  }
};

/**
 * 更新单个订单状态 / 単一注文ステータス更新
 *
 * @throws ValidationError - 无效ID或action / 無効なIDまたはaction
 * @throws NotFoundError - 订单不存在 / 注文が存在しない
 */
export const updateOrderStatus = async (
  id: string,
  input: StatusActionInput,
): Promise<any> => {
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid id');
  }

  if (!input.action || typeof input.action !== 'string') {
    throw new ValidationError('Invalid request: action is required');
  }

  const updatePayload = buildStatusUpdatePayload(input);

  const updated = await ShipmentOrder.findByIdAndUpdate(
    id,
    updatePayload,
    { new: true },
  ).lean();

  if (!updated) {
    throw new NotFoundError('Order not found');
  }

  // 异步副作用 / 非同期副作用
  emitStatusSideEffects(input.action, input.statusType, [id], [updated]);

  // 運賃自動計算 / 运费自动计算 (fire-and-forget)
  if (input.action === 'mark-print-ready') {
    (async () => {
      try {
        const { ShippingRate } = await import('@/models/shippingRate');

        // 既にコストが設定済みならスキップ / 已有费用则跳过
        const order = await ShipmentOrder.findById(id).lean();
        if (!order || order.shippingCost) return;

        // 商品から合計重量を算出 / 从商品计算总重量
        let totalWeight = 0;
        for (const prod of order.products || []) {
          const product = await Product.findOne({ sku: prod.productSku || prod.inputSku }).lean();
          if (product?.weight) totalWeight += product.weight * (prod.quantity || 1);
        }

        // マッチする料金プランを検索 / 搜索匹配的费率方案
        const now = new Date();
        const rates = await ShippingRate.find({
          carrierId: order.carrierId,
          isActive: true,
        }).sort({ basePrice: 1 }).lean();

        const matchedRate = rates.find((rate) => {
          // 有効期間チェック / 有效期间检查
          if (rate.validFrom && new Date(rate.validFrom) > now) return false;
          if (rate.validTo && new Date(rate.validTo) < now) return false;

          // サイズ条件チェック / 尺寸条件检查
          if (rate.sizeType === 'weight') {
            if (rate.sizeMin !== undefined && totalWeight < rate.sizeMin) return false;
            if (rate.sizeMax !== undefined && totalWeight > rate.sizeMax) return false;
          }
          // flat タイプはサイズ条件なし / flat类型无尺寸条件

          return true;
        });

        if (matchedRate) {
          const isCool = order.coolType === '1' || order.coolType === '2';
          const breakdown = {
            base: matchedRate.basePrice,
            cool: isCool ? matchedRate.coolSurcharge : 0,
            cod: 0,
            fuel: matchedRate.fuelSurcharge || 0,
            other: 0,
          };
          const totalCost = breakdown.base + breakdown.cool + breakdown.cod + breakdown.fuel + breakdown.other;

          await ShipmentOrder.updateOne(
            { _id: id },
            { $set: { shippingCost: totalCost, shippingCostBreakdown: breakdown, costSource: 'auto', costCalculatedAt: new Date() } },
          );
        }
      } catch (e) {
        // fire-and-forget: ログのみ / ログのみ
        logger.warn({ err: e }, '運賃自動計算に失敗しました / 运费自动计算失败');
      }
    })();
  }

  // 操作ログ / 操作日志 (fire-and-forget)
  const actionLabel = STATUS_ACTION_LABELS[input.action] || input.action;
  logOperation({
    action: 'order_update',
    description: `${actionLabel}: ${updated.orderNumber}`,
    referenceNumber: updated.orderNumber,
    referenceType: 'shipmentOrder',
    referenceId: id,
  }).catch(() => {});

  // 自動チャージ: 出荷確認 / 自动收费: 出货确认 (fire-and-forget)
  if (input.action === 'mark-print-ready') {
    createAutoCharge({
      tenantId: updated.tenantId || 'default',
      clientId: updated.orderSourceCompanyId,
      chargeType: 'outbound_handling',
      referenceType: 'shipmentOrder',
      referenceId: id,
      referenceNumber: updated.orderNumber,
      quantity: 1,
      description: `出荷作業料: ${updated.orderNumber}`,
    }).catch(() => {});
  }

  // 自動チャージ: 検品完了 / 自动收费: 检品完了 (fire-and-forget)
  if (input.action === 'mark-inspected') {
    createAutoCharge({
      tenantId: updated.tenantId || 'default',
      chargeType: 'inspection',
      referenceType: 'shipmentOrder',
      referenceId: id,
      referenceNumber: updated.orderNumber,
      quantity: updated.products?.length || 1,
      description: `検品料: ${updated.orderNumber}`,
    }).catch(() => {});
  }

  return updated;
};

/**
 * 批量更新订单状态 / 注文ステータス一括更新
 *
 * @throws ValidationError - 无效ID或action / 無効なIDまたはaction
 */
export const updateOrderStatusBulk = async (
  ids: string[],
  input: StatusActionInput,
): Promise<StatusBulkResult> => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('Invalid request: ids array is required');
  }

  if (!input.action || typeof input.action !== 'string') {
    throw new ValidationError('Invalid request: action is required');
  }

  const validIds = ids.filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id));

  if (validIds.length === 0) {
    throw new ValidationError('No valid ids provided');
  }

  const updatePayload = buildStatusUpdatePayload(input);
  const objectIds = validIds.map((id: string) => new mongoose.Types.ObjectId(id));

  const result = await ShipmentOrder.updateMany(
    { _id: { $in: objectIds } },
    updatePayload,
  );

  // 异步副作用 / 非同期副作用
  emitStatusSideEffects(input.action, input.statusType, validIds);

  // 操作ログ / 操作日志 (fire-and-forget)
  const bulkActionLabel = STATUS_ACTION_LABELS[input.action] || input.action;
  logOperation({
    action: 'order_update',
    description: `一括${bulkActionLabel}: ${result.modifiedCount}件`,
    referenceType: 'shipmentOrder',
    quantity: result.modifiedCount,
  }).catch(() => {});

  return {
    action: input.action,
    statusType: input.action === 'unconfirm' ? input.statusType : undefined,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    requestedCount: validIds.length,
  };
};

/**
 * 批量更新订单字段 / 注文フィールドの一括更新
 *
 * @throws ValidationError - 输入验证失败时 / 入力バリデーション失敗時
 */
export const bulkUpdateOrders = async (
  ids: string[],
  updates: Record<string, any>,
): Promise<{ matchedCount: number; modifiedCount: number }> => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('Invalid request: ids array is required');
  }

  if (!updates || typeof updates !== 'object') {
    throw new ValidationError('Invalid request: updates object is required');
  }

  const validIds = ids.filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id));

  if (validIds.length === 0) {
    throw new ValidationError('No valid ids provided');
  }

  // 保护字段过滤 / 保護フィールドフィルタリング
  const updateFields: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (PROTECTED_FIELDS_BULK_UPDATE.includes(key)) continue;
    updateFields[key] = value;
  }

  if (Object.keys(updateFields).length === 0) {
    throw new ValidationError('No valid update fields provided');
  }

  const now = new Date();
  const updatePayload: any = {
    $set: { ...updateFields, updatedAt: now },
  };

  const result = await ShipmentOrder.updateMany(
    { _id: { $in: validIds.map((id: string) => new mongoose.Types.ObjectId(id)) } },
    updatePayload,
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
};

/** 搜索查询参数 / 検索クエリパラメータ */
export interface SearchOrdersParams {
  filters: FilterPayload;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  /** 是否包含 page 参数（影响返回格式） / pageパラメータの有無（返却フォーマットに影響） */
  paginated: boolean;
}

/** 搜索结果 / 検索結果 */
export type SearchOrdersResult =
  | { mode: 'list'; items: any[] }
  | { mode: 'paginated'; items: any[]; total: number; page: number; limit: number };

/**
 * 搜索订单（构建 MongoDB 查询并返回分页结果） / 注文検索（MongoDBクエリを構築し、ページネーション結果を返却）
 */
export const searchOrders = async (params: SearchOrdersParams): Promise<SearchOrdersResult> => {
  const mongoQuery = buildMongoQueryFromFilters(params.filters);

  const allowedSortFields = new Set([
    'createdAt',
    'updatedAt',
    'sourceOrderAt',
    'shipPlanDate',
    'orderNumber',
    'carrierId',
    'recipient.name',
    'recipient.phone',
    'recipient.postalCode',
  ]);

  const sortBy = typeof params.sortBy === 'string' && allowedSortFields.has(params.sortBy)
    ? params.sortBy
    : 'orderNumber';
  const sortOrder = params.sortOrder === 'desc' ? -1 : 1;
  const isOrderNumberSort = sortBy === 'orderNumber';

  // 非分页模式 / ページネーションなしモード
  if (!params.paginated) {
    let query = ShipmentOrder.find(mongoQuery).select(LIGHT_PROJECTION);
    if (params.limit) query = query.limit(params.limit);
    const items = await query.lean();

    if (isOrderNumberSort) {
      items.sort((a, b) => {
        const result = naturalSort(a.orderNumber, b.orderNumber);
        return sortOrder === 1 ? result : -result;
      });
    } else {
      const getVal = (obj: any, path: string): any => {
        const parts = path.split('.');
        let cur = obj;
        for (const p of parts) {
          if (cur == null) return undefined;
          cur = cur[p];
        }
        return cur;
      };
      items.sort((a: any, b: any) => {
        const aVal = getVal(a, sortBy);
        const bVal = getVal(b, sortBy);
        if (aVal === null || aVal === undefined) return sortOrder === 1 ? -1 : 1;
        if (bVal === null || bVal === undefined) return sortOrder === 1 ? 1 : -1;
        if (aVal < bVal) return sortOrder === 1 ? -1 : 1;
        if (aVal > bVal) return sortOrder === 1 ? 1 : -1;
        return 0;
      });
    }

    return { mode: 'list', items };
  }

  // 分页模式 / ページネーションモード
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  // orderNumber の自然順ソートは MongoDB の numericOrdering collation を使用
  // 全量ロード不要で、DB側でページネーション可能
  // orderNumber自然排序使用MongoDB的numericOrdering collation，无需全量加载
  const skip = (page - 1) * limit;
  const sortField = isOrderNumberSort ? 'orderNumber' : sortBy;
  const collation = isOrderNumberSort ? { locale: 'ja', numericOrdering: true } : undefined;

  const [items, total] = await Promise.all([
    ShipmentOrder.find(mongoQuery)
      .select(LIGHT_PROJECTION)
      .sort({ [sortField]: sortOrder })
      .collation(collation || { locale: 'ja' })
      .skip(skip)
      .limit(limit)
      .lean(),
    ShipmentOrder.countDocuments(mongoQuery),
  ]);

  return { mode: 'paginated', items, total, page, limit };
};

/**
 * 获取单个订单 / 単一注文の取得
 *
 * @throws ValidationError - 无效ID / 無効なID
 * @throws NotFoundError - 订单不存在 / 注文が存在しない
 */
export const getOrderById = async (id: string): Promise<any> => {
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid id');
  }

  const item = await ShipmentOrder.findById(id).lean();
  if (!item) {
    throw new NotFoundError('Order not found');
  }
  return item;
};

/**
 * 根据ID批量获取订单 / IDによる注文一括取得
 *
 * @throws ValidationError - 输入验证失败 / 入力バリデーション失敗
 */
export const getOrdersByIds = async (
  ids: string[],
  includeRawData?: boolean,
): Promise<{ items: any[]; total: number }> => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('Invalid request: ids array is required');
  }

  const validIds = ids.filter(
    (id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
  );

  if (validIds.length === 0) {
    throw new ValidationError('No valid ids provided');
  }

  const query = ShipmentOrder.find({
    _id: { $in: validIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
  });

  if (!includeRawData) {
    query.select(LIGHT_PROJECTION);
  }

  const orders = await query.lean();
  return { items: orders, total: orders.length };
};
