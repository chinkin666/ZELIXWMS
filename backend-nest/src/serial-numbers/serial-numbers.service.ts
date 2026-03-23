// シリアル番号サービス / 序列号服务
// NOTE: シリアル番号は stockQuants テーブルを利用するプレースホルダー実装
// 注意: 序列号使用 stockQuants 表的占位符实现
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { DRIZZLE } from '../database/database.module.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  productId?: string;
  status?: string;
}

@Injectable()
export class SerialNumbersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // シリアル番号一覧取得（プレースホルダー）/ 获取序列号列表（占位符）
  // TODO: [stub] stockQuantsテーブルからシリアル番号データ取得を実装 / 实现从stockQuants表获取序列号数据
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));

    // TODO: [stub] プレースホルダー: stockQuants から取得 / 占位符: 从 stockQuants 获取
    return createPaginatedResult([], 0, page, limit);
  }

  // シリアル番号ID検索（プレースホルダー）/ 按ID查找序列号（占位符）
  async findById(tenantId: string, id: string) {
    // プレースホルダー / 占位符
    throw new WmsException('SERIAL_NOT_FOUND', `ID: ${id}`);
  }

  // シリアル番号登録（プレースホルダー）/ 创建序列号（占位符）
  async create(tenantId: string, dto: Record<string, unknown>) {
    // プレースホルダー / 占位符
    return {
      message: 'Serial number creation placeholder / シリアル番号登録プレースホルダー / 序列号创建占位符',
      tenantId,
      ...dto,
    };
  }

  // シリアル番号削除（プレースホルダー）/ 删除序列号（占位符）
  async remove(tenantId: string, id: string) {
    // プレースホルダー / 占位符
    throw new WmsException('SERIAL_NOT_FOUND', `ID: ${id}`);
  }
}
