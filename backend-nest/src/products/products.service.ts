// 商品サービス / 商品服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, or, ilike, isNull, inArray, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { products } from '../database/schema/products.js';
import type { CreateProductDto, UpdateProductDto } from './dto/create-product.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  sku?: string;
  name?: string;
  category?: string;
  brandCode?: string;
}

@Injectable()
export class ProductsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 商品一覧取得（テナント分離・ページネーション・検索）/ 获取商品列表（租户隔离・分页・搜索）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(products.tenantId, tenantId),
      isNull(products.deletedAt),
    ];

    if (query.sku) {
      conditions.push(ilike(products.sku, `%${query.sku}%`));
    }
    if (query.name) {
      conditions.push(ilike(products.name, `%${query.name}%`));
    }
    if (query.category) {
      conditions.push(eq(products.category, query.category));
    }
    if (query.brandCode) {
      conditions.push(eq(products.brandCode, query.brandCode));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(products).where(where).limit(limit).offset(offset).orderBy(products.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 商品ID検索 / 按ID查找商品
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(products)
      .where(and(
        eq(products.id, id),
        eq(products.tenantId, tenantId),
        isNull(products.deletedAt),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('PROD_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 商品作成 / 创建商品
  async create(tenantId: string, dto: CreateProductDto) {
    // SKU重複チェック / SKU重复检查
    const existing = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(
        eq(products.tenantId, tenantId),
        eq(products.sku, dto.sku),
        isNull(products.deletedAt),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('PROD_DUPLICATE_SKU', `SKU: ${dto.sku}`);
    }

    // numeric型フィールドは文字列変換 / numeric类型字段转为字符串
    const insertData = {
      tenantId,
      ...dto,
      width: dto.width?.toString(),
      depth: dto.depth?.toString(),
      height: dto.height?.toString(),
      weight: dto.weight?.toString(),
      grossWeight: dto.grossWeight?.toString(),
      volume: dto.volume?.toString(),
      outerBoxWidth: dto.outerBoxWidth?.toString(),
      outerBoxDepth: dto.outerBoxDepth?.toString(),
      outerBoxHeight: dto.outerBoxHeight?.toString(),
      price: dto.price?.toString(),
      costPrice: dto.costPrice?.toString(),
      taxRate: dto.taxRate?.toString(),
    };

    const rows = await this.db.insert(products).values(insertData).returning();
    return rows[0];
  }

  // 商品更新 / 更新商品
  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // SKU変更時の重複チェック / SKU变更时的重复检查
    if (dto.sku) {
      const existing = await this.db
        .select({ id: products.id })
        .from(products)
        .where(and(
          eq(products.tenantId, tenantId),
          eq(products.sku, dto.sku),
          isNull(products.deletedAt),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('PROD_DUPLICATE_SKU', `SKU: ${dto.sku}`);
      }
    }

    // numeric型フィールドは文字列変換（undefinedの場合はスキップ）/ numeric字段转字符串（undefined时跳过）
    const updateData: Record<string, unknown> = { ...dto, updatedAt: new Date() };
    const numericFields = ['width', 'depth', 'height', 'weight', 'grossWeight', 'volume',
      'outerBoxWidth', 'outerBoxDepth', 'outerBoxHeight', 'price', 'costPrice', 'taxRate'];

    for (const field of numericFields) {
      if (updateData[field] !== undefined) {
        updateData[field] = updateData[field]?.toString();
      }
    }

    const rows = await this.db
      .update(products)
      .set(updateData)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 商品論理削除 / 商品软删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 商品全文検索（SKU/名前/バーコードでOR検索）/ 商品全文搜索（SKU/名称/条码 OR 搜索）
  async search(tenantId: string, query: string, pagination: { page?: number; limit?: number }) {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(200, Math.max(1, pagination.limit || 20));
    const offset = (page - 1) * limit;

    const searchTerm = `%${query}%`;

    // 検索条件: SKU OR 名前 OR バーコードJSONB含む / 搜索条件: SKU OR 名称 OR 条码JSONB包含
    const conditions: SQL[] = [
      eq(products.tenantId, tenantId),
      isNull(products.deletedAt),
    ];

    const searchCondition = or(
      ilike(products.sku, searchTerm),
      ilike(products.name, searchTerm),
      sql`${products.barcode}::text ILIKE ${searchTerm}`,
    );

    const where = and(...conditions, searchCondition);

    const [items, countResult] = await Promise.all([
      this.db.select().from(products).where(where).limit(limit).offset(offset).orderBy(products.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // バーコード検索（JSONB配列にコードが含まれるか検索）/ 按条码查找（搜索JSONB数组是否包含该编码）
  async findByBarcode(tenantId: string, code: string) {
    const rows = await this.db
      .select()
      .from(products)
      .where(and(
        eq(products.tenantId, tenantId),
        isNull(products.deletedAt),
        sql`${products.barcode} @> ${JSON.stringify([code])}::jsonb`,
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('PROD_NOT_FOUND', `Barcode: ${code}`);
    }
    return rows[0];
  }

  // 商品一括更新 / 商品批量更新
  async bulkUpdate(tenantId: string, ids: string[], data: Record<string, unknown>) {
    if (!ids || ids.length === 0) {
      return { updated: 0 };
    }

    // numeric型フィールドは文字列変換 / numeric字段转字符串
    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
    const numericFields = ['width', 'depth', 'height', 'weight', 'grossWeight', 'volume',
      'outerBoxWidth', 'outerBoxDepth', 'outerBoxHeight', 'price', 'costPrice', 'taxRate'];

    for (const field of numericFields) {
      if (updateData[field] !== undefined) {
        updateData[field] = updateData[field]?.toString();
      }
    }

    const rows = await this.db
      .update(products)
      .set(updateData)
      .where(and(
        eq(products.tenantId, tenantId),
        isNull(products.deletedAt),
        inArray(products.id, ids),
      ))
      .returning();

    return { updated: rows.length, items: rows };
  }

  // 商品一括論理削除 / 商品批量软删除
  async bulkDelete(tenantId: string, ids: string[]) {
    if (!ids || ids.length === 0) {
      return { deleted: 0 };
    }

    const now = new Date();
    const rows = await this.db
      .update(products)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(
        eq(products.tenantId, tenantId),
        isNull(products.deletedAt),
        inArray(products.id, ids),
      ))
      .returning();

    return { deleted: rows.length, items: rows };
  }
}
