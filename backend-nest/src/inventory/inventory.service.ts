// 在庫サービス / 库存服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { locations, stockQuants, stockMoves } from '../database/schema/inventory.js';
import type { CreateLocationDto, UpdateLocationDto } from './dto/create-location.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

// ロケーション検索クエリ / 库位查询参数
interface FindLocationsQuery {
  page?: number;
  limit?: number;
  warehouseId?: string;
  type?: string;
}

// 在庫レベル検索クエリ / 库存水平查询参数
interface StockLevelsQuery {
  page?: number;
  limit?: number;
  warehouseId?: string;
  locationId?: string;
}

@Injectable()
export class InventoryService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // ========================================
  // ロケーション CRUD / 库位 CRUD
  // ========================================

  // ロケーション一覧取得（テナント分離・ページネーション・フィルタ）/ 获取库位列表（租户隔离・分页・筛选）
  async findAllLocations(tenantId: string, query: FindLocationsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(locations.tenantId, tenantId),
    ];

    if (query.warehouseId) {
      conditions.push(eq(locations.warehouseId, query.warehouseId));
    }
    if (query.type) {
      conditions.push(eq(locations.type, query.type));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(locations)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(locations.sortOrder, locations.code),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(locations)
        .where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ロケーションID検索 / 按ID查找库位
  async findLocationById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(locations)
      .where(and(
        eq(locations.id, id),
        eq(locations.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('INV_LOCATION_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // ロケーション作成（コード重複チェック付き）/ 创建库位（含编码重复检查）
  async createLocation(tenantId: string, dto: CreateLocationDto) {
    // コード重複チェック / 编码重复检查
    const existing = await this.db
      .select({ id: locations.id })
      .from(locations)
      .where(and(
        eq(locations.tenantId, tenantId),
        eq(locations.code, dto.code),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Location code: ${dto.code}`);
    }

    const rows = await this.db
      .insert(locations)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }

  // ロケーション更新 / 更新库位
  async updateLocation(tenantId: string, id: string, dto: UpdateLocationDto) {
    // 存在確認 / 确认存在
    await this.findLocationById(tenantId, id);

    // コード変更時の重複チェック / 编码变更时的重复检查
    if (dto.code) {
      const existing = await this.db
        .select({ id: locations.id })
        .from(locations)
        .where(and(
          eq(locations.tenantId, tenantId),
          eq(locations.code, dto.code),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Location code: ${dto.code}`);
      }
    }

    const rows = await this.db
      .update(locations)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(locations.id, id), eq(locations.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ロケーション削除（物理削除）/ 删除库位（硬删除）
  async removeLocation(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findLocationById(tenantId, id);

    const rows = await this.db
      .delete(locations)
      .where(and(eq(locations.id, id), eq(locations.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ========================================
  // 在庫クエリ / 库存查询
  // ========================================

  // 在庫レベル取得（商品別集計: 合計/予約/利用可能）/ 获取库存水平（按商品汇总: 总量/预约/可用）
  async getStockLevels(tenantId: string, query: StockLevelsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(stockQuants.tenantId, tenantId),
    ];

    if (query.warehouseId) {
      // 倉庫IDでフィルタ（ロケーション経由）/ 通过库位按仓库ID筛选
      conditions.push(
        sql`${stockQuants.locationId} IN (
          SELECT ${locations.id} FROM ${locations}
          WHERE ${locations.warehouseId} = ${query.warehouseId}
        )`,
      );
    }
    if (query.locationId) {
      conditions.push(eq(stockQuants.locationId, query.locationId));
    }

    const where = and(...conditions);

    // 商品別に在庫を集計 / 按商品汇总库存
    const [items, countResult] = await Promise.all([
      this.db
        .select({
          productId: stockQuants.productId,
          totalQuantity: sql<number>`sum(${stockQuants.quantity})::int`,
          reservedQuantity: sql<number>`sum(${stockQuants.reservedQuantity})::int`,
          availableQuantity: sql<number>`(sum(${stockQuants.quantity}) - sum(${stockQuants.reservedQuantity}))::int`,
        })
        .from(stockQuants)
        .where(where)
        .groupBy(stockQuants.productId)
        .limit(limit)
        .offset(offset)
        .orderBy(stockQuants.productId),
      this.db
        .select({ count: sql<number>`count(DISTINCT ${stockQuants.productId})::int` })
        .from(stockQuants)
        .where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 商品別在庫詳細（ロケーション別）/ 按商品查看库存详情（按库位）
  async getStockByProduct(tenantId: string, productId: string) {
    const rows = await this.db
      .select({
        id: stockQuants.id,
        locationId: stockQuants.locationId,
        lotId: stockQuants.lotId,
        quantity: stockQuants.quantity,
        reservedQuantity: stockQuants.reservedQuantity,
        availableQuantity: sql<number>`(${stockQuants.quantity} - ${stockQuants.reservedQuantity})::int`,
        lastMovedAt: stockQuants.lastMovedAt,
      })
      .from(stockQuants)
      .where(and(
        eq(stockQuants.tenantId, tenantId),
        eq(stockQuants.productId, productId),
      ))
      .orderBy(stockQuants.locationId);

    return {
      productId,
      locations: rows,
      totalQuantity: rows.reduce((sum: number, r: any) => sum + (r.quantity ?? 0), 0),
      totalReserved: rows.reduce((sum: number, r: any) => sum + (r.reservedQuantity ?? 0), 0),
      totalAvailable: rows.reduce((sum: number, r: any) => sum + (r.availableQuantity ?? 0), 0),
    };
  }

  // ========================================
  // 在庫操作 / 库存操作
  // ========================================

  // 在庫調整（stockMoves挿入 + stockQuants更新）/ 库存调整（插入stockMoves + 更新stockQuants）
  async adjustStock(tenantId: string, body: { productId: string; locationId: string; quantity: number; reason?: string }) {
    const { productId, locationId, quantity, reason } = body;

    if (!productId || !locationId || quantity === undefined) {
      throw new WmsException('VALIDATION_ERROR', 'productId, locationId, quantity are required');
    }

    const now = new Date();
    const moveNumber = `ADJ-${Date.now()}`;

    // stockMoves に調整レコード挿入 / 在stockMoves中插入调整记录
    const [move] = await this.db.insert(stockMoves).values({
      tenantId,
      moveNumber,
      moveType: 'adjustment',
      status: 'done',
      productId,
      toLocationId: locationId,
      quantity,
      referenceType: 'adjustment',
      reason: reason ?? '',
      executedAt: now,
    }).returning();

    // stockQuants を upsert / upsert stockQuants
    await this.db.execute(sql`
      INSERT INTO stock_quants (tenant_id, product_id, location_id, quantity, updated_at, last_moved_at)
      VALUES (${tenantId}, ${productId}, ${locationId}, ${quantity}, ${now}, ${now})
      ON CONFLICT (tenant_id, product_id, location_id, lot_id)
      DO UPDATE SET
        quantity = stock_quants.quantity + ${quantity},
        updated_at = ${now},
        last_moved_at = ${now}
    `);

    return { move, message: 'Stock adjusted / 在庫調整完了 / 库存调整完成' };
  }

  // 在庫移動（ロケーション間転送）/ 库存转移（库位间转移）
  async transferStock(tenantId: string, body: { productId: string; fromLocationId: string; toLocationId: string; quantity: number }) {
    const { productId, fromLocationId, toLocationId, quantity } = body;

    if (!productId || !fromLocationId || !toLocationId || !quantity || quantity <= 0) {
      throw new WmsException('VALIDATION_ERROR', 'productId, fromLocationId, toLocationId, quantity (> 0) are required');
    }

    const now = new Date();
    const moveNumber = `TRF-${Date.now()}`;

    // stockMoves に移動レコード挿入 / 在stockMoves中插入转移记录
    const [move] = await this.db.insert(stockMoves).values({
      tenantId,
      moveNumber,
      moveType: 'transfer',
      status: 'done',
      productId,
      fromLocationId,
      toLocationId,
      quantity,
      referenceType: 'adjustment',
      executedAt: now,
    }).returning();

    // 移動元の在庫を減らす / 减少来源库位库存
    await this.db.execute(sql`
      UPDATE stock_quants
      SET quantity = quantity - ${quantity}, updated_at = ${now}, last_moved_at = ${now}
      WHERE tenant_id = ${tenantId} AND product_id = ${productId} AND location_id = ${fromLocationId}
    `);

    // 移動先の在庫を増やす（upsert）/ 增加目标库位库存（upsert）
    await this.db.execute(sql`
      INSERT INTO stock_quants (tenant_id, product_id, location_id, quantity, updated_at, last_moved_at)
      VALUES (${tenantId}, ${productId}, ${toLocationId}, ${quantity}, ${now}, ${now})
      ON CONFLICT (tenant_id, product_id, location_id, lot_id)
      DO UPDATE SET
        quantity = stock_quants.quantity + ${quantity},
        updated_at = ${now},
        last_moved_at = ${now}
    `);

    return { move, message: 'Stock transferred / 在庫移動完了 / 库存转移完成' };
  }

  // 在庫一括調整 / 库存批量调整
  async bulkAdjustStock(tenantId: string, adjustments: { productId: string; locationId: string; quantity: number; reason?: string }[]) {
    if (!adjustments || adjustments.length === 0) {
      return { adjusted: 0, results: [] };
    }

    const results = [];
    for (const adj of adjustments) {
      const result = await this.adjustStock(tenantId, adj);
      results.push(result);
    }

    return { adjusted: results.length, results };
  }

  // 在庫移動履歴取得（ページネーション付き）/ 获取库存移动历史（带分页）
  async getMovements(tenantId: string, query: { page?: number; limit?: number; productId?: string; moveType?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(stockMoves.tenantId, tenantId)];

    if (query.productId) {
      conditions.push(eq(stockMoves.productId, query.productId));
    }
    if (query.moveType) {
      conditions.push(eq(stockMoves.moveType, query.moveType));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(stockMoves)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(sql`${stockMoves.createdAt} DESC`),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(stockMoves)
        .where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 在庫エイジング分析（lastMovedAtベース）/ 库存老化分析（基于lastMovedAt）
  async getAgingAnalysis(tenantId: string, warehouseId?: string) {
    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(stockQuants.tenantId, tenantId),
      sql`${stockQuants.quantity} > 0`,
    ];

    // 倉庫IDフィルタ（ロケーション経由）/ 仓库ID筛选（通过库位）
    if (warehouseId) {
      conditions.push(
        sql`${stockQuants.locationId} IN (
          SELECT ${locations.id} FROM ${locations}
          WHERE ${locations.warehouseId} = ${warehouseId}
        )`,
      );
    }

    const where = and(...conditions);

    // 商品別に最新移動日と数量を集計 / 按商品汇总最新移动日和数量
    const rows = await this.db
      .select({
        productId: stockQuants.productId,
        totalQuantity: sql<number>`sum(${stockQuants.quantity})::int`,
        lastMovedAt: sql<string>`max(${stockQuants.lastMovedAt})`,
      })
      .from(stockQuants)
      .where(where)
      .groupBy(stockQuants.productId);

    // エイジングバケット定義 / 老化分桶定义
    const buckets = [
      { range: '0-30 days / 0-30日', minDays: 0, maxDays: 30, count: 0, totalQuantity: 0 },
      { range: '31-60 days / 31-60日', minDays: 31, maxDays: 60, count: 0, totalQuantity: 0 },
      { range: '61-90 days / 61-90日', minDays: 61, maxDays: 90, count: 0, totalQuantity: 0 },
      { range: '91-180 days / 91-180日', minDays: 91, maxDays: 180, count: 0, totalQuantity: 0 },
      { range: '180+ days / 180日以上', minDays: 181, maxDays: Infinity, count: 0, totalQuantity: 0 },
    ];

    const now = Date.now();
    let totalAgeDays = 0;

    for (const row of rows) {
      // lastMovedAtがnullの場合はcreatedAtを代用（最大エイジング扱い）
      // lastMovedAt为null时使用createdAt代替（视为最大老化）
      const movedAt = row.lastMovedAt ? new Date(row.lastMovedAt).getTime() : 0;
      const ageDays = movedAt > 0
        ? Math.floor((now - movedAt) / (1000 * 60 * 60 * 24))
        : 365; // lastMovedAt不明の場合は365日扱い / 未知时视为365天

      totalAgeDays += ageDays;
      const quantity = row.totalQuantity ?? 0;

      // 適切なバケットに分類 / 分类到对应的桶
      for (const bucket of buckets) {
        if (ageDays >= bucket.minDays && ageDays <= bucket.maxDays) {
          bucket.count++;
          bucket.totalQuantity += quantity;
          break;
        }
      }
    }

    const totalProducts = rows.length;
    const averageAge = totalProducts > 0 ? Math.round(totalAgeDays / totalProducts) : 0;

    return {
      buckets: buckets.map(({ range, count, totalQuantity }) => ({
        range,
        count,
        totalQuantity,
      })),
      totalProducts,
      averageAge,
    };
  }

  // ロケーション一括作成 / 批量创建库位
  async bulkCreateLocations(tenantId: string, locationDtos: CreateLocationDto[]) {
    if (!locationDtos || locationDtos.length === 0) {
      return { created: 0, items: [] };
    }

    const values = locationDtos.map((dto) => ({ tenantId, ...dto }));
    const rows = await this.db.insert(locations).values(values).returning();

    return { created: rows.length, items: rows };
  }

  // ロケーションツリー取得（parentId による階層構造）/ 获取库位树（基于parentId的层级结构）
  async getLocationTree(tenantId: string, warehouseId?: string) {
    const conditions: SQL[] = [eq(locations.tenantId, tenantId)];

    if (warehouseId) {
      conditions.push(eq(locations.warehouseId, warehouseId));
    }

    const where = and(...conditions);

    const allLocations = await this.db
      .select()
      .from(locations)
      .where(where)
      .orderBy(locations.sortOrder, locations.code);

    // ツリー構築 / 构建树
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const loc of allLocations) {
      map.set(loc.id, { ...loc, children: [] });
    }

    for (const loc of allLocations) {
      const node = map.get(loc.id);
      if (loc.parentId && map.has(loc.parentId)) {
        map.get(loc.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
