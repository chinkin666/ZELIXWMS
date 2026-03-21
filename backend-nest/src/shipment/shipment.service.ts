// 出荷注文サービス / 出货订单服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, isNull, or, sql, SQL, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { shipmentOrders, shipmentOrderProducts } from '../database/schema/shipments.js';
import type { CreateShipmentOrderDto, UpdateShipmentOrderDto } from './dto/create-shipment-order.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

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
    const limit = Math.min(200, Math.max(1, query.limit || 20));
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

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
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
      throw new WmsException('SHIP_NOT_FOUND', `ID: ${id}`);
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
      throw new WmsException('DUPLICATE_RESOURCE', `Order number: ${dto.orderNumber}`);
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
        throw new WmsException('DUPLICATE_RESOURCE', `Order number: ${dto.orderNumber}`);
      }
    }

    const rows = await this.db
      .update(shipmentOrders)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 出荷注文確認（statusConfirmed=true）/ 出货订单确认（statusConfirmed=true）
  async confirm(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.statusConfirmed) {
      throw new WmsException('SHIP_INVALID_STATUS', `Order ${id} is already confirmed`);
    }
    const rows = await this.db
      .update(shipmentOrders)
      .set({ statusConfirmed: true, updatedAt: new Date() })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 出荷注文出荷（statusShipped=true）/ 出货订单发货（statusShipped=true）
  async ship(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.statusShipped) {
      throw new WmsException('SHIP_ALREADY_SHIPPED', `ID: ${id}`);
    }
    const rows = await this.db
      .update(shipmentOrders)
      .set({ statusShipped: true, updatedAt: new Date() })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 出荷注文一括作成 / 批量创建出货订单
  async bulkCreate(tenantId: string, orders: CreateShipmentOrderDto[]) {
    const results = [];
    for (const dto of orders) {
      const created = await this.create(tenantId, dto);
      results.push(created);
    }
    return results;
  }

  // 出荷注文一括削除（論理削除）/ 批量删除出货订单（软删除）
  async bulkDelete(tenantId: string, ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'No IDs provided');
    }
    const rows = await this.db
      .update(shipmentOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        inArray(shipmentOrders.id, ids),
        eq(shipmentOrders.tenantId, tenantId),
        isNull(shipmentOrders.deletedAt),
      ))
      .returning();
    return { deleted: rows.length, items: rows };
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
