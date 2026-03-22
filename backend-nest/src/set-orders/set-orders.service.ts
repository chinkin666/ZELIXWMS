// セットオーダーサービス / 套装订单服务
// shipmentOrders テーブルを使用し、セット組み関連の注文を管理 / 使用shipmentOrders表管理套装组合相关订单
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, SQL, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { shipmentOrders } from '../database/schema/shipments.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
}

@Injectable()
export class SetOrdersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // セットオーダー一覧取得（ページネーション付き）/ 获取套装订单列表（带分页）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // セットオーダー条件: destinationType = 'SET' / 套装订单条件
    const conditions: SQL[] = [
      eq(shipmentOrders.tenantId, tenantId),
      eq(shipmentOrders.destinationType, 'SET'),
      isNull(shipmentOrders.deletedAt),
    ];

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(shipmentOrders).where(where).limit(limit).offset(offset).orderBy(shipmentOrders.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(shipmentOrders).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // セットオーダーID検索 / 按ID查找套装订单
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.id, id),
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.destinationType, 'SET'),
        isNull(shipmentOrders.deletedAt),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('SET_ORDER_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // セットオーダー作成 / 创建套装订单
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db.insert(shipmentOrders).values({
      tenantId,
      destinationType: 'SET',
      orderNumber: dto.orderNumber as string || `SET-${Date.now()}`,
      recipientName: dto.recipientName as string,
      recipientPostalCode: dto.recipientPostalCode as string,
      recipientPrefecture: dto.recipientPrefecture as string,
      recipientCity: dto.recipientCity as string,
      recipientStreet: dto.recipientStreet as string,
      recipientBuilding: dto.recipientBuilding as string,
      recipientPhone: dto.recipientPhone as string,
      senderName: dto.senderName as string,
      senderPostalCode: dto.senderPostalCode as string,
      senderPrefecture: dto.senderPrefecture as string,
      senderCity: dto.senderCity as string,
      senderStreet: dto.senderStreet as string,
      senderBuilding: dto.senderBuilding as string,
      senderPhone: dto.senderPhone as string,
      carrierId: dto.carrierId as string,
      shipPlanDate: dto.shipPlanDate as string,
      coolType: dto.coolType as string,
      handlingTags: dto.handlingTags || [],
      customFields: dto.customFields || {},
      orderGroupId: dto.orderGroupId as string,
      orderSourceCompanyId: dto.orderSourceCompanyId as string,
    }).returning();

    return rows[0];
  }

  // セットオーダー更新 / 更新套装订单
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // destinationType は変更不可 / 不允许修改 destinationType
    const { destinationType: _ignored, ...updateData } = dto;

    const rows = await this.db
      .update(shipmentOrders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // セットオーダー削除（論理削除）/ 删除套装订单（逻辑删除）
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

  // セットオーダー完了 / 完成套装订单
  async complete(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);

    // 既に出荷済みの場合はエラー / 如果已出货则报错
    if (order.statusShipped) {
      throw new WmsException('SET_ORDER_INVALID_STATUS', `Order ${id} is already shipped / 既に出荷済み`);
    }

    const rows = await this.db
      .update(shipmentOrders)
      .set({
        statusShipped: true,
        statusShippedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // セットオーダーキャンセル / 取消套装订单
  async cancel(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);

    // 既に出荷済みの場合はキャンセル不可 / 已出货不可取消
    if (order.statusShipped) {
      throw new WmsException('SET_ORDER_INVALID_STATUS', `Cannot cancel shipped order ${id} / 出荷済み注文はキャンセルできません`);
    }

    const rows = await this.db
      .update(shipmentOrders)
      .set({
        statusHeld: true,
        statusHeldAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
