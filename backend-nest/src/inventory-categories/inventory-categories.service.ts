// 在庫区分サービス / 库存分类服务
// NOTE: Express の InventoryCategory モデル（code/name/description/isDefault/isActive/sortOrder/colorLabel）に対応
// 注意: 对应 Express 的 InventoryCategory 模型（code/name/description/isDefault/isActive/sortOrder/colorLabel）
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { DRIZZLE } from '../database/database.module.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

// デフォルトカテゴリ定義 / 默认分类定义
const DEFAULT_CATEGORIES = [
  { code: 'normal', name: '通常 / 正常', description: '通常在庫 / 正常库存', isDefault: true, sortOrder: 1, colorLabel: 'green' },
  { code: 'return', name: '返品 / 退货', description: '返品在庫 / 退货库存', isDefault: true, sortOrder: 2, colorLabel: 'orange' },
  { code: 'defective', name: '不良品 / 次品', description: '不良品在庫 / 次品库存', isDefault: true, sortOrder: 3, colorLabel: 'red' },
];

@Injectable()
export class InventoryCategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 在庫区分一覧取得（プレースホルダー）/ 获取库存分类列表（占位符）
  // TODO: [stub] 在庫区分テーブル作成後に実データ取得を実装 / 创建库存分类表后实现实际数据获取
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));

    // TODO: [stub] プレースホルダー: 在庫区分テーブルからデータ取得を実装 / 占位符: 实现从库存分类表获取数据
    return createPaginatedResult([], 0, page, limit);
  }

  // 在庫区分ID検索（プレースホルダー）/ 按ID查找库存分类（占位符）
  async findById(tenantId: string, id: string) {
    throw new WmsException('INV_CATEGORY_NOT_FOUND', `ID: ${id}`);
  }

  // 在庫区分作成（プレースホルダー）/ 创建库存分类（占位符）
  async create(tenantId: string, dto: Record<string, unknown>) {
    return {
      message: 'Inventory category creation placeholder / 在庫区分作成プレースホルダー / 库存分类创建占位符',
      tenantId,
      ...dto,
    };
  }

  // 在庫区分更新（プレースホルダー）/ 更新库存分类（占位符）
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    throw new WmsException('INV_CATEGORY_NOT_FOUND', `ID: ${id}`);
  }

  // 在庫区分削除（プレースホルダー）/ 删除库存分类（占位符）
  async remove(tenantId: string, id: string) {
    throw new WmsException('INV_CATEGORY_NOT_FOUND', `ID: ${id}`);
  }

  // デフォルトカテゴリ初期化（プレースホルダー）/ 初始化默认分类（占位符）
  async seedDefaults(tenantId: string) {
    // プレースホルダー: 将来テーブル作成後に DEFAULT_CATEGORIES を挿入
    // 占位符: 将来创建表后插入 DEFAULT_CATEGORIES
    return {
      message: 'Seed defaults placeholder / デフォルト初期化プレースホルダー / 默认分类初始化占位符',
      tenantId,
      defaults: DEFAULT_CATEGORIES,
    };
  }
}
