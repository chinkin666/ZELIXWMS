import type { Request, Response } from 'express';
import { createOrderSchema, orderDocumentSchema } from '@/schemas/orderSchema';
import { z } from 'zod';
import { assignOrderNumbers } from '@/services/shipmentOrderService';
import { ShipmentOrder, calculateProductsMeta } from '@/models/shipmentOrder';
import { Carrier } from '@/models/carrier';
import { OrderSourceCompany } from '@/models/orderSourceCompany';
import { Product } from '@/models/product';
import { naturalSort } from '@/utils/naturalSort';
import { fetchYamatoSortCodeBatchByPostcode, type YamatoCalcBatchByPostcodeItem } from '@/services/yamatoCalcService';
import mongoose from 'mongoose';
import { processOrderEvent, processOrderEventBulk } from '@/services/autoProcessingEngine';
import { isBuiltInCarrierId, getBuiltInCarrier } from '@/data/builtInCarriers';
import { reserveStockForOrder, completeStockForOrder, unreserveStockForOrder } from '@/services/stockService';
/**
 * 軽量クエリ用の projection（原始データを除外）
 * - listOrders (列表查询) で使用
 * - getOrdersByIds で includeRawData=false 时使用
 */
const LIGHT_PROJECTION = {
  sourceRawRows: 0,
  carrierRawRow: 0,
};

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

const filterPayloadSchema: z.ZodType<FilterPayload> = z.record(
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
 * 
 * 例如：用户输入 "2024/01/01" 
 *   - 日本时间范围：2024-01-01 00:00:00 JST 到 2024-01-01 23:59:59.999 JST
 *   - UTC 时间范围：2023-12-31 15:00:00 UTC 到 2024-01-01 14:59:59.999 UTC
 * 
 * MongoDB 存储的是 UTC 时间，所以需要将 JST 日期范围转换为 UTC 日期范围进行查询
 */
const localDayToDateRange = (
  dateOnly: string,
): { start: Date; end: Date } | null => {
  const parts = parseYmd(dateOnly);
  if (!parts) return null;
  
  // JST (Japan Standard Time) is UTC+9, 所以 JST 时间 = UTC 时间 + 9小时
  // 因此 UTC 时间 = JST 时间 - 9小时
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000; // 9 小时的毫秒数
  
  // 使用 Date.UTC 创建 UTC 时间点（代表用户输入的日期的 00:00:00）
  // 然后减去 9 小时得到对应的 JST 时间的 UTC 表示
  const utcMidnight = Date.UTC(parts.y, parts.m - 1, parts.d, 0, 0, 0, 0);
  const utcEndOfDay = Date.UTC(parts.y, parts.m - 1, parts.d, 23, 59, 59, 999);
  
  // 将 UTC 时间减去 9 小时，得到 JST 日期范围的 UTC 表示
  const start = new Date(utcMidnight - JST_OFFSET_MS);
  const end = new Date(utcEndOfDay - JST_OFFSET_MS);
  
  return { start, end };
};

// normalizeDateOp は現在不要（各相対日付演算子は buildMongoQueryFromFilters 内で直接処理される）

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

const buildMongoQueryFromFilters = (filters: FilterPayload): Record<string, any> => {
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
  // ObjectId fields (Mongo stores as ObjectId, but some legacy inserts may have stored string values)
  const objectIdFields = new Set<string>(['_id', 'carrierId']);

  /**
   * IMPORTANT:
   * - Mongoose casts query values based on schema type.
   * - For ObjectId-typed paths, even a plain string value like "693a..." will be cast to ObjectId,
   *   which will NOT match documents where the field is stored as a string in Mongo.
   * - To support both storage types reliably, we compare via $expr + $toString on the field value.
   */
  const buildObjectIdEqualsExpr = (field: string, raw: any) => {
    const s = typeof raw === 'string' ? raw.trim() : raw instanceof mongoose.Types.ObjectId ? raw.toHexString() : String(raw ?? '').trim();
    if (!s) return null;
    return { $expr: { $eq: [{ $toString: `$${field}` }, s] } };
  };

  const buildObjectIdNotEqualsExpr = (field: string, raw: any) => {
    const s = typeof raw === 'string' ? raw.trim() : raw instanceof mongoose.Types.ObjectId ? raw.toHexString() : String(raw ?? '').trim();
    if (!s) return null;
    // If field is missing/null, treat it as "not equals" (match), and avoid $toString on null.
    return {
      $or: [
        { [field]: { $exists: false } },
        { [field]: null },
        { $expr: { $ne: [{ $toString: `$${field}` }, s] } },
      ],
    };
  };

  for (const [field, cond] of Object.entries(filters || {})) {
    const op = cond?.operator as Operator;
    const value = (cond as any)?.value;

    if (!field || typeof field !== 'string') continue;

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
          // When querying for false, also match documents where field doesn't exist or is null
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
          // "not false" means explicitly true
          and.push({ [field]: true });
        } else {
          // "not true" means false or not exists
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
      // SearchForm sends date-only strings (YYYY/MM/DD) for date pickers; 不进行时区转换
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
      const _normalize = (s: string) => s.trim().replace(/-/g, '/');
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
          // Works for YYYY/MM/DD lexicographical ordering.
          and.push({ [field]: { $gte: aa, $lte: bb } });
        }
        continue;
      }

      if (typeof value === 'string' && (op === 'equals' || op === 'is' || op === 'today' || op === 'yesterday')) {
        const v = asYmd(value);
        if (v) {
          // Accept both YYYY/MM/DD and YYYY-MM-DD stored formats.
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

    // ObjectId fields: accept either ObjectId or string stored values.
    if (objectIdFields.has(field)) {
      if (op === 'is' || op === 'equals') {
        if (isBlank(value)) continue;
        // Support array of values for 'in' operator or when value is an array
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
        // Support 'in' operator for multiple values
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
      // contains/notContains are not meaningful for ObjectId fields; ignore.
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
        // 部分匹配：使用正则表达式匹配数组中的任何元素（大小写不敏感）
        const re = new RegExp(escapeRegex(q), 'i');
        and.push({ '_productsMeta.names': re });
      } else if (op === 'is') {
        // 完全匹配：数组中有完全相等的元素（大小写不敏感，使用正则表达式）
        // MongoDB 的数组直接匹配是大小写敏感的，所以使用正则表达式 ^value$ 来实现大小写不敏感的完全匹配
        const trimmedQ = q.trim();
        const re = new RegExp(`^${escapeRegex(trimmedQ)}$`, 'i');
        and.push({ '_productsMeta.names': re });
      } else if (op === 'notContains') {
        // 不包含：数组中没有任何元素包含目标字符串
        const re = new RegExp(escapeRegex(q), 'i');
        and.push({ $nor: [{ '_productsMeta.names': re }] });
      } else if (op === 'isNot') {
        // 不等于：数组中没有任何元素等于目标字符串（大小写不敏感）
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
        // 部分匹配：使用正则表达式匹配数组中的任何元素（大小写不敏感）
        const re = new RegExp(escapeRegex(q), 'i');
        and.push({ '_productsMeta.skus': re });
      } else if (op === 'is') {
        // 完全匹配：数组中有完全相等的元素（大小写不敏感，使用正则表达式）
        // MongoDB 的数组直接匹配是大小写敏感的，所以使用正则表达式 ^value$ 来实现大小写不敏感的完全匹配
        const trimmedQ = q.trim();
        const re = new RegExp(`^${escapeRegex(trimmedQ)}$`, 'i');
        and.push({ '_productsMeta.skus': re });
      } else if (op === 'notContains') {
        // 不包含：数组中没有任何元素包含目标字符串
        const re = new RegExp(escapeRegex(q), 'i');
        and.push({ $nor: [{ '_productsMeta.skus': re }] });
      } else if (op === 'isNot') {
        // 不等于：数组中没有任何元素等于目标字符串（大小写不敏感）
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
        // 部分匹配：使用正则表达式匹配数组中的任何元素（大小写不敏感）
        const re = new RegExp(escapeRegex(q), 'i');
        and.push({ '_productsMeta.barcodes': re });
      } else if (op === 'is') {
        // 完全匹配：数组中有完全相等的元素（大小写不敏感，使用正则表达式）
        const trimmedQ = q.trim();
        const re = new RegExp(`^${escapeRegex(trimmedQ)}$`, 'i');
        and.push({ '_productsMeta.barcodes': re });
      } else if (op === 'notContains') {
        // 不包含：数组中没有任何元素包含目标字符串
        const re = new RegExp(escapeRegex(q), 'i');
        and.push({ $nor: [{ '_productsMeta.barcodes': re }] });
      } else if (op === 'isNot') {
        // 不等于：数组中没有任何元素等于目标字符串（大小写不敏感）
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

    // Special handling: status.confirm.isConfirmed is a boolean field that may not exist
    // When filtering for false, we want to match both false and undefined (not set)
    if (field === 'status.confirm.isConfirmed' && (op === 'is' || op === 'equals')) {
      if (value === false) {
        // Match false or undefined (field doesn't exist)
        and.push({
          $or: [
            { 'status.confirm.isConfirmed': false },
            { 'status.confirm.isConfirmed': { $exists: false } },
          ],
        });
      } else if (value === true) {
        // Match only true
        and.push({ 'status.confirm.isConfirmed': true });
      }
      continue;
    }

    // Special handling: status.shipped.isShipped is a boolean field that may not exist
    // When filtering for isNot: true, we want to match false, null, and undefined (not set)
    if (field === 'status.shipped.isShipped' && (op === 'isNot' || op === 'notEquals')) {
      if (value === true) {
        // Match false, null, or undefined (field doesn't exist)
        and.push({
          $or: [
            { 'status.shipped.isShipped': false },
            { 'status.shipped.isShipped': null },
            { 'status.shipped.isShipped': { $exists: false } },
          ],
        });
      } else if (value === false) {
        // Match only true
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
    // Expected paths: ['items', i, 'clientId'] or ['items', i, 'order', 'field', ...]
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

export const createManualOrdersBulk = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as unknown as CreateOrderBulkInput;

  const now = new Date().toISOString();
  const parsed = createOrderBulkSchema.safeParse(payload);

  if (!parsed.success) {
    res.status(400).json({
      message: 'バリデーションエラー',
      errors: zodIssuesToBulkErrors(parsed.error.issues, req.body),
    });
    return;
  }

  try {
    // === 商品ID (productId) 存在性バリデーション ===
    // productIdが設定されている場合のみ、データベースに存在するか確認
    // （商品マスタ未登録SKUも許可するため、productId空はエラーとしない）
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

    // productIdが設定されているものについてのみ、データベースに存在するか確認
    if (allProductIds.size > 0) {
      const productIdArray = Array.from(allProductIds);
      const existingProducts = await Product.find(
        { _id: { $in: productIdArray } },
        { _id: 1 },
      ).lean();
      const existingIds = new Set(existingProducts.map((p) => String((p as any)._id)));

      // 存在しないproductIdがあるかチェック
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
        res.status(400).json({
          message: '商品が見つかりません',
          errors,
        });
        return;
      }
    }

    type BulkRow = {
      clientId: string;
      order: any;
    };

    // 准备订单数据（不包含orderNumber，因为会自动生成）
    const baseRows: BulkRow[] = parsed.data.items.map((item) => {
      // NOTE: createOrderBulkSchema already validates/transforms item.order via createOrderSchema.
      const order = {
        ...item.order,
        createdAt: now,
        updatedAt: now,
        status: {
          carrierReceipt: { isReceived: false },
          printed: { isPrinted: false },
        },
      };
      return {
        clientId: item.clientId,
        order,
      };
    });

    // --- hatsuBaseNo1, hatsuBaseNo2 auto fill (non-blocking) ---
    try {
      // 1) resolve OrderSourceCompany by id or senderName
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

      // 2) fill hatsuBaseNo1 and hatsuBaseNo2 from OrderSourceCompany
      // ユーザーが既に値を設定している場合は上書きしない
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
          // 既に値がない場合のみ、依頼主の情報から自動設定
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
    try {
      // Build batch request items for yamato-calc API
      const calcItems: YamatoCalcBatchByPostcodeItem[] = [];
      for (const r of baseRows) {
        const o: any = r.order;
        const destinationPostalCode = o?.recipient?.postalCode;
        const departureBaseNo = o?.carrierData?.yamato?.hatsuBaseNo1;
        // Only calculate if we have both required values and no existing sortingCode
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
        // Apply results to orders
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

    // 自动为所有订单生成订单号
    let ordersWithNumbers: any[] = [];
    try {
      ordersWithNumbers = await assignOrderNumbers(baseRows.map((r) => r.order));
    } catch (error: any) {
      // 如果生成订单号失败，所有订单都标记为失败
      for (const row of baseRows) {
        failures.push({
          clientId: row.clientId,
          message: `出荷管理Noの生成に失敗しました: ${error.message}`,
        });
      }
      res.status(500).json({
        message: '出荷管理Noの生成に失敗しました',
        data: {
          total: baseRows.length,
          successCount: 0,
          failureCount: failures.length,
          successes: [],
          failures,
        },
      });
      return;
    }

    // 将生成的订单号添加到订单数据中
    const rowsWithOrderNumbers = baseRows.map((row, index) => ({
      ...row,
      order: ordersWithNumbers[index],
    }));

    // Insert rows with unordered insert; collect per-row DB errors
    const toInsert = rowsWithOrderNumbers;
    const docs = toInsert.map((r) => r.order);

    // 为每个订单计算 _productsMeta（因为使用 collection.insertMany 会绕过 Mongoose hooks）
    const docsWithMeta = docs.map((doc) => {
      const products = doc.products || [];
      const _productsMeta = calculateProductsMeta(products);
      return {
        ...doc,
        _productsMeta,
      };
    });

    type SuccessRow = { clientId: string; insertedId: string };
    const successes: SuccessRow[] = [];

    // Fast path: nothing to insert
    if (docsWithMeta.length === 0) {
      const status = failures.length > 0 ? 207 : 201;
      res.status(status).json({
        message: failures.length > 0 ? `登録: 成功0件 / 失敗${failures.length}件` : '注文が正常に作成されました',
        data: {
          total: baseRows.length,
          successCount: 0,
          failureCount: failures.length,
          successes,
          failures,
        },
      });
      return;
    }

    let insertedIds: Record<string, any> = {};
    let writeErrors: Array<{ index: number; code?: number; errmsg?: string; message?: string }> = [];

    try {
      const r: any = await (ShipmentOrder as any).collection.insertMany(docsWithMeta, { ordered: false });
      insertedIds = r?.insertedIds ?? {};
    } catch (e: any) {
      // MongoBulkWriteError (unordered) still contains partial success information.
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

      // Duplicate key (likely orderNumber unique index on DB side)
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

    // If both success and failure exist, return 207 (still ok for fetch()) so frontend can remove successful rows.
    const status = failures.length > 0 ? 207 : 201;
    res.status(status).json({
      message: failures.length > 0 ? `登録: 成功${successes.length}件 / 失敗${failures.length}件` : '注文が正常に作成されました',
      data: {
        total: baseRows.length,
        successCount: successes.length,
        failureCount: failures.length,
        successes,
        failures,
      },
    });

    // Auto-processing hook (fire-and-forget) for newly created orders
    const createdIds = successes.map((s: any) => s.insertedId).filter(Boolean);
    if (createdIds.length > 0) {
      processOrderEventBulk(createdIds, 'order.created').catch(console.error);
    }
  } catch (error: any) {
    // Keep previous behavior for unexpected failures (request-level errors).
    if (error?.name === 'ZodError') {
      res.status(400).json({
        message: 'バリデーションエラー',
        errors: zodIssuesToBulkErrors(error.errors ?? [], req.body),
      });
      return;
    }
    res.status(500).json({
      message: 'サーバーエラーが発生しました',
      error: error?.message,
    });
  }
};


export const listOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const limitRaw = req.query?.limit ?? req.query?.pageSize;
    const pageRaw = req.query?.page;
    const sortByRaw = req.query?.sortBy;
    const sortOrderRaw = req.query?.sortOrder;
    // 不再使用时区偏移，直接使用本地时间

    // 如果没有提供 page 参数，返回所有数据（用于前端分页）
    const hasPageParam = pageRaw !== undefined && pageRaw !== null && pageRaw !== '';
    const page = hasPageParam ? (typeof pageRaw === 'string' ? Math.max(Number(pageRaw) || 1, 1) : 1) : 1;
    // limit は page の有無にかかわらず適用（過大レスポンス防止）
    const parsedLimit = typeof limitRaw === 'string'
      ? Math.min(Math.max(Number(limitRaw) || 10, 1), 5000)
      : typeof limitRaw === 'number'
        ? Math.min(Math.max(limitRaw || 10, 1), 5000)
        : undefined;
    const limit = hasPageParam ? (parsedLimit ?? 10) : parsedLimit;

    // 不再使用时区偏移，直接使用本地时间

    const qRaw = req.query?.q;
    let filters: FilterPayload = {};
    if (typeof qRaw === 'string' && qRaw.trim()) {
      try {
        const parsed = JSON.parse(qRaw);
        const validated = filterPayloadSchema.safeParse(parsed);
        if (validated.success) {
          filters = validated.data as any;
        }
      } catch {
        // ignore bad q
      }
    }

    const mongoQuery = buildMongoQueryFromFilters(filters);

    // Whitelist sort fields to avoid unexpected injections.
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

    // 默认使用 orderNumber 排序（如果没有指定排序）
    const sortBy = typeof sortByRaw === 'string' && allowedSortFields.has(sortByRaw) ? sortByRaw : 'orderNumber';
    const sortOrder = sortOrderRaw === 'asc' ? 1 : sortOrderRaw === 'desc' ? -1 : 1; // 默认升序

    // orderNumber 字段需要特殊处理（自然排序）
    const isOrderNumberSort = sortBy === 'orderNumber';

    // 如果没有 page 参数，返回所有数据
    if (!hasPageParam) {
      let query = ShipmentOrder.find(mongoQuery).select(LIGHT_PROJECTION);
      if (limit) query = query.limit(limit);
      const items = await query.lean();

      // 如果是 orderNumber 排序，使用自然排序
      if (isOrderNumberSort) {
        items.sort((a, b) => {
          const result = naturalSort(a.orderNumber, b.orderNumber);
          return sortOrder === 1 ? result : -result;
        });
      } else {
        // 其他字段使用内存排序（支持嵌套字段）
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

      res.json(items); // 直接返回数组，兼容前端 fetchShipmentOrders 的解析逻辑
      return;
    }

    // 有 page 参数时，进行分页
    // 对于 orderNumber 排序，需要先获取所有数据，然后排序，再分页
    if (isOrderNumberSort) {
      const allItems = await ShipmentOrder.find(mongoQuery).select(LIGHT_PROJECTION).lean();
      
      // 自然排序
      allItems.sort((a, b) => {
        const result = naturalSort(a.orderNumber, b.orderNumber);
        return sortOrder === 1 ? result : -result;
      });
      
      // 手动分页
      const skip = (page - 1) * limit!;
      const items = allItems.slice(skip, skip + limit!);
      const total = allItems.length;
      
      res.json({ items, total, page, limit });
      return;
    }

    // 其他字段使用 MongoDB 排序和分页
    const skip = (page - 1) * limit!;

    const [items, total] = await Promise.all([
      ShipmentOrder.find(mongoQuery).select(LIGHT_PROJECTION).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit!).lean(),
      ShipmentOrder.countDocuments(mongoQuery),
    ]);

    res.json({ items, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params?.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const item = await ShipmentOrder.findById(id).lean();
    if (!item) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch order', error: error.message });
  }
};

/**
 * Status类型到字段的映射
 * 用于支持各种status操作
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

/**
 * 统一的状态操作处理函数（单个订单）
 * Route: POST /api/shipment-orders/:id/status
 * Body: { 
 *   action: 'mark-print-ready' | 'mark-printed' | 'mark-shipped' | 'unconfirm',
 *   statusType?: 'confirm' | 'carrierReceipt' | 'printed' | 'shipped' // unconfirm 时需要
 * }
 */
export const handleStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params?.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const { action, statusType } = req.body;
    
    if (!action || typeof action !== 'string') {
      res.status(400).json({ message: 'Invalid request: action is required' });
      return;
    }

    const now = new Date();
    let updatePayload: any = {};

    if (action === 'mark-print-ready') {
      updatePayload = {
        $set: {
          'status.confirm.isConfirmed': true,
          'status.confirm.confirmedAt': now,
          updatedAt: now,
      },
      };
    } else if (action === 'mark-printed') {
      updatePayload = {
        $set: {
          'status.printed.isPrinted': true,
          'status.printed.printedAt': now,
          updatedAt: now,
        },
      };
    } else if (action === 'mark-shipped') {
      updatePayload = {
        $set: {
          'status.shipped.isShipped': true,
          'status.shipped.shippedAt': now,
          updatedAt: now,
        },
      };
    } else if (action === 'mark-ec-exported') {
      updatePayload = {
        $set: {
          'status.ecExported.isExported': true,
          'status.ecExported.exportedAt': now,
          updatedAt: now,
        },
      };
    } else if (action === 'mark-inspected') {
      updatePayload = {
        $set: {
          'status.inspected.isInspected': true,
          'status.inspected.inspectedAt': now,
          updatedAt: now,
        },
      };
    } else if (action === 'mark-held') {
      updatePayload = {
        $set: {
          'status.held.isHeld': true,
          'status.held.heldAt': now,
          updatedAt: now,
        },
      };
    } else if (action === 'unhold') {
      updatePayload = {
        $set: {
          'status.held.isHeld': false,
          'status.held.heldAt': null,
          updatedAt: now,
        },
      };
    } else if (action === 'unconfirm') {
      if (!statusType || typeof statusType !== 'string') {
        res.status(400).json({ message: 'Invalid request: statusType is required for unconfirm action' });
      return;
    }

      const fieldMap = STATUS_FIELD_MAP[statusType];
      if (!fieldMap) {
        res.status(400).json({
          message: `Invalid statusType: ${statusType}. Supported types: ${Object.keys(STATUS_FIELD_MAP).join(', ')}`
        });
      return;
    }

      updatePayload = {
      $set: {
          [fieldMap.isField]: false,
          [fieldMap.atField]: null,
        updatedAt: now,
      },
    };
    } else {
      res.status(400).json({
        message: `Invalid action: ${action}. Supported actions: mark-print-ready, mark-printed, mark-shipped, mark-ec-exported, mark-inspected, mark-held, unhold, unconfirm`
      });
      return;
    }

    const updated = await ShipmentOrder.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json(updated);

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
      processOrderEvent(id, triggerEvent as any).catch(console.error);
    }

    // Stock hooks (fire-and-forget)
    // 引当は出荷作業画面から手動実行（mark-print-ready では自動引当しない）
    if (action === 'mark-shipped') {
      completeStockForOrder(String(updated._id)).catch(console.error);
    } else if (action === 'unconfirm' && statusType === 'confirm') {
      unreserveStockForOrder(String(updated._id)).catch(console.error);
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
};

/**
 * 通用的批量更新接口
 * 支持批量更新多个订单的任意字段
 * Body: { ids: string[], updates: Record<string, any> }
 */
export const bulkUpdateOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, updates } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'Invalid request: ids array is required' });
      return;
    }

    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ message: 'Invalid request: updates object is required' });
      return;
    }

    const validIds = ids.filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id));
    
    if (validIds.length === 0) {
      res.status(400).json({ message: 'No valid ids provided' });
      return;
    }

    // 保护字段：不允许批量更新这些字段
    const protectedFields = ['_id', 'orderNumber', 'createdAt', 'tenantId', 'sourceRawRows', 'carrierRawRow'];
    const updateFields: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (protectedFields.includes(key)) {
        continue; // 跳过保护字段
      }
      updateFields[key] = value;
    }

    if (Object.keys(updateFields).length === 0) {
      res.status(400).json({ message: 'No valid update fields provided' });
      return;
    }

    const now = new Date();
    
    // 构建更新 payload
    const updatePayload: any = {
      $set: {
        ...updateFields,
        updatedAt: now,
      },
    };

    const result = await ShipmentOrder.updateMany(
      { _id: { $in: validIds.map((id: string) => new mongoose.Types.ObjectId(id)) } },
      updatePayload,
    );

    res.json({
      message: 'Bulk update completed',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to bulk update orders', error: error.message });
  }
};

/**
 * 统一的状态操作处理函数（批量）
 * Route: POST /api/shipment-orders/status/bulk
 * Body: {
 *   ids: string[],
 *   action: 'mark-print-ready' | 'mark-printed' | 'mark-shipped' | 'unconfirm',
 *   statusType?: 'confirm' | 'carrierReceipt' | 'printed' | 'shipped' // unconfirm 时需要
 * }
 */
export const handleStatusBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, action, statusType } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'Invalid request: ids array is required' });
      return;
    }

    if (!action || typeof action !== 'string') {
      res.status(400).json({ message: 'Invalid request: action is required' });
      return;
    }

    const validIds = ids.filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id));
    
    if (validIds.length === 0) {
      res.status(400).json({ message: 'No valid ids provided' });
      return;
    }

    const now = new Date();
    const objectIds = validIds.map((id: string) => new mongoose.Types.ObjectId(id));
    let updatePayload: any = {};

    if (action === 'mark-print-ready') {
      updatePayload = {
        $set: {
          'status.confirm.isConfirmed': true,
          'status.confirm.confirmedAt': now,
          updatedAt: now,
        },
      };
    } else if (action === 'mark-printed') {
      updatePayload = {
        $set: {
          'status.printed.isPrinted': true,
          'status.printed.printedAt': now,
          updatedAt: now,
      },
      };
    } else if (action === 'mark-shipped') {
      updatePayload = {
        $set: {
          'status.shipped.isShipped': true,
          'status.shipped.shippedAt': now,
          updatedAt: now,
        },
      };
    } else if (action === 'mark-ec-exported') {
      updatePayload = {
        $set: {
          'status.ecExported.isExported': true,
          'status.ecExported.exportedAt': now,
          updatedAt: now,
        },
      };
    } else if (action === 'mark-inspected') {
      updatePayload = {
        $set: {
          'status.inspected.isInspected': true,
          'status.inspected.inspectedAt': now,
          updatedAt: now,
        },
      };
    } else if (action === 'mark-held') {
      updatePayload = {
        $set: {
          'status.held.isHeld': true,
          'status.held.heldAt': now,
          updatedAt: now,
        },
      };
    } else if (action === 'unhold') {
      updatePayload = {
        $set: {
          'status.held.isHeld': false,
          'status.held.heldAt': null,
          updatedAt: now,
        },
      };
    } else if (action === 'unconfirm') {
      if (!statusType || typeof statusType !== 'string') {
        res.status(400).json({ message: 'Invalid request: statusType is required for unconfirm action' });
        return;
      }

      const fieldMap = STATUS_FIELD_MAP[statusType];
      if (!fieldMap) {
        res.status(400).json({
          message: `Invalid statusType: ${statusType}. Supported types: ${Object.keys(STATUS_FIELD_MAP).join(', ')}`
        });
      return;
    }

      updatePayload = {
        $set: {
          [fieldMap.isField]: false,
          [fieldMap.atField]: null,
          updatedAt: now,
        },
      };
    } else {
      res.status(400).json({
        message: `Invalid action: ${action}. Supported actions: mark-print-ready, mark-printed, mark-shipped, mark-ec-exported, mark-inspected, mark-held, unhold, unconfirm`
      });
      return;
    }

    const result = await ShipmentOrder.updateMany(
      { _id: { $in: objectIds } },
      updatePayload,
    );

    res.json({
      message: 'Bulk status operation completed',
      action,
      statusType: action === 'unconfirm' ? statusType : undefined,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      requestedCount: validIds.length,
    });

    // Auto-processing hook (fire-and-forget, bulk)
    const bulkActionEventMap: Record<string, string> = {
      'mark-print-ready': 'order.confirmed',
      'mark-printed': 'order.printed',
      'mark-shipped': 'order.shipped',
      'mark-ec-exported': 'order.ecExported',
      'mark-inspected': 'order.inspected',
    };
    const bulkTriggerEvent = bulkActionEventMap[action];
    if (bulkTriggerEvent) {
      processOrderEventBulk(validIds, bulkTriggerEvent as any).catch(console.error);
    }

    // Stock hooks (fire-and-forget, bulk)
    // 引当は出荷作業画面から手動実行（mark-print-ready では自動引当しない）
    if (action === 'mark-shipped') {
      (async () => {
        for (const id of validIds) {
          await completeStockForOrder(id).catch(console.error);
        }
      })().catch(console.error);
    } else if (action === 'unconfirm' && statusType === 'confirm') {
      (async () => {
        for (const id of validIds) {
          await unreserveStockForOrder(id).catch(console.error);
        }
      })().catch(console.error);
    }
  } catch (error: any) {
    console.error('Error in handleStatusBulk:', error);
    res.status(500).json({
      message: 'Failed to update order status',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// =========================
// Carrier receipt import
// =========================
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
    const rawIdMap = new Map<string, any>(); // string key -> original _id value
    const carrierIdsSet = new Set<string>();
    for (const d of docs) {
      const id = String((d as any)?._id);
      docMap.set(id, d);
      rawIdMap.set(id, (d as any)?._id);
      const cid = (d as any)?.carrierId;
      if (cid) carrierIdsSet.add(String(cid));
    }

    const carrierIds = Array.from(carrierIdsSet);
    // Use native collection query to handle mixed _id types (ObjectId and string like "__builtin_yamato_b2__")
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

    // Fallback to built-in carriers for IDs not found in DB
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

    // Helper to get nested property value using dot notation path (e.g., "recipient.phone")
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
      const existingTrackingId = normalizeKey((doc as any)?.trackingId);
      if ((doc as any)?.status?.carrierReceipt?.isReceived) {
        overwrittenOrders.push(key);
      }
      const candidateTrackingId =
        extractTrackingId(rawRow as any, trackingIdColumnName) ||
        extractTrackingId(doc?.carrierRawRow as any, trackingIdColumnName);
      // Sanitize rawRow keys: MongoDB rejects keys containing '.' or starting with '$'
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
      // Use the original _id value from the document (preserves type: ObjectId or string)
      const rawId = rawIdMap.get(id) ?? id;
      ops.push({
        updateOne: {
          filter: { _id: rawId },
          update: {
            $set: setPayload,
          },
        },
      });
    }

    let updatedOrders = 0;
    if (ops.length) {
      const r = await ShipmentOrder.bulkWrite(ops, { ordered: false });
      updatedOrders = r.modifiedCount || 0;
    }

    // Collect matched order IDs for auto-processing
    const carrierMatchedIds = ops.map((op) => String((op as any).updateOne.filter._id));

    // Collect debug info for first matched order
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

export const updateOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params?.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    // 检查订单是否存在
    const existing = await ShipmentOrder.findById(id).lean();
    if (!existing) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // 不允许更新的系统字段
    const protectedFields = ['_id', 'orderNumber', 'createdAt', 'tenantId', 'status', 'sourceRawRows', 'carrierRawRow'];
    
    // 获取要更新的字段（排除系统字段和 undefined/null）
    const fieldsToValidate: Record<string, any> = {};
    for (const [key, value] of Object.entries(req.body)) {
      // 跳过系统保护字段
      if (protectedFields.includes(key)) {
        continue;
      }
      // 跳过 undefined 和 null
      if (value === undefined || value === null) {
        continue;
      }
      // 预处理：将空字符串转换为 undefined（对于可选字段）
      // Note: carrierData.yamato fields are handled by the schema validation
      const optionalStringFields = [
        'deliveryTimeSlot',
        'deliveryDatePreference',
        'orderSourceCompanyId',
        'honorific',
      ];
      if (optionalStringFields.includes(key) && typeof value === 'string' && value.trim() === '') {
        continue;
      }
      // orderer 对象：如果所有字段都是空字符串，则跳过
      if (key === 'orderer' && typeof value === 'object' && value !== null) {
        const hasNonEmptyValue = Object.values(value).some(
          (v) => typeof v === 'string' && v.trim() !== ''
        );
        if (!hasNonEmptyValue) {
          continue;
        }
      }
      fieldsToValidate[key] = value;
    }

    // 如果没有要更新的字段，直接返回现有数据
    if (Object.keys(fieldsToValidate).length === 0) {
      res.json({
        message: '注文が正常に更新されました',
        data: { order: existing },
      });
      return;
    }

    // 使用 orderDocumentSchema.partial() 验证要更新的字段
    // 所有字段都是可选的，只验证实际发送的字段
    // 注意：不需要 _id，因为 _id 是从 URL 参数获取的
    const parseResult = orderDocumentSchema.partial().safeParse(fieldsToValidate);

    if (!parseResult.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    const validatedData = parseResult.data;

    // 更新 updatedAt
    const now = new Date().toISOString();
    const fieldsToUpdate: Record<string, any> = {
      ...validatedData,
      updatedAt: now,
    };

    // 更新订单
    const updated = await ShipmentOrder.findByIdAndUpdate(
      id,
      {
        $set: fieldsToUpdate,
      },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json({
      message: '注文が正常に更新されました',
      data: { order: updated },
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'サーバーエラーが発生しました',
      error: error.message,
    });
  }
};

export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params?.id;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const deleted = await ShipmentOrder.findByIdAndDelete(id).lean();

    if (!deleted) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json({
      message: '注文が正常に削除されました',
      data: { order: deleted },
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'サーバーエラーが発生しました',
      error: error.message,
    });
  }
};

/**
 * Fetch multiple orders by IDs (POST to avoid URL length limits)
 * Route: POST /api/shipment-orders/by-ids
 * Body: { ids: string[] }
 */
export const getOrdersByIds = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, includeRawData } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'Invalid request: ids array is required' });
      return;
    }

    // Validate and filter valid ObjectIds
    const validIds = ids.filter(
      (id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
    );

    if (validIds.length === 0) {
      res.status(400).json({ message: 'No valid ids provided' });
      return;
    }

    // Fetch orders by IDs
    // includeRawData が true の場合は完整データを返す（打印用）
    // デフォルト（false）は軽量データを返す（列表查询用）
    const query = ShipmentOrder.find({
      _id: { $in: validIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
    });

    if (!includeRawData) {
      query.select(LIGHT_PROJECTION);
    }

    const orders = await query.lean();

    res.json({ items: orders, total: orders.length });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
};

/**
 * Bulk delete multiple orders by IDs
 * Route: POST /api/shipment-orders/delete/bulk
 * Body: { ids: string[] }
 */
export const deleteOrdersBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'Invalid request: ids array is required' });
      return;
    }

    // Validate and filter valid ObjectIds
    const validIds = ids.filter(
      (id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
    );

    if (validIds.length === 0) {
      res.status(400).json({ message: 'No valid ids provided' });
      return;
    }

    // Delete orders by IDs
    const result = await ShipmentOrder.deleteMany({
      _id: { $in: validIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
    });

    res.json({
      message: '注文が正常に削除されました',
      deletedCount: result.deletedCount,
      requestedCount: validIds.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete orders', error: error.message });
  }
};

