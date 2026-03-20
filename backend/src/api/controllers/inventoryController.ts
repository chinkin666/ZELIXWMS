/**
 * 在庫コントローラー / Inventory Controller
 *
 * HTTP リクエスト/レスポンスの薄いラッパー。
 * Thin wrapper over inventoryService for HTTP req/res handling.
 * ビジネスロジックは inventoryService に委譲する。
 */
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { reserveStockForOrder } from '@/services/stockService';
import * as inventoryService from '@/services/inventoryService';
import { AppError } from '@/lib/errors';
import { getWarehouseFilter } from '@/api/helpers/tenantHelper';
import { Location } from '@/models/location';
import { InventoryLedger } from '@/models/inventoryLedger';
import { Product } from '@/models/product';

/**
 * エラーレスポンスヘルパー / Error response helper
 * AppError はステータスコードを保持、それ以外は 500
 */
function handleError(res: Response, error: unknown, fallbackMessage: string): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message, code: error.code, details: error.details });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  res.status(500).json({ message: fallbackMessage, error: message });
}

/** 在庫一覧（StockQuant） / List stock */
export const listStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, productSku, locationId, showZero, stockType } = req.query;

    // 倉庫フィルタ → ロケーションIDに変換 / 仓库过滤 → 转换为库位ID
    let locationIds: string[] | undefined;
    const whFilter = getWarehouseFilter(req);

    // stockType フィルタ: 指定された場合、該当 stockType のロケーションに絞り込む
    // stockType 过滤: 指定时，筛选对应 stockType 的库位
    const locQuery: Record<string, unknown> = {};
    if (whFilter.length > 0) {
      locQuery.warehouseId = { $in: whFilter };
    }
    if (typeof stockType === 'string' && stockType.trim()) {
      locQuery.stockType = stockType.trim();
    }

    if (Object.keys(locQuery).length > 0) {
      const locs = await Location.find(locQuery).select('_id').lean();
      locationIds = locs.map(l => l._id.toString());
    }

    const quants = await inventoryService.listStock({
      productId: typeof productId === 'string' ? productId.trim() : undefined,
      productSku: typeof productSku === 'string' ? productSku.trim() : undefined,
      locationId: typeof locationId === 'string' ? locationId.trim() : undefined,
      showZero: showZero === 'true',
      locationIds,
    });
    res.json(quants);
  } catch (error) {
    handleError(res, error, '在庫一覧の取得に失敗しました');
  }
};

/** 在庫集計（商品単位） / Inventory summary */
export const listStockSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, stockType } = req.query;

    // stockType フィルタ: 指定された場合、該当 stockType のロケーションに絞り込む
    // stockType 过滤: 指定时，筛选对应 stockType 的库位
    let locationIds: string[] | undefined;
    if (typeof stockType === 'string' && stockType.trim()) {
      const locs = await Location.find({ stockType: stockType.trim() }).select('_id').lean();
      locationIds = locs.map(l => l._id.toString());
    }

    const summary = await inventoryService.getInventorySummary({
      search: typeof search === 'string' ? search.trim() : undefined,
      locationIds,
    });
    res.json(summary);
  } catch (error) {
    handleError(res, error, '在庫集計の取得に失敗しました');
  }
};

/** 商品別在庫詳細 / Product stock detail */
export const getProductStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const quants = await inventoryService.getProductStock(productId);
    res.json(quants);
  } catch (error) {
    handleError(res, error, '商品別在庫の取得に失敗しました');
  }
};

/** 在庫調整（棚卸し） / Stock adjustment */
export const adjustStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, locationId, lotId, adjustQuantity, memo } = req.body;
    const result = await inventoryService.adjustStock({
      productId,
      locationId,
      lotId,
      adjustQuantity,
      memo,
    });
    res.json(result);
  } catch (error) {
    handleError(res, error, '在庫調整に失敗しました');
  }
};

/** 入出庫履歴 / Movement history */
export const listMovements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, moveType, state, page, limit } = req.query;
    const result = await inventoryService.listMovements(
      {
        productId: typeof productId === 'string' ? productId.trim() : undefined,
        moveType: typeof moveType === 'string' ? moveType.trim() : undefined,
        state: typeof state === 'string' ? state.trim() : undefined,
      },
      {
        page: Number(page) || undefined,
        limit: Number(limit) || undefined,
      },
    );
    res.json(result);
  } catch (error) {
    handleError(res, error, '入出庫履歴の取得に失敗しました');
  }
};

/** 安全在庫割れアラート / Low stock alerts */
export const listLowStockAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await inventoryService.listLowStockAlerts();
    res.json(alerts);
  } catch (error) {
    handleError(res, error, '安全在庫アラートの取得に失敗しました');
  }
};

/** 出荷引当（出荷作業画面から手動実行） / Reserve stock for shipment orders */
export const reserveOrdersStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'ids（出荷指示IDの配列）は必須です' });
      return;
    }

    const validIds = ids.filter((id: any) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      res.status(400).json({ message: '有効なIDがありません' });
      return;
    }

    const orders = await ShipmentOrder.find({
      _id: { $in: validIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
    }).lean();

    const results: Array<{
      orderId: string;
      orderNumber: string;
      reservationCount: number;
      errors: string[];
    }> = [];

    for (const order of orders) {
      const products = (order.products || []).map((p: any) => ({
        productId: p.productId,
        productSku: p.productSku,
        productName: p.productName,
        inputSku: p.inputSku,
        quantity: p.quantity,
      }));

      const result = await reserveStockForOrder(String(order._id), order.orderNumber, products);

      results.push({
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        reservationCount: result.reservations.length,
        errors: result.errors,
      });
    }

    const totalReserved = results.reduce((sum, r) => sum + r.reservationCount, 0);
    const allErrors = results.flatMap((r) => r.errors);

    res.json({
      message: `${orders.length}件の出荷指示に対して在庫引当を実行しました（${totalReserved}件引当）`,
      results,
      totalReserved,
      errors: allErrors,
    });
  } catch (error) {
    handleError(res, error, '在庫引当に失敗しました');
  }
};

/** 在庫移動（ロケーション間） / Inter-location transfer */
export const transferStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, fromLocationId, toLocationId, quantity, lotId, memo } = req.body;
    const result = await inventoryService.transferStock({
      productId,
      fromLocationId,
      toLocationId,
      quantity,
      lotId,
      memo,
    });
    res.json(result);
  } catch (error) {
    handleError(res, error, '在庫移動に失敗しました');
  }
};

/** 一括在庫調整 / Bulk stock adjustment */
export const bulkAdjustStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { adjustments } = req.body;
    const result = await inventoryService.bulkAdjustStock(adjustments);
    res.json(result);
  } catch (error) {
    handleError(res, error, '一括調整に失敗しました');
  }
};

/**
 * 在庫概況ダッシュボード / 库存概览仪表板
 * KPI: 商品数、総在庫数、低在庫警告数、期限切れ近い商品数、ロケーション使用率
 */
export const getInventoryOverview = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { StockQuant } = await import('@/models/stockQuant');
    const { Lot } = await import('@/models/lot');
    const { Location } = await import('@/models/location');

    // 1. 在庫がある商品数 + 総在庫数 / 有库存的商品数 + 总库存数
    const stockAgg = await StockQuant.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          distinctProducts: { $addToSet: '$productId' },
          totalQuantity: { $sum: '$quantity' },
          totalReserved: { $sum: '$reservedQuantity' },
        },
      },
    ]);
    const stockData = stockAgg[0] || { distinctProducts: [], totalQuantity: 0, totalReserved: 0 };

    // 2. 低在庫（在庫5以下の商品）/ 低库存（库存5以下）
    const lowStockAgg = await StockQuant.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      { $group: { _id: '$productId', totalQty: { $sum: '$quantity' } } },
      { $match: { totalQty: { $lte: 5 } } },
      { $count: 'count' },
    ]);
    const lowStockCount = lowStockAgg[0]?.count || 0;

    // 3. 期限切れ近い商品（30日以内）/ 即将过期（30天内）
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringLots = await Lot.find({
      status: 'active',
      expiryDate: { $lte: thirtyDaysLater, $gte: now },
    }).lean();

    // 既に期限切れ / 已过期
    const expiredLots = await Lot.countDocuments({
      status: 'active',
      expiryDate: { $lt: now },
    });

    // 4. ロケーション使用率 / 位置使用率
    const physicalLocations = await Location.countDocuments({
      type: { $not: /^virtual\// },
      isActive: true,
    });
    const usedLocations = await StockQuant.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      { $group: { _id: '$locationId' } },
      {
        $lookup: {
          from: 'locations',
          localField: '_id',
          foreignField: '_id',
          as: 'loc',
        },
      },
      { $unwind: '$loc' },
      { $match: { 'loc.type': { $not: /^virtual\// } } },
      { $count: 'count' },
    ]);
    const usedLocationCount = usedLocations[0]?.count || 0;

    // 5. 期限切れ近い商品の詳細（上位10件）/ 即将过期详情（前10件）
    const expiringDetails = expiringLots.slice(0, 10).map((lot: any) => ({
      lotNumber: lot.lotNumber,
      productSku: lot.productSku,
      productName: lot.productName,
      expiryDate: lot.expiryDate,
      daysRemaining: Math.ceil((new Date(lot.expiryDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    }));

    res.json({
      productCount: stockData.distinctProducts?.length || 0,
      totalQuantity: stockData.totalQuantity || 0,
      totalReserved: stockData.totalReserved || 0,
      availableQuantity: (stockData.totalQuantity || 0) - (stockData.totalReserved || 0),
      lowStockCount,
      expiringCount: expiringLots.length,
      expiredCount: expiredLots,
      locationUsage: {
        total: physicalLocations,
        used: usedLocationCount,
        percent: physicalLocations > 0 ? Math.round((usedLocationCount / physicalLocations) * 100) : 0,
      },
      expiringDetails,
    });
  } catch (error) {
    handleError(res, error, '在庫概況の取得に失敗しました');
  }
};

/**
 * ロケーション別使用状況 / 各位置使用情况
 * 各ロケーションの SKU 数と合計数量を返す
 * 返回每个位置的 SKU 数和合计数量
 */
export const getLocationUsage = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { StockQuant } = await import('@/models/stockQuant');
    const { Location } = await import('@/models/location');

    // 全物理ロケーション取得 / 获取所有物理位置
    const allLocations = await Location.find({
      type: { $not: /^virtual\// },
    })
      .sort({ sortOrder: 1, code: 1 })
      .lean();

    // StockQuant をロケーション単位で集計 / 按位置聚合库存
    const usageAgg = await StockQuant.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      {
        $group: {
          _id: '$locationId',
          skuCount: { $addToSet: '$productSku' },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      {
        $project: {
          _id: 1,
          skuCount: { $size: '$skuCount' },
          totalQuantity: 1,
        },
      },
    ]);

    // Map に変換 / 转换为 Map
    const usageMap = new Map<string, { skuCount: number; totalQuantity: number }>();
    for (const item of usageAgg) {
      usageMap.set(String(item._id), {
        skuCount: item.skuCount,
        totalQuantity: item.totalQuantity,
      });
    }

    // ロケーション情報と結合 / 合并位置信息和使用数据
    const result = allLocations.map((loc) => {
      const usage = usageMap.get(String(loc._id));
      return {
        locationId: String(loc._id),
        locationCode: loc.code,
        locationName: loc.name,
        locationType: loc.type,
        isActive: loc.isActive,
        skuCount: usage?.skuCount ?? 0,
        totalQuantity: usage?.totalQuantity ?? 0,
      };
    });

    res.json(result);
  } catch (error) {
    handleError(res, error, 'ロケーション使用状況の取得に失敗しました');
  }
};

/** 0在庫レコードのクリーンアップ / Cleanup zero-stock records */
export const cleanupZeroStock = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { deletedCount } = await inventoryService.cleanupZeroStock();
    res.json({ message: `${deletedCount}件の0在庫レコードを削除しました`, deletedCount });
  } catch (error) {
    handleError(res, error, '0在庫の削除に失敗しました');
  }
};

/**
 * 在庫リビルド（整合性チェック＆修復） / 库存重建（一致性检查与修复）
 * StockMove から在庫を再計算し、StockQuant との差異を報告する。
 * ?fix=true で差異を修正する。デフォルトはレポートのみ（安全）。
 *
 * Recalculates stock from StockMove records and reports discrepancies.
 * Use ?fix=true to actually correct StockQuant values. Default is report-only (safe).
 */
export const rebuildInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const fix = req.query.fix === 'true';
    const result = await inventoryService.rebuildInventory(fix);
    res.json(result);
  } catch (error) {
    handleError(res, error, '在庫リビルドに失敗しました / 库存重建失败');
  }
};

/**
 * 期限切れ引当の解放 / 过期预留释放
 * 指定分数（デフォルト30分）以上 confirmed のまま放置された引当を自動解放する。
 *
 * Releases reservations that have been in 'confirmed' state longer than
 * the specified timeout (default: 30 minutes).
 *
 * BullMQ 定期ジョブ（30分間隔）で自動実行済み。このAPIは手動実行用。
 * 已通过 BullMQ 定期任务（30分钟间隔）自动执行。此 API 为手动执行用。
 */
export const releaseExpiredReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    const timeoutMinutes = Number(req.query.timeoutMinutes) || 30;
    const result = await inventoryService.releaseExpiredReservations(timeoutMinutes);
    res.json({
      message: `${result.releasedCount}件の期限切れ引当を解放しました / 已释放${result.releasedCount}条过期预留`,
      ...result,
    });
  } catch (error) {
    handleError(res, error, '期限切れ引当の解放に失敗しました / 过期预留释放失败');
  }
};

/**
 * 受払一覧（在庫受払台帳サマリー） / 收付一览（库存收付台账摘要）
 *
 * 指定期間の商品別入出庫・調整・繰越残高を集計して返す。
 * 按指定期间汇总各商品的入库、出库、调整及期初期末余额。
 *
 * クエリパラメータ / 查询参数:
 *   - startDate (必須 / 必填): 期間開始日 / 期间开始日 (YYYY-MM-DD)
 *   - endDate   (必須 / 必填): 期間終了日 / 期间结束日 (YYYY-MM-DD)
 *   - productId (任意 / 可选): 商品IDで絞り込み / 按商品ID筛选
 */
export const getReceiptPaymentLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, productId } = req.query;

    // バリデーション / 参数校验
    if (!startDate || !endDate) {
      res.status(400).json({ message: 'startDate と endDate は必須です / startDate 和 endDate 为必填项' });
      return;
    }

    const start = new Date(String(startDate));
    const end = new Date(String(endDate));

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ message: '日付の形式が不正です（YYYY-MM-DD） / 日期格式无效（YYYY-MM-DD）' });
      return;
    }

    // endDate を当日末尾まで含める / endDate 包含到当天结束
    const endInclusive = new Date(end);
    endInclusive.setHours(23, 59, 59, 999);

    // 商品IDフィルタ / 商品ID过滤条件
    const productFilter: Record<string, unknown> = {};
    if (typeof productId === 'string' && productId.trim()) {
      productFilter.productId = new mongoose.Types.ObjectId(productId.trim());
    }

    // 1. 前期繰越（startDate より前の全数量合計） / 期初余额（startDate 之前的所有数量合计）
    const openingAgg = await InventoryLedger.aggregate([
      {
        $match: {
          ...productFilter,
          createdAt: { $lt: start },
        },
      },
      {
        $group: {
          _id: { productId: '$productId', productSku: '$productSku' },
          openingBalance: { $sum: '$quantity' },
        },
      },
    ]);

    // 2. 当期の入庫・出庫・調整を集計 / 当期入库、出库、调整汇总
    const periodAgg = await InventoryLedger.aggregate([
      {
        $match: {
          ...productFilter,
          createdAt: { $gte: start, $lte: endInclusive },
        },
      },
      {
        $group: {
          _id: { productId: '$productId', productSku: '$productSku' },
          // 入庫数: type='inbound' の数量合計 / 入库数: type='inbound' 的数量合计
          inboundQty: {
            $sum: { $cond: [{ $eq: ['$type', 'inbound'] }, '$quantity', 0] },
          },
          // 出庫数: type='outbound' の数量の絶対値合計 / 出库数: type='outbound' 的数量绝对值合计
          outboundQty: {
            $sum: { $cond: [{ $eq: ['$type', 'outbound'] }, { $abs: '$quantity' }, 0] },
          },
          // 調整数: type='adjustment' の数量合計 / 调整数: type='adjustment' 的数量合计
          adjustmentQty: {
            $sum: { $cond: [{ $eq: ['$type', 'adjustment'] }, '$quantity', 0] },
          },
          // 当期全変動合計（closingBalance 計算用） / 当期全部变动合计（用于计算期末余额）
          periodTotal: { $sum: '$quantity' },
        },
      },
    ]);

    // 全商品IDを収集 / 收集所有商品ID
    const productIds = new Set<string>();
    const openingMap = new Map<string, { productSku: string; openingBalance: number }>();
    for (const row of openingAgg) {
      const pid = String(row._id.productId);
      productIds.add(pid);
      openingMap.set(pid, {
        productSku: row._id.productSku,
        openingBalance: row.openingBalance,
      });
    }

    const periodMap = new Map<string, {
      productSku: string;
      inboundQty: number;
      outboundQty: number;
      adjustmentQty: number;
      periodTotal: number;
    }>();
    for (const row of periodAgg) {
      const pid = String(row._id.productId);
      productIds.add(pid);
      periodMap.set(pid, {
        productSku: row._id.productSku,
        inboundQty: row.inboundQty,
        outboundQty: row.outboundQty,
        adjustmentQty: row.adjustmentQty,
        periodTotal: row.periodTotal,
      });
    }

    // 商品名を取得 / 获取商品名称
    const products = await Product.find({
      _id: { $in: Array.from(productIds).map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select('_id name')
      .lean();
    const productNameMap = new Map<string, string>();
    for (const p of products) {
      productNameMap.set(String(p._id), p.name);
    }

    // 結果を組み立て / 组装结果
    const results = Array.from(productIds).map((pid) => {
      const opening = openingMap.get(pid);
      const period = periodMap.get(pid);
      const openingBalance = opening?.openingBalance ?? 0;
      const inboundQty = period?.inboundQty ?? 0;
      const outboundQty = period?.outboundQty ?? 0;
      const adjustmentQty = period?.adjustmentQty ?? 0;
      const periodTotal = period?.periodTotal ?? 0;

      return {
        productId: pid,
        productSku: period?.productSku ?? opening?.productSku ?? '',
        productName: productNameMap.get(pid) ?? '',
        // 前期繰越 / 期初余额
        openingBalance,
        // 入庫数 / 入库数
        inboundQty,
        // 出庫数 / 出库数
        outboundQty,
        // 調整数 / 调整数
        adjustmentQty,
        // 当期末残 = 前期繰越 + 当期全変動 / 期末余额 = 期初余额 + 当期全部变动
        closingBalance: openingBalance + periodTotal,
      };
    });

    // SKU 順にソート / 按 SKU 排序
    results.sort((a, b) => a.productSku.localeCompare(b.productSku));

    res.json(results);
  } catch (error) {
    handleError(res, error, '受払一覧の取得に失敗しました / 收付一览获取失败');
  }
};
