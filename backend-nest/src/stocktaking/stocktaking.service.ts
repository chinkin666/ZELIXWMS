// 棚卸サービス / 盘点服务
import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, isNull, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { stocktakingOrders } from '../database/schema/warehouse-ops.js';
import type { CreateStocktakingDto, UpdateStocktakingDto } from './dto/create-stocktaking.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
  warehouseId?: string;
  type?: string;
}

@Injectable()
export class StocktakingService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 棚卸一覧取得（テナント分離・ページネーション・フィルタ）/ 获取盘点列表（租户隔离・分页・筛选）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(stocktakingOrders.tenantId, tenantId),
      isNull(stocktakingOrders.deletedAt),
    ];

    if (query.status) {
      conditions.push(eq(stocktakingOrders.status, query.status));
    }
    if (query.warehouseId) {
      conditions.push(eq(stocktakingOrders.warehouseId, query.warehouseId));
    }
    if (query.type) {
      conditions.push(eq(stocktakingOrders.type, query.type));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(stocktakingOrders).where(where).limit(limit).offset(offset).orderBy(stocktakingOrders.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(stocktakingOrders).where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  // 棚卸ID検索 / 按ID查找盘点单
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(stocktakingOrders)
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
        isNull(stocktakingOrders.deletedAt),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Stocktaking order ${id} not found / 棚卸指示 ${id} が見つかりません / 盘点单 ${id} 未找到`);
    }
    return rows[0];
  }

  // 棚卸作成 / 创建盘点单
  async create(tenantId: string, dto: CreateStocktakingDto) {
    // orderNumber重複チェック / orderNumber重复检查
    const existing = await this.db
      .select({ id: stocktakingOrders.id })
      .from(stocktakingOrders)
      .where(and(
        eq(stocktakingOrders.tenantId, tenantId),
        eq(stocktakingOrders.orderNumber, dto.orderNumber),
        isNull(stocktakingOrders.deletedAt),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(`Order number "${dto.orderNumber}" already exists / 棚卸番号 "${dto.orderNumber}" は既に存在します / 盘点单号 "${dto.orderNumber}" 已存在`);
    }

    const rows = await this.db.insert(stocktakingOrders).values({
      tenantId,
      orderNumber: dto.orderNumber,
      type: dto.type,
      warehouseId: dto.warehouseId,
      locationIds: dto.locationIds,
      productIds: dto.productIds,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
      memo: dto.memo,
    }).returning();

    return rows[0];
  }

  // 棚卸更新 / 更新盘点单
  async update(tenantId: string, id: string, dto: UpdateStocktakingDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // orderNumber変更時の重複チェック / orderNumber变更时的重复检查
    if (dto.orderNumber) {
      const existing = await this.db
        .select({ id: stocktakingOrders.id })
        .from(stocktakingOrders)
        .where(and(
          eq(stocktakingOrders.tenantId, tenantId),
          eq(stocktakingOrders.orderNumber, dto.orderNumber),
          isNull(stocktakingOrders.deletedAt),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new ConflictException(`Order number "${dto.orderNumber}" already exists / 棚卸番号 "${dto.orderNumber}" は既に存在します / 盘点单号 "${dto.orderNumber}" 已存在`);
      }
    }

    const updateData: Record<string, unknown> = { ...dto, updatedAt: new Date() };

    // scheduledDate文字列をDate変換 / scheduledDate字符串转Date
    if (updateData.scheduledDate !== undefined) {
      updateData.scheduledDate = updateData.scheduledDate ? new Date(updateData.scheduledDate as string) : null;
    }

    const rows = await this.db
      .update(stocktakingOrders)
      .set(updateData)
      .where(and(eq(stocktakingOrders.id, id), eq(stocktakingOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 棚卸論理削除 / 盘点单软删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(stocktakingOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(stocktakingOrders.id, id), eq(stocktakingOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
