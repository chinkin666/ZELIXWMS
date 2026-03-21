// ロケーションサービス（スタンドアロン）/ 库位服务（独立）
// InventoryServiceのロケーション機能を直接DB実装 / 直接实现InventoryService的库位功能
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { locations } from '../database/schema/inventory.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

// 検索クエリ / 查询参数
interface FindLocationsQuery {
  page?: number;
  limit?: number;
  warehouseId?: string;
  type?: string;
}

@Injectable()
export class LocationsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 一覧取得（テナント分離・ページネーション・フィルタ）/ 获取列表（租户隔离・分页・筛选）
  async findAll(tenantId: string, query: FindLocationsQuery = {}) {
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

  // ツリー取得（parentIdによる階層構造）/ 获取树形结构（基于parentId的层级结构）
  async getTree(tenantId: string, warehouseId?: string) {
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

  // ID検索 / 按ID查找
  async findOne(tenantId: string, id: string) {
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

  // 作成（コード重複チェック付き）/ 创建（含编码重复检查）
  async create(tenantId: string, dto: Record<string, unknown>) {
    const code = dto.code as string;

    // コード重複チェック / 编码重复检查
    if (code) {
      const existing = await this.db
        .select({ id: locations.id })
        .from(locations)
        .where(and(
          eq(locations.tenantId, tenantId),
          eq(locations.code, code),
        ))
        .limit(1);

      if (existing.length > 0) {
        throw new WmsException('DUPLICATE_RESOURCE', `Location code: ${code}`);
      }
    }

    const rows = await this.db
      .insert(locations)
      .values({
        tenantId,
        warehouseId: dto.warehouseId as string ?? null,
        parentId: dto.parentId as string ?? null,
        code: code,
        name: dto.name as string,
        type: dto.type as string,
        fullPath: dto.fullPath as string ?? '',
        coolType: dto.coolType as string ?? null,
        stockType: dto.stockType as string ?? null,
        temperatureType: dto.temperatureType as string ?? null,
        isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
        sortOrder: (dto.sortOrder as number) ?? 0,
        memo: dto.memo as string ?? null,
      })
      .returning();

    return rows[0];
  }

  // 一括作成 / 批量创建
  async bulkCreate(tenantId: string, locationDtos: Record<string, unknown>[]) {
    if (!locationDtos || locationDtos.length === 0) {
      return { created: 0, items: [] };
    }

    const values = locationDtos.map((dto) => ({
      tenantId,
      warehouseId: dto.warehouseId as string ?? null,
      parentId: dto.parentId as string ?? null,
      code: dto.code as string,
      name: dto.name as string,
      type: dto.type as string,
      fullPath: dto.fullPath as string ?? '',
      coolType: dto.coolType as string ?? null,
      stockType: dto.stockType as string ?? null,
      temperatureType: dto.temperatureType as string ?? null,
      isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
      sortOrder: (dto.sortOrder as number) ?? 0,
      memo: dto.memo as string ?? null,
    }));

    const rows = await this.db.insert(locations).values(values).returning();

    return { created: rows.length, items: rows };
  }

  // 更新 / 更新
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findOne(tenantId, id);

    // コード変更時の重複チェック / 编码变更时的重复检查
    if (dto.code) {
      const existing = await this.db
        .select({ id: locations.id })
        .from(locations)
        .where(and(
          eq(locations.tenantId, tenantId),
          eq(locations.code, dto.code as string),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Location code: ${dto.code}`);
      }
    }

    // 更新不可フィールドを除外 / 排除不可更新字段
    const { id: _id, tenantId: _tid, createdAt: _ca, ...updateData } = dto;

    const rows = await this.db
      .update(locations)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(locations.id, id),
        eq(locations.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // 削除（物理削除）/ 删除（硬删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findOne(tenantId, id);

    const rows = await this.db
      .delete(locations)
      .where(and(
        eq(locations.id, id),
        eq(locations.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }
}
