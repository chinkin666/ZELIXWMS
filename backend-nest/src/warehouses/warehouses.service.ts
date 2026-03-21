// 倉庫サービス / 仓库服务
import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ilike, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { warehouses } from '../database/schema/warehouses.js';
import type { CreateWarehouseDto, UpdateWarehouseDto } from './dto/create-warehouse.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  code?: string;
  name?: string;
  isActive?: boolean;
}

@Injectable()
export class WarehousesService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 倉庫一覧取得（テナント分離・ページネーション・検索）/ 获取仓库列表（租户隔离・分页・搜索）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(warehouses.tenantId, tenantId),
    ];

    if (query.code) {
      conditions.push(ilike(warehouses.code, `%${query.code}%`));
    }
    if (query.name) {
      conditions.push(ilike(warehouses.name, `%${query.name}%`));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(warehouses.isActive, query.isActive));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(warehouses).where(where).limit(limit).offset(offset).orderBy(warehouses.sortOrder),
      this.db.select({ count: sql<number>`count(*)::int` }).from(warehouses).where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  // 倉庫ID検索 / 按ID查找仓库
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(warehouses)
      .where(and(
        eq(warehouses.id, id),
        eq(warehouses.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Warehouse ${id} not found / 倉庫 ${id} が見つかりません / 仓库 ${id} 未找到`);
    }
    return rows[0];
  }

  // 倉庫作成 / 创建仓库
  async create(tenantId: string, dto: CreateWarehouseDto) {
    // コード重複チェック / 编码重复检查
    const existing = await this.db
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(and(
        eq(warehouses.tenantId, tenantId),
        eq(warehouses.code, dto.code),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(`Warehouse code "${dto.code}" already exists / 倉庫コード "${dto.code}" は既に存在します / 仓库编码 "${dto.code}" 已存在`);
    }

    const rows = await this.db.insert(warehouses).values({
      tenantId,
      ...dto,
    }).returning();

    return rows[0];
  }

  // 倉庫更新 / 更新仓库
  async update(tenantId: string, id: string, dto: UpdateWarehouseDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // コード変更時の重複チェック / 编码变更时的重复检查
    if (dto.code) {
      const existing = await this.db
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(and(
          eq(warehouses.tenantId, tenantId),
          eq(warehouses.code, dto.code),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new ConflictException(`Warehouse code "${dto.code}" already exists / 倉庫コード "${dto.code}" は既に存在します / 仓库编码 "${dto.code}" 已存在`);
      }
    }

    const rows = await this.db
      .update(warehouses)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(warehouses.id, id), eq(warehouses.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 倉庫削除（物理削除）/ 删除仓库（物理删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(warehouses)
      .where(and(eq(warehouses.id, id), eq(warehouses.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
