// 出荷注文サービス / 出货订单服务
import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ilike, isNull, or, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { shipmentOrders, shipmentOrderProducts } from '../database/schema/shipments.js';
import type { CreateShipmentOrderDto, UpdateShipmentOrderDto } from './dto/create-shipment-order.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  statusConfirmed?: boolean;
  statusShipped?: boolean;
  carrierId?: string;
  search?: string; // 注文番号・送付先名で検索 / 按订单编号・收件人名搜索
}

@Injectable()
export class ShipmentService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 出荷注文一覧取得（テナント分離・ページネーション・検索）/ 获取出货订单列表（租户隔离・分页・搜索）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(shipmentOrders.tenantId, tenantId),
      isNull(shipmentOrders.deletedAt),
    ];

    if (query.statusConfirmed !== undefined) {
      conditions.push(eq(shipmentOrders.statusConfirmed, query.statusConfirmed));
    }
    if (query.statusShipped !== undefined) {
      conditions.push(eq(shipmentOrders.statusShipped, query.statusShipped));
    }
    if (query.carrierId) {
      conditions.push(eq(shipmentOrders.carrierId, query.carrierId));
    }
    if (query.search) {
      // 注文番号または送付先名で部分一致検索 / 按订单编号或收件人名模糊搜索
      conditions.push(
        or(
          ilike(shipmentOrders.orderNumber, `%${query.search}%`),
          ilike(shipmentOrders.recipientName, `%${query.search}%`),
        )!,
      );
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(shipmentOrders).where(where).limit(limit).offset(offset).orderBy(shipmentOrders.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(shipmentOrders).where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  // 出荷注文ID検索 / 按ID查找出货订单
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.id, id),
        eq(shipmentOrders.tenantId, tenantId),
        isNull(shipmentOrders.deletedAt),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Shipment order ${id} not found / 出荷注文 ${id} が見つかりません / 出货订单 ${id} 未找到`);
    }
    return rows[0];
  }

  // 出荷注文の商品取得 / 获取出货订单的商品
  async findProducts(tenantId: string, orderId: string) {
    // 注文の存在確認（テナント分離）/ 确认订单存在（租户隔离）
    await this.findById(tenantId, orderId);

    return this.db
      .select()
      .from(shipmentOrderProducts)
      .where(and(
        eq(shipmentOrderProducts.shipmentOrderId, orderId),
        eq(shipmentOrderProducts.tenantId, tenantId),
      ));
  }

  // 出荷注文作成 / 创建出货订单
  async create(tenantId: string, dto: CreateShipmentOrderDto) {
    // 注文番号の重複チェック / 订单编号重复检查
    const existing = await this.db
      .select({ id: shipmentOrders.id })
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.orderNumber, dto.orderNumber),
        isNull(shipmentOrders.deletedAt),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(
        `Order number "${dto.orderNumber}" already exists / 注文番号 "${dto.orderNumber}" は既に存在します / 订单编号 "${dto.orderNumber}" 已存在`,
      );
    }

    const rows = await this.db
      .insert(shipmentOrders)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }

  // 出荷注文更新 / 更新出货订单
  async update(tenantId: string, id: string, dto: UpdateShipmentOrderDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // 注文番号変更時の重複チェック / 订单编号变更时的重复检查
    if (dto.orderNumber) {
      const existing = await this.db
        .select({ id: shipmentOrders.id })
        .from(shipmentOrders)
        .where(and(
          eq(shipmentOrders.tenantId, tenantId),
          eq(shipmentOrders.orderNumber, dto.orderNumber),
          isNull(shipmentOrders.deletedAt),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new ConflictException(
          `Order number "${dto.orderNumber}" already exists / 注文番号 "${dto.orderNumber}" は既に存在します / 订单编号 "${dto.orderNumber}" 已存在`,
        );
      }
    }

    const rows = await this.db
      .update(shipmentOrders)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 出荷注文論理削除 / 出货订单软删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(shipmentOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
