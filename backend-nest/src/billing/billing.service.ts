// 請求サービス / 账单服务
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { serviceRates, workCharges, shippingRates, invoices } from '../database/schema/billing.js';
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

// 運費率検索パラメータ / 运费率查询参数
interface FindAllShippingRatesQuery {
  page?: number;
  limit?: number;
  carrierId?: string;
  isActive?: boolean;
}

// 請求書検索パラメータ / 发票查询参数
interface FindAllInvoicesQuery {
  page?: number;
  limit?: number;
  status?: string;
  clientId?: string;
  period?: string;
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

  // 作業チャージID検索 / 按ID查找作业费用
  async findWorkChargeById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(workCharges)
      .where(and(
        eq(workCharges.id, id),
        eq(workCharges.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(
        `Work charge ${id} not found / 作業チャージ ${id} が見つかりません / 作业费用 ${id} 未找到`,
      );
    }
    return rows[0];
  }

  // 作業チャージ更新 / 更新作业费用
  async updateWorkCharge(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findWorkChargeById(tenantId, id);

    const rows = await this.db
      .update(workCharges)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(workCharges.id, id), eq(workCharges.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 作業チャージ削除 / 删除作业费用
  async removeWorkCharge(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findWorkChargeById(tenantId, id);

    const rows = await this.db
      .delete(workCharges)
      .where(and(eq(workCharges.id, id), eq(workCharges.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ============================================
  // 運費率 CRUD / 运费率 CRUD
  // ============================================

  // 運費率一覧取得（テナント分離・ページネーション・フィルタ）/ 获取运费率列表（租户隔离・分页・筛选）
  async findAllShippingRates(tenantId: string, query: FindAllShippingRatesQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(shippingRates.tenantId, tenantId),
    ];

    if (query.carrierId) {
      conditions.push(eq(shippingRates.carrierId, query.carrierId));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(shippingRates.isActive, query.isActive));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(shippingRates).where(where).limit(limit).offset(offset).orderBy(shippingRates.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(shippingRates).where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  // 運費率ID検索 / 按ID查找运费率
  async findShippingRateById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(shippingRates)
      .where(and(
        eq(shippingRates.id, id),
        eq(shippingRates.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(
        `Shipping rate ${id} not found / 運費率 ${id} が見つかりません / 运费率 ${id} 未找到`,
      );
    }
    return rows[0];
  }

  // 運費率作成 / 创建运费率
  async createShippingRate(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(shippingRates)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }

  // 運費率更新 / 更新运费率
  async updateShippingRate(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findShippingRateById(tenantId, id);

    const rows = await this.db
      .update(shippingRates)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(shippingRates.id, id), eq(shippingRates.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 運費率論理削除（isActive=falseに設定）/ 运费率软删除（设置isActive=false）
  async removeShippingRate(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findShippingRateById(tenantId, id);

    const rows = await this.db
      .update(shippingRates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(shippingRates.id, id), eq(shippingRates.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ============================================
  // 請求書 CRUD / 发票 CRUD
  // ============================================

  // 請求書一覧取得（テナント分離・ページネーション・フィルタ）/ 获取发票列表（租户隔离・分页・筛选）
  async findAllInvoices(tenantId: string, query: FindAllInvoicesQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(invoices.tenantId, tenantId),
    ];

    if (query.status) {
      conditions.push(eq(invoices.status, query.status));
    }
    if (query.clientId) {
      conditions.push(eq(invoices.clientId, query.clientId));
    }
    if (query.period) {
      conditions.push(eq(invoices.period, query.period));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(invoices).where(where).limit(limit).offset(offset).orderBy(invoices.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(invoices).where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  // 請求書ID検索 / 按ID查找发票
  async findInvoiceById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, id),
        eq(invoices.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(
        `Invoice ${id} not found / 請求書 ${id} が見つかりません / 发票 ${id} 未找到`,
      );
    }
    return rows[0];
  }

  // 請求書作成 / 创建发票
  async createInvoice(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(invoices)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }
}
