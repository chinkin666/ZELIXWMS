// 取扱注意ラベルタイプサービス / 处理注意标签类型服务
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { handlingLabelTypes } from '../database/schema/reference.js';

@Injectable()
export class HandlingLabelTypesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 全ラベルタイプ一覧取得（小データセット、ページネーション不要）
  // 获取全部标签类型（小数据集，无需分页）
  async findAll() {
    return this.db
      .select()
      .from(handlingLabelTypes)
      .orderBy(handlingLabelTypes.sortOrder);
  }
}
