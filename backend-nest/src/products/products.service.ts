// 商品サービス / 商品服务
import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ilike, isNull, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { products } from '../database/schema/products.js';
import type { CreateProductDto, UpdateProductDto } from './dto/create-product.dto.js';

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
    const limit = Math.min(100, Math.max(1, query.limit || 20));
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

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
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
      throw new NotFoundException(`Product ${id} not found / 商品 ${id} が見つかりません / 商品 ${id} 未找到`);
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
      throw new ConflictException(`SKU "${dto.sku}" already exists / SKU "${dto.sku}" は既に存在します / SKU "${dto.sku}" 已存在`);
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
        throw new ConflictException(`SKU "${dto.sku}" already exists / SKU "${dto.sku}" は既に存在します / SKU "${dto.sku}" 已存在`);
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
}
