// マッピング設定サービス / 映射配置服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { mappingConfigs } from '../database/schema/templates.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  configType?: string;
}

@Injectable()
export class MappingConfigsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 一覧取得 / 获取列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(mappingConfigs.tenantId, tenantId)];
    if (query.configType) {
      conditions.push(eq(mappingConfigs.configType, query.configType));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db.select().from(mappingConfigs).where(where).limit(limit).offset(offset).orderBy(mappingConfigs.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(mappingConfigs).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ID検索 / 按ID查找
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(mappingConfigs)
      .where(and(eq(mappingConfigs.id, id), eq(mappingConfigs.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('TEMPLATE_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 作成 / 创建
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(mappingConfigs)
      .values({ tenantId, ...dto } as any)
      .returning();
    return rows[0];
  }

  // 更新 / 更新
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(mappingConfigs)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(and(eq(mappingConfigs.id, id), eq(mappingConfigs.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 削除 / 删除
  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(mappingConfigs)
      .where(and(eq(mappingConfigs.id, id), eq(mappingConfigs.tenantId, tenantId)))
      .returning();
    return rows[0];
  }
}
