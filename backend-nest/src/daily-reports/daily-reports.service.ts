// 日次レポートサービス / 日报服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, gte, lte, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { dailyReports } from '../database/schema/settings.js';
import type { CreateDailyReportDto, UpdateDailyReportDto } from './dto/create-daily-report.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  from?: string; // ISO日付（YYYY-MM-DD）/ ISO日期
  to?: string;   // ISO日付（YYYY-MM-DD）/ ISO日期
}

@Injectable()
export class DailyReportsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

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
}
