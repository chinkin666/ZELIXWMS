// 棚卸オーダーサービス / 盘点订单服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, desc, gte, lte, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { stocktakingOrders, stocktakingDiscrepancies, stocktakingLines } from '../database/schema/warehouse-ops.js';
import { stockQuants, stockMoves, locations } from '../database/schema/inventory.js';
import { products } from '../database/schema/products.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

// 有効な棚卸区分 / 有效的盘点区分
const VALID_STOCKTAKING_CATEGORIES = ['full', 'partial', 'random', 'cyclic'] as const;
type StocktakingCategory = typeof VALID_STOCKTAKING_CATEGORIES[number];

// 検索クエリ / 查询参数
interface FindStocktakingQuery {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  stocktakingCategory?: string;
}

// 許容誤差チェック結果行 / 容差检查结果行
export interface ToleranceCheckLine {
  lineId: string;
  productId: string;
  locationId: string | null;
  systemQuantity: number;
  countedQuantity: number | null;
  discrepancy: number;
  toleranceLimit: number;
  // ケース入荷品 → ±0.03%, ピース入荷品 → 0% / 箱入库品 → ±0.03%, 件入库品 → 0%
  unitType: string | null;
  // 判定: pass (許容範囲内) / fail (許容範囲外) / 判定: pass (在容差范围内) / fail (超出容差范围)
  judgment: 'pass' | 'fail' | 'uncounted';
}

@Injectable()
export class StocktakingOrdersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 一覧取得（テナント分離・ページネーション）/ 获取列表（租户隔离・分页）
  async findAll(tenantId: string, query: FindStocktakingQuery = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(stocktakingOrders.tenantId, tenantId),
    ];

    if (query.status) {
      conditions.push(eq(stocktakingOrders.status, query.status));
    }
    if (query.type) {
      conditions.push(eq(stocktakingOrders.type, query.type));
    }
    // 棚卸区分フィルタ / 盘点区分过滤
    if (query.stocktakingCategory) {
      conditions.push(eq(stocktakingOrders.stocktakingCategory, query.stocktakingCategory));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(stocktakingOrders)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(stocktakingOrders.createdAt)),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(stocktakingOrders)
        .where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ID検索 / 按ID查找
  async findOne(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(stocktakingOrders)
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('STOCKTAKING_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 作成（棚卸区分バリデーション付き）/ 创建（含盘点区分验证）
  async create(tenantId: string, dto: Record<string, unknown>) {
    // 注文番号の自動生成 / 自动生成订单号
    const orderNumber = dto.orderNumber as string || `STK-${Date.now()}`;

    // 棚卸区分バリデーション / 盘点区分验证
    const stocktakingCategory = (dto.stocktakingCategory as string) || 'full';
    if (!VALID_STOCKTAKING_CATEGORIES.includes(stocktakingCategory as StocktakingCategory)) {
      throw new WmsException(
        'VALIDATION_ERROR',
        `Invalid stocktakingCategory: ${stocktakingCategory}. Valid values: ${VALID_STOCKTAKING_CATEGORIES.join(', ')} / 无效的盘点区分: ${stocktakingCategory}。有效值: ${VALID_STOCKTAKING_CATEGORIES.join(', ')} / 無効な棚卸区分: ${stocktakingCategory}。有効値: ${VALID_STOCKTAKING_CATEGORIES.join(', ')}`,
      );
    }

    const rows = await this.db
      .insert(stocktakingOrders)
      .values({
        tenantId,
        orderNumber,
        type: dto.type as string,
        status: 'draft',
        warehouseId: dto.warehouseId as string,
        locationIds: dto.locationIds ?? [],
        productIds: dto.productIds ?? [],
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate as string) : null,
        memo: dto.memo as string ?? null,
        items: dto.items ?? [],
        // 新フィールド / 新字段
        title: (dto.title as string) ?? null,
        clientId: (dto.clientId as string) ?? null,
        stocktakingCategory,
        locationFrom: (dto.locationFrom as string) ?? null,
        locationTo: (dto.locationTo as string) ?? null,
        instructionDate: dto.instructionDate ? new Date(dto.instructionDate as string) : null,
      })
      .returning();

    return rows[0];
  }

  // 更新 / 更新
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findOne(tenantId, id);

    // 棚卸区分バリデーション（指定時のみ）/ 盘点区分验证（仅在指定时）
    if (dto.stocktakingCategory !== undefined) {
      const cat = dto.stocktakingCategory as string;
      if (!VALID_STOCKTAKING_CATEGORIES.includes(cat as StocktakingCategory)) {
        throw new WmsException(
          'VALIDATION_ERROR',
          `Invalid stocktakingCategory: ${cat} / 无效的盘点区分 / 無効な棚卸区分`,
        );
      }
    }

    // 更新不可フィールドを除外 / 排除不可更新字段
    const { id: _id, tenantId: _tid, createdAt: _ca, ...updateData } = dto;

    const rows = await this.db
      .update(stocktakingOrders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // 削除（論理削除）/ 删除（软删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findOne(tenantId, id);

    const rows = await this.db
      .update(stocktakingOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // カウント登録（棚卸明細にカウント結果を追加）/ 登记计数（在盘点明细中添加计数结果）
  async registerCount(tenantId: string, id: string, body: Record<string, unknown>) {
    const order = await this.findOne(tenantId, id);

    // ステータスチェック / 状态检查
    if (order.status !== 'draft' && order.status !== 'in_progress') {
      throw new WmsException('STOCKTAKING_INVALID_STATUS', `Cannot register count for status: ${order.status}`);
    }

    // 既存のitemsにカウント結果を追加/更新 / 在现有items中添加/更新计数结果
    const existingItems = Array.isArray(order.items) ? [...order.items] : [];
    const countData = body.items ?? body;

    // 新しいカウントデータを追加 / 添加新的计数数据
    const updatedItems = Array.isArray(countData)
      ? [...existingItems, ...countData as unknown[]]
      : [...existingItems, countData];

    const rows = await this.db
      .update(stocktakingOrders)
      .set({
        items: updatedItems,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // ========================================================
  // #2 棚卸進捗ダッシュボード / 盘点进度看板
  // ========================================================
  async getProgress(tenantId: string, orderId: string) {
    // 棚卸指示の存在確認 / 确认盘点单存在
    await this.findOne(tenantId, orderId);

    // stocktaking_lines から進捗を集計 / 从stocktaking_lines聚合进度
    const lines = await this.db
      .select()
      .from(stocktakingLines)
      .where(and(
        eq(stocktakingLines.tenantId, tenantId),
        eq(stocktakingLines.stocktakingOrderId, orderId),
      ));

    const totalSlots = lines.length;

    // ステータス集計 / 状态统计
    // 未棚卸: countedQuantity が null / 未盘点: countedQuantity 为 null
    // 差異なし: counted != null && discrepancy == 0 / 无差异
    // 差異あり: counted != null && discrepancy != 0 / 有差异
    let uncounted = 0;
    let noDiscrepancy = 0;
    let hasDiscrepancy = 0;
    let totalActualItems = 0;
    let totalActualPieces = 0;

    for (const line of lines) {
      if (line.countedQuantity === null || line.countedQuantity === undefined) {
        uncounted++;
      } else {
        totalActualItems++;
        totalActualPieces += line.countedQuantity;
        const diff = line.discrepancy ?? (line.countedQuantity - line.systemQuantity);
        if (diff === 0) {
          noDiscrepancy++;
        } else {
          hasDiscrepancy++;
        }
      }
    }

    const completedSlots = noDiscrepancy + hasDiscrepancy;
    const progressPercent = totalSlots > 0
      ? Math.round((completedSlots / totalSlots) * 10000) / 100
      : 0;

    // 棚卸オーダーの集計フィールドを更新 / 更新盘点单的汇总字段
    await this.db
      .update(stocktakingOrders)
      .set({
        totalSlots,
        completedSlots,
        actualItemCount: totalActualItems,
        actualPieceCount: totalActualPieces,
        updatedAt: new Date(),
      })
      .where(and(
        eq(stocktakingOrders.id, orderId),
        eq(stocktakingOrders.tenantId, tenantId),
      ));

    return {
      orderId,
      totalSlots,
      completedSlots,
      progressPercent,
      countsByStatus: {
        // 未棚卸 / 未盘点
        uncounted,
        // 差異なし / 无差异
        noDiscrepancy,
        // 差異あり / 有差异
        hasDiscrepancy,
      },
    };
  }

  // ========================================================
  // #3 許容誤差チェック / 容差检查
  // ========================================================
  async checkTolerance(tenantId: string, orderId: string): Promise<{
    orderId: string;
    overallJudgment: 'pass' | 'fail';
    lines: ToleranceCheckLine[];
  }> {
    // 棚卸指示の存在確認 / 确认盘点单存在
    await this.findOne(tenantId, orderId);

    // 棚卸明細行を取得 / 获取盘点明细行
    const lines = await this.db
      .select()
      .from(stocktakingLines)
      .where(and(
        eq(stocktakingLines.tenantId, tenantId),
        eq(stocktakingLines.stocktakingOrderId, orderId),
      ));

    const resultLines: ToleranceCheckLine[] = [];
    let overallPass = true;

    for (const line of lines) {
      // 未カウント行はスキップ / 跳过未计数行
      if (line.countedQuantity === null || line.countedQuantity === undefined) {
        resultLines.push({
          lineId: line.id,
          productId: line.productId,
          locationId: line.locationId,
          systemQuantity: line.systemQuantity,
          countedQuantity: null,
          discrepancy: 0,
          toleranceLimit: 0,
          unitType: null,
          judgment: 'uncounted',
        });
        continue;
      }

      // 商品の単位区分を取得 / 获取商品的单位类型
      const [product] = await this.db
        .select({ unitType: products.unitType })
        .from(products)
        .where(eq(products.id, line.productId))
        .limit(1);

      const unitType = product?.unitType ?? null;
      const diff = Math.abs(line.countedQuantity - line.systemQuantity);

      // 許容誤差計算 / 容差计算
      // ケース入荷品 (unitType == '02') → ±0.03% / 箱入库品 → ±0.03%
      // ピース入荷品 (それ以外) → 0% (完全一致) / 件入库品 → 0% (完全一致)
      const isCase = unitType === '02';
      const toleranceLimit = isCase
        ? Math.ceil(line.systemQuantity * 0.0003)
        : 0;

      const judgment: 'pass' | 'fail' = diff <= toleranceLimit ? 'pass' : 'fail';

      if (judgment === 'fail') {
        overallPass = false;
      }

      resultLines.push({
        lineId: line.id,
        productId: line.productId,
        locationId: line.locationId,
        systemQuantity: line.systemQuantity,
        countedQuantity: line.countedQuantity,
        discrepancy: line.countedQuantity - line.systemQuantity,
        toleranceLimit,
        unitType,
        judgment,
      });
    }

    return {
      orderId,
      overallJudgment: overallPass ? 'pass' : 'fail',
      lines: resultLines,
    };
  }

  // ========================================================
  // #4 棚卸確定 → 在庫修正 / 盘点确定 → 库存调整
  // ========================================================
  async complete(tenantId: string, id: string) {
    const order = await this.findOne(tenantId, id);

    // ステータスチェック / 状态检查
    if (order.status !== 'in_progress') {
      throw new WmsException('STOCKTAKING_INVALID_STATUS', `Cannot complete from status: ${order.status}`);
    }

    // 許容誤差チェックで全体判定を取得 / 通过容差检查获取整体判定
    const toleranceResult = await this.checkTolerance(tenantId, id);
    const overallJudgment = toleranceResult.overallJudgment;
    const now = new Date();

    // トランザクション内で確定処理を実行 / 在事务中执行确定处理
    const result = await this.db.transaction(async (tx) => {
      // 承認済み差異行の在庫調整を実行 / 执行已批准差异行的库存调整
      const approvedDiscrepancies = await tx
        .select()
        .from(stocktakingDiscrepancies)
        .where(and(
          eq(stocktakingDiscrepancies.tenantId, tenantId),
          eq(stocktakingDiscrepancies.stocktakingOrderId, id),
          eq(stocktakingDiscrepancies.status, 'approved'),
        ));

      for (const disc of approvedDiscrepancies) {
        // 在庫移動レコードを作成 / 创建库存移动记录
        const moveNumber = `ADJ-STK-${Date.now()}-${disc.id.slice(0, 8)}`;
        await tx.insert(stockMoves).values({
          tenantId,
          moveNumber,
          moveType: 'adjustment',
          status: 'done',
          productId: disc.productId,
          // 差異が正の場合: toLocation（入庫）、負の場合: fromLocation（出庫）
          // 差异为正: toLocation（入库）、为负: fromLocation（出库）
          fromLocationId: disc.discrepancy < 0 ? disc.locationId : null,
          toLocationId: disc.discrepancy > 0 ? disc.locationId : null,
          quantity: Math.abs(disc.discrepancy),
          referenceType: 'adjustment',
          referenceId: id,
          referenceNumber: order.orderNumber,
          reason: `棚卸差異調整 / 盘点差异调整 (discrepancy: ${disc.discrepancy})`,
          executedAt: now,
        });

        // stock_quants を実棚数に更新 / 将stock_quants更新为实际盘点数
        await tx
          .update(stockQuants)
          .set({
            quantity: disc.countedQuantity,
            lastMovedAt: now,
            updatedAt: now,
          })
          .where(and(
            eq(stockQuants.tenantId, tenantId),
            eq(stockQuants.productId, disc.productId),
            eq(stockQuants.locationId, disc.locationId),
          ));

        // 差異レコードを adjusted に更新 / 将差异记录更新为adjusted
        await tx
          .update(stocktakingDiscrepancies)
          .set({ status: 'adjusted' })
          .where(eq(stocktakingDiscrepancies.id, disc.id));
      }

      // 棚卸オーダーを完了に更新 / 将盘点单更新为完成
      const [updated] = await tx
        .update(stocktakingOrders)
        .set({
          status: 'completed',
          completedAt: now,
          confirmedAt: now,
          judgment: overallJudgment,
          updatedAt: now,
        })
        .where(and(
          eq(stocktakingOrders.id, id),
          eq(stocktakingOrders.tenantId, tenantId),
        ))
        .returning();

      return updated;
    });

    return result;
  }

  // ========================================================
  // #5 在庫から棚卸明細行を自動生成 / 从库存自动生成盘点明细行
  // ========================================================
  async generateLines(tenantId: string, orderId: string) {
    const order = await this.findOne(tenantId, orderId);

    // draft/in_progress のみ生成可能 / 仅draft/in_progress可以生成
    if (order.status !== 'draft' && order.status !== 'in_progress') {
      throw new WmsException(
        'STOCKTAKING_INVALID_STATUS',
        `Cannot generate lines for status: ${order.status} / ステータス ${order.status} では明細生成不可 / 状态 ${order.status} 不能生成明细`,
      );
    }

    // 在庫クエリ条件を構築 / 构建库存查询条件
    const quantConditions: SQL[] = [
      eq(stockQuants.tenantId, tenantId),
    ];

    // 棚番号範囲フィルタ（locationFrom/locationTo 指定時）
    // 库位编号范围过滤（指定locationFrom/locationTo时）
    if (order.locationFrom || order.locationTo) {
      // locations テーブルと結合してコードで範囲フィルタ / 与locations表连接按编码范围过滤
      const locationConditions: SQL[] = [
        eq(locations.tenantId, tenantId),
      ];
      if (order.locationFrom) {
        locationConditions.push(gte(locations.code, order.locationFrom));
      }
      if (order.locationTo) {
        locationConditions.push(lte(locations.code, order.locationTo));
      }

      const filteredLocations = await this.db
        .select({ id: locations.id })
        .from(locations)
        .where(and(...locationConditions));

      const locationIdSet = filteredLocations.map((l) => l.id);

      if (locationIdSet.length === 0) {
        return { generated: 0, lines: [] };
      }

      // IN句で絞り込み / 用IN子句过滤
      quantConditions.push(
        sql`${stockQuants.locationId} = ANY(${sql.raw(`ARRAY[${locationIdSet.map((lid) => `'${lid}'::uuid`).join(',')}]`)})`,
      );
    }

    // productIds フィルタ（部分棚卸用）/ productIds过滤（部分盘点用）
    const productIdList = order.productIds as string[] | null;
    if (productIdList && Array.isArray(productIdList) && productIdList.length > 0) {
      quantConditions.push(
        sql`${stockQuants.productId} = ANY(${sql.raw(`ARRAY[${productIdList.map((pid) => `'${pid}'::uuid`).join(',')}]`)})`,
      );
    }

    // locationIds フィルタ / locationIds过滤
    const locationIdList = order.locationIds as string[] | null;
    if (locationIdList && Array.isArray(locationIdList) && locationIdList.length > 0) {
      quantConditions.push(
        sql`${stockQuants.locationId} = ANY(${sql.raw(`ARRAY[${locationIdList.map((lid) => `'${lid}'::uuid`).join(',')}]`)})`,
      );
    }

    // stock_quants からデータ取得 / 从stock_quants获取数据
    const quants = await this.db
      .select()
      .from(stockQuants)
      .where(and(...quantConditions));

    if (quants.length === 0) {
      return { generated: 0, lines: [] };
    }

    // 棚卸明細行を作成 / 创建盘点明细行
    // countedQuantity は null（カウント待ち）/ countedQuantity为null（等待计数）
    const lineValues = quants.map((q) => ({
      tenantId,
      stocktakingOrderId: orderId,
      productId: q.productId,
      locationId: q.locationId,
      countRound: 1,
      systemQuantity: q.quantity,
      countedQuantity: null as number | null,
      discrepancy: null as number | null,
      lotId: q.lotId,
    }));

    const created = await this.db
      .insert(stocktakingLines)
      .values(lineValues)
      .returning();

    // オーダーの理論数を更新 / 更新盘点单的理论数
    const theoreticalItemCount = created.length;
    const theoreticalPieceCount = created.reduce((sum, l) => sum + l.systemQuantity, 0);

    await this.db
      .update(stocktakingOrders)
      .set({
        totalSlots: theoreticalItemCount,
        theoreticalItemCount,
        theoreticalPieceCount,
        updatedAt: new Date(),
      })
      .where(and(
        eq(stocktakingOrders.id, orderId),
        eq(stocktakingOrders.tenantId, tenantId),
      ));

    return { generated: created.length, lines: created };
  }

  // キャンセル / 取消
  async cancel(tenantId: string, id: string) {
    const order = await this.findOne(tenantId, id);

    // 完了済みはキャンセル不可 / 已完成的不可取消
    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new WmsException('STOCKTAKING_INVALID_STATUS', `Cannot cancel from status: ${order.status}`);
    }

    const rows = await this.db
      .update(stocktakingOrders)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }
}
