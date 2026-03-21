// 請求サービス / 账单服务
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { serviceRates } from '../database/schema/billing.js';
import { workCharges } from '../database/schema/billing.js';
import type { CreateServiceRateDto, UpdateServiceRateDto } from './dto/create-service-rate.dto.js';

// サービス料金検索パラメータ / 服务费率查询参数
interface FindAllServiceRatesQuery {
  page?: number;
  limit?: number;
  chargeType?: string;
  clientId?: string;
  isActive?: boolean;
}

// 作業チャージ検索パラメータ / 作业费用查询参数
interface FindAllWorkChargesQuery {
  page?: number;
  limit?: number;
  chargeType?: string;
  clientId?: string;
  isBilled?: boolean;
  billingPeriod?: string;
}

@Injectable()
export class BillingService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // ============================================
  // サービス料金 CRUD / 服务费率 CRUD
  // ============================================

  // サービス料金一覧取得（テナント分離・ページネーション・フィルタ）/ 获取服务费率列表（租户隔离・分页・筛选）
  async findAllServiceRates(tenantId: string, query: FindAllServiceRatesQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(serviceRates.tenantId, tenantId),
    ];

    if (query.chargeType) {
      conditions.push(eq(serviceRates.chargeType, query.chargeType));
    }
    if (query.clientId) {
      conditions.push(eq(serviceRates.clientId, query.clientId));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(serviceRates.isActive, query.isActive));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(serviceRates).where(where).limit(limit).offset(offset).orderBy(serviceRates.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(serviceRates).where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  // サービス料金ID検索 / 按ID查找服务费率
  async findServiceRateById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(serviceRates)
      .where(and(
        eq(serviceRates.id, id),
        eq(serviceRates.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(
        `Service rate ${id} not found / サービス料金 ${id} が見つかりません / 服务费率 ${id} 未找到`,
      );
    }
    return rows[0];
  }

  // サービス料金作成 / 创建服务费率
  async createServiceRate(tenantId: string, dto: CreateServiceRateDto) {
    const insertData = {
      tenantId,
      ...dto,
      // 日付文字列をDateに変換（指定時）/ 日期字符串转为Date（指定时）
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validTo: dto.validTo ? new Date(dto.validTo) : undefined,
    };

    const rows = await this.db.insert(serviceRates).values(insertData).returning();
    return rows[0];
  }

  // サービス料金更新 / 更新服务费率
  async updateServiceRate(tenantId: string, id: string, dto: UpdateServiceRateDto) {
    // 存在確認 / 确认存在
    await this.findServiceRateById(tenantId, id);

    const updateData: Record<string, unknown> = {
      ...dto,
      updatedAt: new Date(),
    };

    // 日付文字列をDateに変換（指定時）/ 日期字符串转为Date（指定时）
    if (dto.validFrom !== undefined) {
      updateData.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    }
    if (dto.validTo !== undefined) {
      updateData.validTo = dto.validTo ? new Date(dto.validTo) : null;
    }

    const rows = await this.db
      .update(serviceRates)
      .set(updateData)
      .where(and(eq(serviceRates.id, id), eq(serviceRates.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // サービス料金論理削除（isActive=falseに設定）/ 服务费率软删除（设置isActive=false）
  async removeServiceRate(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findServiceRateById(tenantId, id);

    const rows = await this.db
      .update(serviceRates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(serviceRates.id, id), eq(serviceRates.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ============================================
  // 作業チャージ / 作业费用
  // ============================================

  // 作業チャージ一覧取得（テナント分離・ページネーション・フィルタ）/ 获取作业费用列表（租户隔离・分页・筛选）
  async findAllWorkCharges(tenantId: string, query: FindAllWorkChargesQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(workCharges.tenantId, tenantId),
    ];

    if (query.chargeType) {
      conditions.push(eq(workCharges.chargeType, query.chargeType));
    }
    if (query.clientId) {
      conditions.push(eq(workCharges.clientId, query.clientId));
    }
    if (query.isBilled !== undefined) {
      conditions.push(eq(workCharges.isBilled, query.isBilled));
    }
    if (query.billingPeriod) {
      conditions.push(eq(workCharges.billingPeriod, query.billingPeriod));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(workCharges).where(where).limit(limit).offset(offset).orderBy(workCharges.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(workCharges).where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  // 作業チャージ作成 / 创建作业费用
  async createWorkCharge(tenantId: string, dto: Record<string, unknown>) {
    const insertData = {
      tenantId,
      ...dto,
    };

    const rows = await this.db.insert(workCharges).values(insertData).returning();
    return rows[0];
  }
}
