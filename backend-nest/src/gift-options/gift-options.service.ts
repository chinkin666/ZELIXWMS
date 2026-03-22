// ギフト設定サービス / 礼品设置管理服务
import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { giftOptions } from '../database/schema/gift-options.js';
import { WmsException } from '../common/exceptions/wms.exception.js';

interface FindAllQuery {
  shipmentOrderId?: string;
}

@Injectable()
export class GiftOptionsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ギフトオプション一覧取得（出荷オーダー別）/ 获取礼品选项列表（按出货订单）
  async findAll(tenantId: string, query: FindAllQuery) {
    // 検索条件構築 / 构建查询条件
    const conditions = [eq(giftOptions.tenantId, tenantId)];

    if (query.shipmentOrderId) {
      conditions.push(eq(giftOptions.shipmentOrderId, query.shipmentOrderId));
    }

    const where = and(...conditions);

    return this.db
      .select()
      .from(giftOptions)
      .where(where)
      .orderBy(giftOptions.createdAt);
  }

  // ギフトオプション作成（出荷オーダーにギフト設定を付与）
  // 创建礼品选项（为出货订单附加礼品设置）
  async create(tenantId: string, dto: Record<string, any>) {
    const [created] = await this.db
      .insert(giftOptions)
      .values({
        tenantId,
        shipmentOrderId: dto.shipmentOrderId,
        giftType: dto.giftType,
        optionName: dto.optionName,
        optionValue: dto.optionValue,
        message: dto.message,
        price: dto.price,
      })
      .returning();

    return created;
  }

  // ギフトオプション削除 / 删除礼品选项
  async remove(tenantId: string, id: string) {
    // 存在確認 / 存在确认
    const [record] = await this.db
      .select()
      .from(giftOptions)
      .where(and(eq(giftOptions.id, id), eq(giftOptions.tenantId, tenantId)))
      .limit(1);

    if (!record) {
      throw new WmsException('GIFT_OPTION_NOT_FOUND', `Gift option ${id} not found`);
    }

    await this.db
      .delete(giftOptions)
      .where(and(eq(giftOptions.id, id), eq(giftOptions.tenantId, tenantId)));

    return { success: true, id };
  }
}
