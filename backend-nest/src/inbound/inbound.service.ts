// 入庫サービス / 入库服务
import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, isNull, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { inboundOrders, inboundOrderLines } from '../database/schema/inbound.js';
import type { CreateInboundOrderDto, UpdateInboundOrderDto } from './dto/create-inbound-order.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
  clientId?: string;
  warehouseId?: string;
  flowType?: string;
}

@Injectable()
export class InboundService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 入庫オーダー一覧取得（テナント分離・ページネーション・フィルタ）/ 获取入库订单列表（租户隔离・分页・筛选）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(inboundOrders.tenantId, tenantId),
      isNull(inboundOrders.deletedAt),
    ];

    if (query.status) {
      conditions.push(eq(inboundOrders.status, query.status));
    }
    if (query.clientId) {
      conditions.push(eq(inboundOrders.clientId, query.clientId));
    }
    if (query.warehouseId) {
      conditions.push(eq(inboundOrders.warehouseId, query.warehouseId));
    }
    if (query.flowType) {
      conditions.push(eq(inboundOrders.flowType, query.flowType));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(inboundOrders).where(where).limit(limit).offset(offset).orderBy(inboundOrders.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(inboundOrders).where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  // 入庫オーダーID検索 / 按ID查找入库订单
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(inboundOrders)
      .where(and(
        eq(inboundOrders.id, id),
        eq(inboundOrders.tenantId, tenantId),
        isNull(inboundOrders.deletedAt),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Inbound order ${id} not found / 入庫オーダー ${id} が見つかりません / 入库订单 ${id} 未找到`);
    }
    return rows[0];
  }

  // 入庫オーダー作成 / 创建入库订单
  async create(tenantId: string, dto: CreateInboundOrderDto) {
    // 注文番号重複チェック / 订单号重复检查
    const existing = await this.db
      .select({ id: inboundOrders.id })
      .from(inboundOrders)
      .where(and(
        eq(inboundOrders.tenantId, tenantId),
        eq(inboundOrders.orderNumber, dto.orderNumber),
        isNull(inboundOrders.deletedAt),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(`Order number "${dto.orderNumber}" already exists / 注文番号 "${dto.orderNumber}" は既に存在します / 订单号 "${dto.orderNumber}" 已存在`);
    }

    const insertData = {
      tenantId,
      ...dto,
    };

    const rows = await this.db.insert(inboundOrders).values(insertData).returning();
    return rows[0];
  }

  // 入庫オーダー更新 / 更新入库订单
  async update(tenantId: string, id: string, dto: UpdateInboundOrderDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // 注文番号変更時の重複チェック / 订单号变更时的重复检查
    if (dto.orderNumber) {
      const existing = await this.db
        .select({ id: inboundOrders.id })
        .from(inboundOrders)
        .where(and(
          eq(inboundOrders.tenantId, tenantId),
          eq(inboundOrders.orderNumber, dto.orderNumber),
          isNull(inboundOrders.deletedAt),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new ConflictException(`Order number "${dto.orderNumber}" already exists / 注文番号 "${dto.orderNumber}" は既に存在します / 订单号 "${dto.orderNumber}" 已存在`);
      }
    }

    const updateData: Record<string, unknown> = { ...dto, updatedAt: new Date() };

    const rows = await this.db
      .update(inboundOrders)
      .set(updateData)
      .where(and(eq(inboundOrders.id, id), eq(inboundOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 入庫オーダー論理削除 / 入库订单软删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(inboundOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(inboundOrders.id, id), eq(inboundOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 入庫オーダー明細行取得 / 获取入库订单明细行
  async findLines(tenantId: string, orderId: string) {
    // 親オーダー存在確認 / 确认父订单存在
    await this.findById(tenantId, orderId);

    const rows = await this.db
      .select()
      .from(inboundOrderLines)
      .where(and(
        eq(inboundOrderLines.inboundOrderId, orderId),
        eq(inboundOrderLines.tenantId, tenantId),
      ))
      .orderBy(inboundOrderLines.createdAt);

    return rows;
  }
}
