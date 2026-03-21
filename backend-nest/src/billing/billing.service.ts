// 請求サービス / 账单服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { serviceRates, workCharges, shippingRates, invoices } from '../database/schema/billing.js';
import type { CreateServiceRateDto, UpdateServiceRateDto } from './dto/create-service-rate.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

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
    const limit = Math.min(200, Math.max(1, query.limit || 20));
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

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
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
      throw new WmsException('BILL_NOT_FOUND', `Service rate ID: ${id}`);
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
    const limit = Math.min(200, Math.max(1, query.limit || 20));
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

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
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
      throw new WmsException('BILL_NOT_FOUND', `Work charge ID: ${id}`);
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
    const limit = Math.min(200, Math.max(1, query.limit || 20));
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

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
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
      throw new WmsException('BILL_NOT_FOUND', `Shipping rate ID: ${id}`);
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
    const limit = Math.min(200, Math.max(1, query.limit || 20));
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

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
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
      throw new WmsException('BILL_NOT_FOUND', `Invoice ID: ${id}`);
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

  // 請求書更新 / 更新发票
  async updateInvoice(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findInvoiceById(tenantId, id);

    const rows = await this.db
      .update(invoices)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 請求書削除（ステータスをcancelledに変更）/ 删除发票（将状态改为cancelled）
  async removeInvoice(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    const invoice = await this.findInvoiceById(tenantId, id);
    if (invoice.status === 'paid') {
      throw new WmsException('BILL_INVALID_STATUS', 'Cannot delete a paid invoice / 支払済みの請求書は削除不可 / 不能删除已支付的发票');
    }

    const rows = await this.db
      .update(invoices)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 請求書送信（ステータスをsentに変更）/ 发送发票（将状态改为sent）
  async sendInvoice(tenantId: string, id: string) {
    const invoice = await this.findInvoiceById(tenantId, id);
    if (invoice.status !== 'issued' && invoice.status !== 'draft') {
      throw new WmsException('BILL_INVALID_STATUS', `Cannot send invoice with status '${invoice.status}' / ステータス「${invoice.status}」の請求書は送信不可 / 状态「${invoice.status}」的发票不可发送`);
    }

    const rows = await this.db
      .update(invoices)
      .set({ status: 'sent', updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 請求書PDF取得（請求書データをPDFレンダリング用に返す）/ 获取发票PDF（返回发票数据用于PDF渲染）
  async getInvoicePdf(tenantId: string, id: string) {
    const invoice = await this.findInvoiceById(tenantId, id);

    // PDFレンダリング用のデータ構造を返す / 返回PDF渲染用的数据结构
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      period: invoice.period,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      lineItems: invoice.lineItems,
      status: invoice.status,
      contentType: 'application/json',
      message: 'PDF rendering data / PDFレンダリングデータ / PDF渲染数据',
    };
  }

  // 請求ダッシュボード（ステータス別集計・月次トレンド）/ 账单仪表盘（按状态汇总・月度趋势）
  async getDashboard(tenantId: string) {
    // 並列クエリ / 并行查询
    const [invoiceStats, workChargeStats, recentInvoices] = await Promise.all([
      // 請求書ステータス別集計 / 发票按状态汇总
      this.db.select({
        status: invoices.status,
        count: sql<number>`count(*)::int`,
        totalAmount: sql<string>`coalesce(sum(${invoices.totalAmount}::numeric), 0)::text`,
      }).from(invoices).where(eq(invoices.tenantId, tenantId)).groupBy(invoices.status),

      // 未請求作業チャージ合計 / 未开票作业费用合计
      this.db.select({
        count: sql<number>`count(*)::int`,
        totalAmount: sql<string>`coalesce(sum(${workCharges.amount}::numeric), 0)::text`,
      }).from(workCharges).where(and(
        eq(workCharges.tenantId, tenantId),
        eq(workCharges.isBilled, false),
      )),

      // 最近の請求書 / 最近的发票
      this.db.select().from(invoices)
        .where(eq(invoices.tenantId, tenantId))
        .orderBy(sql`${invoices.createdAt} DESC`)
        .limit(5),
    ]);

    return {
      invoiceStats,
      unbilledCharges: workChargeStats[0] ?? { count: 0, totalAmount: '0' },
      recentInvoices,
    };
  }

  // 月次請求生成（指定期間の未請求workChargesを集計してbillingRecordとinvoiceを作成）
  // 生成月度账单（汇总指定期间的未开票workCharges后创建billingRecord和invoice）
  async generateMonthly(tenantId: string, body: Record<string, unknown>) {
    const period = body.period as string;
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      throw new WmsException('VALIDATION_ERROR', 'period is required in YYYY-MM format / periodはYYYY-MM形式必須 / period必须为YYYY-MM格式');
    }

    // 対象期間の未請求workChargesをクライアント別に集計 / 按客户汇总对象期间的未开票作业费用
    const chargesByClient = await this.db
      .select({
        clientId: workCharges.clientId,
        clientName: workCharges.clientName,
        orderCount: sql<number>`count(DISTINCT ${workCharges.referenceId})::int`,
        totalQuantity: sql<number>`coalesce(sum(${workCharges.quantity}), 0)::int`,
        totalAmount: sql<string>`coalesce(sum(${workCharges.amount}::numeric), 0)::text`,
      })
      .from(workCharges)
      .where(and(
        eq(workCharges.tenantId, tenantId),
        eq(workCharges.billingPeriod, period),
        eq(workCharges.isBilled, false),
      ))
      .groupBy(workCharges.clientId, workCharges.clientName);

    if (chargesByClient.length === 0) {
      return { generated: 0, message: `No unbilled charges for period ${period} / 期間${period}の未請求チャージなし / 期间${period}无未开票费用` };
    }

    const generated = [];
    for (const group of chargesByClient) {
      // 請求書番号を生成 / 生成发票编号
      const invoiceNumber = `INV-${period.replace('-', '')}-${Date.now().toString(36).toUpperCase()}`;
      const totalAmount = parseFloat(group.totalAmount || '0');
      const taxRate = 0.10;
      const taxAmount = Math.round(totalAmount * taxRate);
      const subtotal = totalAmount;

      // 請求書を作成 / 创建发票
      const [invoice] = await this.db.insert(invoices).values({
        tenantId,
        invoiceNumber,
        clientId: group.clientId,
        clientName: group.clientName,
        period,
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        subtotal: String(subtotal),
        taxRate: String(taxRate),
        taxAmount: String(taxAmount),
        totalAmount: String(subtotal + taxAmount),
        status: 'draft',
      }).returning();

      // workChargesのisBilledを更新 / 更新workCharges的isBilled
      await this.db.update(workCharges)
        .set({ isBilled: true, updatedAt: new Date() })
        .where(and(
          eq(workCharges.tenantId, tenantId),
          eq(workCharges.billingPeriod, period),
          eq(workCharges.clientId, group.clientId),
          eq(workCharges.isBilled, false),
        ));

      generated.push(invoice);
    }

    return { generated: generated.length, invoices: generated };
  }

  // 請求エクスポート（CSV形式のバッファを返す）/ 账单导出（返回CSV格式buffer）
  async exportBilling(tenantId: string) {
    const items = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId))
      .orderBy(invoices.createdAt);

    const headers = [
      'invoiceNumber', 'clientName', 'period', 'issueDate', 'dueDate',
      'subtotal', 'taxAmount', 'totalAmount', 'status',
    ];

    const csvLines = [headers.join(',')];
    for (const item of items) {
      const row = headers.map((h) => {
        const val = (item as Record<string, unknown>)[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      });
      csvLines.push(row.join(','));
    }

    return {
      filename: `billing-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: 'text/csv',
      data: csvLines.join('\n'),
      totalRows: items.length,
    };
  }
}
