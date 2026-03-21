// APIログサービス / API日志服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, SQL, gte, lte } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { apiLogs } from '../database/schema/api-logs.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

// APIログ検索クエリ / API日志查询参数
interface FindAllQuery {
  page?: number;
  limit?: number;
  method?: string;
  statusCode?: number;
  path?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class ApiLogsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // APIログ一覧取得（ページネーション・フィルタ対応） / 获取API日志列表（支持分页・筛选）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(apiLogs.tenantId, tenantId),
    ];

    // HTTPメソッドフィルタ / HTTP方法筛选
    if (query.method) {
      conditions.push(eq(apiLogs.method, query.method.toUpperCase()));
    }

    // パスフィルタ（部分一致）/ 路径筛选（部分匹配）
    if (query.path) {
      conditions.push(sql`${apiLogs.path} LIKE ${'%' + query.path + '%'}`);
    }

    // ステータスコードフィルタ / 状态码筛选
    if (query.statusCode) {
      conditions.push(eq(apiLogs.statusCode, query.statusCode));
    }

    // 日付範囲フィルタ / 日期范围筛选
    if (query.startDate) {
      conditions.push(gte(apiLogs.createdAt, new Date(query.startDate)));
    }
    if (query.endDate) {
      conditions.push(lte(apiLogs.createdAt, new Date(query.endDate)));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      (this.db as any)
        .select()
        .from(apiLogs)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(sql`${apiLogs.createdAt} DESC`),
      (this.db as any)
        .select({ count: sql<number>`count(*)::int` })
        .from(apiLogs)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    return createPaginatedResult(items, total, page, limit);
  }

  // APIログ詳細取得（ID + テナントID）/ 获取API日志详情（ID + 租户ID）
  async findById(tenantId: string, id: string) {
    const rows = await (this.db as any)
      .select()
      .from(apiLogs)
      .where(
        and(
          eq(apiLogs.id, id),
          eq(apiLogs.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('API_LOG_NOT_FOUND', `ID: ${id}`);
    }

    return rows[0];
  }
}
