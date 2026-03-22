// 操作ログサービス / 操作日志服务
// operationLogs（settingsスキーマ）を使用 / 使用operationLogs（settings schema）
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, SQL, desc } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { operationLogs } from '../database/schema/settings.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  action?: string;
  resourceType?: string;
  userId?: string;
}

@Injectable()
export class OperationLogsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 操作ログ一覧取得（ページネーション・フィルター対応）
  // 获取操作日志列表（支持分页和过滤）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // テナント分離 / 租户隔离
    const conditions: SQL[] = [eq(operationLogs.tenantId, tenantId)];

    // アクションフィルター / 操作过滤
    if (query.action) {
      conditions.push(eq(operationLogs.action, query.action));
    }
    // リソースタイプフィルター / 资源类型过滤
    if (query.resourceType) {
      conditions.push(eq(operationLogs.resourceType, query.resourceType));
    }
    // ユーザーIDフィルター / 用户ID过滤
    if (query.userId) {
      conditions.push(eq(operationLogs.userId, query.userId));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(operationLogs)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(operationLogs.createdAt)),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(operationLogs)
        .where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 操作ログ詳細取得 / 获取操作日志详情
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(operationLogs)
      .where(and(
        eq(operationLogs.id, id),
        eq(operationLogs.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('OPERATION_LOG_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }
}
