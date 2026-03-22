// 在庫台帳サービス / 库存台账服务
import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, SQL, gte, lte } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { inventoryLedger } from '../database/schema/inventory.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  productId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

interface SummaryQuery {
  productId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class InventoryLedgerService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 在庫台帳一覧取得（テナント分離・ページネーション・フィルタ）/ 获取库存台账列表（租户隔离・分页・筛选）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(inventoryLedger.tenantId, tenantId),
    ];

    if (query.productId) {
      conditions.push(eq(inventoryLedger.productId, query.productId));
    }
    if (query.type) {
      conditions.push(eq(inventoryLedger.type, query.type));
    }
    if (query.startDate) {
      conditions.push(gte(inventoryLedger.createdAt, new Date(query.startDate)));
    }
    if (query.endDate) {
      conditions.push(lte(inventoryLedger.createdAt, new Date(query.endDate)));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(inventoryLedger).where(where).limit(limit).offset(offset).orderBy(inventoryLedger.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(inventoryLedger).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 在庫台帳サマリー取得（タイプ別集計）/ 获取库存台账汇总（按类型汇总）
  async getSummary(tenantId: string, query: SummaryQuery) {
    const conditions: SQL[] = [
      eq(inventoryLedger.tenantId, tenantId),
    ];

    if (query.productId) {
      conditions.push(eq(inventoryLedger.productId, query.productId));
    }
    if (query.startDate) {
      conditions.push(gte(inventoryLedger.createdAt, new Date(query.startDate)));
    }
    if (query.endDate) {
      conditions.push(lte(inventoryLedger.createdAt, new Date(query.endDate)));
    }

    const where = and(...conditions);

    // タイプ別集計 / 按类型汇总
    const summary = await this.db
      .select({
        type: inventoryLedger.type,
        totalQuantity: sql<number>`sum(${inventoryLedger.quantity})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(inventoryLedger)
      .where(where)
      .groupBy(inventoryLedger.type);

    return { summary };
  }

  // 在庫台帳エクスポート（CSV形式のバッファを返す）/ 库存台账导出（返回CSV格式buffer）
  async exportLedger(tenantId: string) {
    const items = await this.db
      .select()
      .from(inventoryLedger)
      .where(eq(inventoryLedger.tenantId, tenantId))
      .orderBy(inventoryLedger.createdAt);

    const headers = ['productId', 'productSku', 'type', 'quantity', 'referenceType', 'referenceNumber', 'reason', 'executedAt', 'createdAt'];
    const csvLines = [headers.join(',')];

    for (const item of items) {
      const row = headers.map((h) => {
        const val = (item as Record<string, unknown>)[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      });
      csvLines.push(row.join(','));
    }

    return {
      filename: `inventory-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: 'text/csv',
      data: csvLines.join('\n'),
      totalRows: items.length,
    };
  }
}
