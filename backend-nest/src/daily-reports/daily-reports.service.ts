// 日次レポートサービス / 日报服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, gte, lte, SQL, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { dailyReports } from '../database/schema/settings.js';
import { shipmentOrders } from '../database/schema/shipments.js';
import { inboundOrders } from '../database/schema/inbound.js';
import { stockMoves } from '../database/schema/inventory.js';
import type { CreateDailyReportDto, UpdateDailyReportDto } from './dto/create-daily-report.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  from?: string; // ISO日付（YYYY-MM-DD）/ ISO日期
  to?: string;   // ISO日付（YYYY-MM-DD）/ ISO日期
}

@Injectable()
export class DailyReportsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 日次レポート一覧取得（テナント分離・ページネーション・日付範囲フィルタ）/ 获取日报列表（租户隔离・分页・日期范围筛选）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(dailyReports.tenantId, tenantId),
    ];

    if (query.from) {
      conditions.push(gte(dailyReports.date, new Date(query.from)));
    }
    if (query.to) {
      conditions.push(lte(dailyReports.date, new Date(query.to)));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(dailyReports).where(where).limit(limit).offset(offset).orderBy(dailyReports.date),
      this.db.select({ count: sql<number>`count(*)::int` }).from(dailyReports).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 日次レポートID検索 / 按ID查找日报
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(dailyReports)
      .where(and(
        eq(dailyReports.id, id),
        eq(dailyReports.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('DAILY_REPORT_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 日次レポート作成（同一テナント・同一日付の重複チェック）/ 创建日报（同租户同日期重复检查）
  async create(tenantId: string, dto: CreateDailyReportDto) {
    const reportDate = new Date(dto.date);

    // 重複チェック / 重复检查
    const existing = await this.db
      .select({ id: dailyReports.id })
      .from(dailyReports)
      .where(and(
        eq(dailyReports.tenantId, tenantId),
        eq(dailyReports.date, reportDate),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Daily report date: ${dto.date}`);
    }

    const rows = await this.db
      .insert(dailyReports)
      .values({
        tenantId,
        date: reportDate,
        summary: dto.summary ?? {},
      })
      .returning();

    return rows[0];
  }

  // 日次レポート更新 / 更新日报
  async update(tenantId: string, id: string, dto: UpdateDailyReportDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (dto.date !== undefined) {
      updateData.date = new Date(dto.date);
    }
    if (dto.summary !== undefined) {
      updateData.summary = dto.summary;
    }

    const rows = await this.db
      .update(dailyReports)
      .set(updateData)
      .where(and(eq(dailyReports.id, id), eq(dailyReports.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 日次レポート生成（対象日の出荷・入庫・在庫移動を集計してレポート作成）
  // 生成日报（汇总目标日的出货・入库・库存移动后创建报告）
  async generate(tenantId: string, body: Record<string, unknown>) {
    const dateStr = (body.date as string) ?? new Date().toISOString().slice(0, 10);
    const reportDate = new Date(dateStr);
    const nextDate = new Date(reportDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // 並列で各集計クエリを実行 / 并行执行各汇总查询
    const [shipmentCount, inboundCount, moveCount] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)::int` })
        .from(shipmentOrders)
        .where(and(
          eq(shipmentOrders.tenantId, tenantId),
          gte(shipmentOrders.createdAt, reportDate),
          lte(shipmentOrders.createdAt, nextDate),
          isNull(shipmentOrders.deletedAt),
        )),
      this.db.select({ count: sql<number>`count(*)::int` })
        .from(inboundOrders)
        .where(and(
          eq(inboundOrders.tenantId, tenantId),
          gte(inboundOrders.createdAt, reportDate),
          lte(inboundOrders.createdAt, nextDate),
          isNull(inboundOrders.deletedAt),
        )),
      this.db.select({ count: sql<number>`count(*)::int` })
        .from(stockMoves)
        .where(and(
          eq(stockMoves.tenantId, tenantId),
          gte(stockMoves.createdAt, reportDate),
          lte(stockMoves.createdAt, nextDate),
        )),
    ]);

    const summary = {
      date: dateStr,
      shipmentOrders: shipmentCount[0]?.count ?? 0,
      inboundOrders: inboundCount[0]?.count ?? 0,
      stockMoves: moveCount[0]?.count ?? 0,
      generatedAt: new Date().toISOString(),
    };

    // レポートを作成（重複チェック込み）/ 创建报告（含重复检查）
    try {
      return await this.create(tenantId, { date: dateStr, summary } as any);
    } catch (e: any) {
      // 重複の場合は既存レポートを更新 / 重复时更新现有报告
      if (e.code === 'DUPLICATE_RESOURCE') {
        const existing = await this.db
          .select()
          .from(dailyReports)
          .where(and(eq(dailyReports.tenantId, tenantId), eq(dailyReports.date, reportDate)))
          .limit(1);

        if (existing.length > 0) {
          return this.update(tenantId, existing[0].id, { summary } as any);
        }
      }
      throw e;
    }
  }

  // 日次レポートエクスポート（CSV形式のバッファを返す）/ 导出日报（返回CSV格式buffer）
  async exportReports(tenantId: string) {
    const items = await this.db
      .select()
      .from(dailyReports)
      .where(eq(dailyReports.tenantId, tenantId))
      .orderBy(dailyReports.date);

    const headers = ['date', 'summary', 'createdAt'];
    const csvLines = [headers.join(',')];

    for (const item of items) {
      const summaryStr = JSON.stringify(item.summary ?? {}).replace(/"/g, '""');
      csvLines.push([
        item.date ? new Date(item.date as any).toISOString().slice(0, 10) : '',
        `"${summaryStr}"`,
        item.createdAt ? new Date(item.createdAt).toISOString() : '',
      ].join(','));
    }

    return {
      filename: `daily-reports-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: 'text/csv',
      data: csvLines.join('\n'),
      totalRows: items.length,
    };
  }
}
