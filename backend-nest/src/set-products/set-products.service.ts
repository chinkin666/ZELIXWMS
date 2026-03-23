// セット商品サービス / 组合商品服务
// NOTE: products テーブルの isSetProduct フラグで管理するプレースホルダー実装
// 注意: 通过 products 表的 isSetProduct 标志管理的占位符实现
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { DRIZZLE } from '../database/database.module.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
}

@Injectable()
export class SetProductsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // セット商品一覧取得（プレースホルダー）/ 获取组合商品列表（占位符）
  // TODO: [stub] productsテーブルのisSetProductフラグを使って実データ取得を実装
  // 使用products表的isSetProduct标志实现实际数据获取
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));

    // TODO: [stub] プレースホルダー: products テーブルから isSetProduct=true を取得
    // 占位符: 从 products 表获取 isSetProduct=true
    return createPaginatedResult([], 0, page, limit);
  }

  // セット商品ID検索（プレースホルダー）/ 按ID查找组合商品（占位符）
  async findById(tenantId: string, id: string) {
    throw new WmsException('SET_PRODUCT_NOT_FOUND', `ID: ${id}`);
  }

  // セット商品作成（プレースホルダー）/ 创建组合商品（占位符）
  async create(tenantId: string, dto: Record<string, unknown>) {
    return {
      message: 'Set product creation placeholder / セット商品作成プレースホルダー / 组合商品创建占位符',
      tenantId,
      ...dto,
    };
  }

  // セット商品更新（プレースホルダー）/ 更新组合商品（占位符）
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    throw new WmsException('SET_PRODUCT_NOT_FOUND', `ID: ${id}`);
  }

  // セット商品削除（プレースホルダー）/ 删除组合商品（占位符）
  async remove(tenantId: string, id: string) {
    throw new WmsException('SET_PRODUCT_NOT_FOUND', `ID: ${id}`);
  }
}
