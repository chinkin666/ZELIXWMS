// 在庫サービス / 库存服务
import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { locations, stockQuants } from '../database/schema/inventory.js';
import type { CreateLocationDto, UpdateLocationDto } from './dto/create-location.dto.js';

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
    const limit = Math.min(100, Math.max(1, query.limit || 20));
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

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
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
      throw new NotFoundException(
        `Location ${id} not found / ロケーション ${id} が見つかりません / 库位 ${id} 未找到`,
      );
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
      throw new ConflictException(
        `Location code "${dto.code}" already exists / ロケーションコード "${dto.code}" は既に存在します / 库位编码 "${dto.code}" 已存在`,
      );
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
        throw new ConflictException(
          `Location code "${dto.code}" already exists / ロケーションコード "${dto.code}" は既に存在します / 库位编码 "${dto.code}" 已存在`,
        );
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
    const limit = Math.min(100, Math.max(1, query.limit || 20));
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

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
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
}
