// APIログサービス / API日志服务
// プレースホルダー実装 — APIログテーブル確定後に本実装へ移行
// 占位符实现 — API日志表确定后迁移到正式实装
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  method?: string;
  statusCode?: number;
  path?: string;
}

@Injectable()
export class ApiLogsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // APIログ一覧取得（ページネーション対応） / 获取API日志列表（支持分页）
  async findAll(tenantId: string, query: FindAllQuery) {
    // TODO: APIログテーブル実装後に本実装 / API日志表实装后正式实现
    return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20 };
  }

  // APIログ詳細取得 / 获取API日志详情
  async findById(tenantId: string, id: string) {
    // TODO: APIログテーブル実装後に本実装 / API日志表实装后正式实现
    throw new NotFoundException(
      `API log ${id} not found / APIログ ${id} が見つかりません / API日志 ${id} 未找到`,
    );
  }
}
