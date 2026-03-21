// 配送業者サービス / 配送业者服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, or, ilike, isNull, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { carriers } from '../database/schema/carriers.js';
import type { CreateCarrierDto, UpdateCarrierDto } from './dto/create-carrier.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  code?: string;
  name?: string;
  enabled?: boolean;
}

@Injectable()
export class CarriersService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 配送業者一覧取得（共有＋テナント固有、ページネーション・検索対応）
  // 获取配送业者列表（共享＋租户专属，支持分页和搜索）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // テナント分離: 共有（tenantId IS NULL）＋テナント固有 / 租户隔离: 共享（tenantId IS NULL）＋租户专属
    const conditions: SQL[] = [
      or(
        isNull(carriers.tenantId),
        eq(carriers.tenantId, tenantId),
      )!,
    ];

    // コード検索 / 代码搜索
    if (query.code) {
      conditions.push(ilike(carriers.code, `%${query.code}%`));
    }
    // 名前検索 / 名称搜索
    if (query.name) {
      conditions.push(ilike(carriers.name, `%${query.name}%`));
    }
    // 有効フィルター / 有效过滤
    if (query.enabled !== undefined) {
      conditions.push(eq(carriers.enabled, query.enabled));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(carriers)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(carriers.sortOrder, carriers.createdAt),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(carriers)
        .where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  // 配送業者ID検索（共有またはテナント固有）/ 按ID查找配送业者（共享或租户专属）
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(carriers)
      .where(and(
        eq(carriers.id, id),
        or(
          isNull(carriers.tenantId),
          eq(carriers.tenantId, tenantId),
        ),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('CARRIER_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 配送業者作成 / 创建配送业者
  async create(tenantId: string, dto: CreateCarrierDto) {
    // コード重複チェック（共有＋テナント固有）/ 代码重复检查（共享＋租户专属）
    const existing = await this.db
      .select({ id: carriers.id })
      .from(carriers)
      .where(and(
        or(
          isNull(carriers.tenantId),
          eq(carriers.tenantId, tenantId),
        ),
        eq(carriers.code, dto.code),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Carrier code: ${dto.code}`);
    }

    const rows = await this.db
      .insert(carriers)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }

  // 配送業者更新（内置業者は更新不可）/ 更新配送业者（内置业者不可更新）
  async update(tenantId: string, id: string, dto: UpdateCarrierDto) {
    // 存在確認 / 确认存在
    const carrier = await this.findById(tenantId, id);

    // 内置チェック / 内置检查
    if (carrier.isBuiltIn) {
      throw new WmsException('CARRIER_BUILT_IN', `ID: ${id}`);
    }

    // コード変更時の重複チェック / 代码变更时的重复检查
    if (dto.code) {
      const existing = await this.db
        .select({ id: carriers.id })
        .from(carriers)
        .where(and(
          or(
            isNull(carriers.tenantId),
            eq(carriers.tenantId, tenantId),
          ),
          eq(carriers.code, dto.code),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Carrier code: ${dto.code}`);
      }
    }

    const rows = await this.db
      .update(carriers)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(
        eq(carriers.id, id),
        or(
          isNull(carriers.tenantId),
          eq(carriers.tenantId, tenantId),
        ),
      ))
      .returning();

    return rows[0];
  }

  // 配送業者削除（内置業者は削除不可、物理削除）/ 删除配送业者（内置业者不可删除，物理删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    const carrier = await this.findById(tenantId, id);

    // 内置チェック / 内置检查
    if (carrier.isBuiltIn) {
      throw new WmsException('CARRIER_BUILT_IN', `ID: ${id}`);
    }

    const rows = await this.db
      .delete(carriers)
      .where(and(
        eq(carriers.id, id),
        or(
          isNull(carriers.tenantId),
          eq(carriers.tenantId, tenantId),
        ),
      ))
      .returning();

    return rows[0];
  }
}
