/**
 * 在庫管理サービス / Inventory Management Service
 *
 * コントローラーから抽出したビジネスロジック。
 * Business logic extracted from inventoryController.
 * req/res に依存せず、型付きパラメータを受け取る。
 * Takes typed parameters, no dependency on req/res.
 */
import mongoose from 'mongoose';
import { StockQuant } from '@/models/stockQuant';
import { StockMove } from '@/models/stockMove';
import { Location } from '@/models/location';
import { Product } from '@/models/product';
import { Lot } from '@/models/lot';
import { generateSequenceNumber } from '@/utils/sequenceGenerator';
import { ValidationError, NotFoundError, AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { checkTransactionSupport } from '@/config/database';
import { logOperation } from '@/services/operationLogger';

// ─── Types / 型定義 ───────────────────────────────────────────

/** 在庫調整パラメータ / Stock adjustment parameters */
export interface AdjustStockParams {
  productId: string;
  locationId: string;
  lotId?: string;
  adjustQuantity: number;
  memo?: string;
}

/** 在庫調整結果 / Stock adjustment result */
export interface AdjustStockResult {
  message: string;
  moveNumber: string;
}

/** 在庫移動パラメータ / Stock transfer parameters */
export interface TransferStockParams {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  lotId?: string;
  memo?: string;
}

/** 在庫移動結果 / Stock transfer result */
export interface TransferStockResult {
  message: string;
  moveNumber: string;
}

/** 一括調整アイテム / Bulk adjustment item */
export interface BulkAdjustItem {
  productSku: string;
  locationCode: string;
  quantity: number;
  lotNumber?: string;
  memo?: string;
}

/** 一括調整結果 / Bulk adjustment result */
export interface BulkAdjustResult {
  message: string;
  successCount: number;
  failCount: number;
  errors: string[];
}

/** 在庫一覧フィルタ / Stock list filters */
export interface StockListFilters {
  productId?: string;
  productSku?: string;
  locationId?: string;
  showZero?: boolean;
}

/** 在庫集計フィルタ / Inventory summary filters */
export interface InventorySummaryFilters {
  search?: string;
}

/** 入出庫履歴フィルタ / Movement history filters */
export interface MovementFilters {
  productId?: string;
  moveType?: string;
  state?: string;
}

/** ページネーション / Pagination */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ─── Helper: 仮想ロケーション取得 / Get virtual locations ─────

interface VirtualLocations {
  supplier: mongoose.Document & { _id: mongoose.Types.ObjectId; code: string };
  customer: mongoose.Document & { _id: mongoose.Types.ObjectId; code: string };
}

async function getVirtualLocations(): Promise<VirtualLocations> {
  const [virtualSupplier, virtualCustomer] = await Promise.all([
    Location.findOne({ code: 'VIRTUAL/SUPPLIER' }).lean(),
    Location.findOne({ code: 'VIRTUAL/CUSTOMER' }).lean(),
  ]);
  if (!virtualSupplier || !virtualCustomer) {
    throw new AppError(
      '仮想ロケーションが見つかりません。初期データを作成してください。',
      500,
      'VIRTUAL_LOCATION_MISSING',
    );
  }
  return { supplier: virtualSupplier as any, customer: virtualCustomer as any };
}

// ─── Helper: トランザクション対応実行 / Execute with optional transaction ─

/**
 * トランザクション対応で処理を実行する。
 * Execute an operation with transaction support if available; fall back gracefully otherwise.
 */
async function withOptionalTransaction<T>(
  fn: (session: mongoose.ClientSession | null) => Promise<T>,
): Promise<T> {
  const supportsTransactions = await checkTransactionSupport();

  if (!supportsTransactions) {
    logger.warn('Transactions not supported — proceeding without transaction / トランザクション未対応 — トランザクションなしで実行');
    return fn(null);
  }

  const session = await mongoose.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result!;
  } finally {
    await session.endSession();
  }
}

// ─── Service Functions / サービス関数 ─────────────────────────

/**
 * 在庫一覧取得（StockQuant） / List stock (product × location × lot)
 */
export async function listStock(filters: StockListFilters): Promise<any[]> {
  const match: Record<string, unknown> = {};

  if (filters.productId) {
    match.productId = new mongoose.Types.ObjectId(filters.productId);
  }
  if (filters.productSku) {
    match.productSku = { $regex: filters.productSku, $options: 'i' };
  }
  if (filters.locationId) {
    match.locationId = new mongoose.Types.ObjectId(filters.locationId);
  }
  if (!filters.showZero) {
    match.quantity = { $gt: 0 };
  }

  return StockQuant.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'locations',
        localField: 'locationId',
        foreignField: '_id',
        as: 'location',
      },
    },
    { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'lots',
        localField: 'lotId',
        foreignField: '_id',
        as: 'lot',
      },
    },
    { $unwind: { path: '$lot', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productId: 1,
        productSku: 1,
        'product.name': 1,
        'product.nameFull': 1,
        'product.imageUrl': 1,
        'product.coolType': 1,
        'product.safetyStock': 1,
        locationId: 1,
        'location.code': 1,
        'location.name': 1,
        'location.fullPath': 1,
        'location.type': 1,
        lotId: 1,
        'lot.lotNumber': 1,
        'lot.expiryDate': 1,
        'lot.status': 1,
        quantity: 1,
        reservedQuantity: 1,
        availableQuantity: { $subtract: ['$quantity', '$reservedQuantity'] },
        lastMovedAt: 1,
        updatedAt: 1,
      },
    },
    { $sort: { productSku: 1, 'location.code': 1 } },
  ]);
}

/**
 * 在庫集計（商品単位） / Inventory summary grouped by product
 */
export async function getInventorySummary(filters: InventorySummaryFilters): Promise<any[]> {
  const matchStage: Record<string, unknown> = { quantity: { $gt: 0 } };
  if (filters.search) {
    matchStage.productSku = { $regex: filters.search, $options: 'i' };
  }

  return StockQuant.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$productId',
        productSku: { $first: '$productSku' },
        totalQuantity: { $sum: '$quantity' },
        totalReserved: { $sum: '$reservedQuantity' },
        totalAvailable: { $sum: { $subtract: ['$quantity', '$reservedQuantity'] } },
        locationCount: { $addToSet: '$locationId' },
      },
    },
    {
      $addFields: {
        locationCount: { $size: '$locationCount' },
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productId: '$_id',
        productSku: 1,
        'product.name': 1,
        'product.nameFull': 1,
        'product.imageUrl': 1,
        'product.coolType': 1,
        'product.safetyStock': 1,
        totalQuantity: 1,
        totalReserved: 1,
        totalAvailable: 1,
        locationCount: 1,
        isBelowSafety: {
          $cond: {
            if: {
              $and: [
                { $gt: ['$product.safetyStock', 0] },
                { $lt: ['$totalAvailable', '$product.safetyStock'] },
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    { $sort: { productSku: 1 } },
  ]);
}

/**
 * 商品別在庫詳細 / Product stock detail by location
 */
export async function getProductStock(productId: string): Promise<any[]> {
  const filter = {
    productId: new mongoose.Types.ObjectId(productId),
    quantity: { $gt: 0 },
  };

  return StockQuant.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'locations',
        localField: 'locationId',
        foreignField: '_id',
        as: 'location',
      },
    },
    { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'lots',
        localField: 'lotId',
        foreignField: '_id',
        as: 'lot',
      },
    },
    { $unwind: { path: '$lot', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        locationId: 1,
        'location.code': 1,
        'location.name': 1,
        'location.fullPath': 1,
        lotId: 1,
        'lot.lotNumber': 1,
        'lot.expiryDate': 1,
        'lot.status': 1,
        quantity: 1,
        reservedQuantity: 1,
        availableQuantity: { $subtract: ['$quantity', '$reservedQuantity'] },
        lastMovedAt: 1,
      },
    },
    { $sort: { 'location.code': 1 } },
  ]);
}

/**
 * 在庫調整（棚卸し） / Stock adjustment (inventory count)
 *
 * StockQuant を更新し StockMove を記録する。
 * Updates StockQuant and records a StockMove.
 */
export async function adjustStock(params: AdjustStockParams): Promise<AdjustStockResult> {
  const { productId, locationId, lotId, adjustQuantity, memo } = params;

  // バリデーション / Validation
  if (!productId || !locationId || adjustQuantity === undefined || adjustQuantity === 0) {
    throw new ValidationError('productId, locationId, adjustQuantity(非0) は必須です');
  }

  const product = await Product.findById(productId).lean();
  if (!product) {
    throw new NotFoundError('商品が見つかりません');
  }

  const location = await Location.findById(locationId).lean();
  if (!location) {
    throw new NotFoundError('ロケーションが見つかりません');
  }

  const { supplier: virtualSupplier, customer: virtualCustomer } = await getVirtualLocations();

  const qty = Number(adjustQuantity);
  const isIncrease = qty > 0;
  const absQty = Math.abs(qty);

  const quantFilter = {
    productId: new mongoose.Types.ObjectId(productId),
    locationId: new mongoose.Types.ObjectId(locationId),
    lotId: lotId ? new mongoose.Types.ObjectId(lotId) : undefined,
  };

  // 減少の場合は有効在庫チェック / Check available stock on decrease
  if (!isIncrease) {
    const currentQuant = await StockQuant.findOne(quantFilter).lean();
    const currentAvailable = (currentQuant?.quantity ?? 0) - (currentQuant?.reservedQuantity ?? 0);
    if (currentAvailable < absQty) {
      throw new ValidationError(
        `有効在庫が不足しています（現在: ${currentAvailable}, 調整: ${qty}）`,
      );
    }
  }

  return withOptionalTransaction(async (session) => {
    const opts = session ? { session } : {};

    // StockQuant を upsert
    await StockQuant.findOneAndUpdate(
      quantFilter,
      {
        $inc: { quantity: qty },
        $set: { productSku: product.sku, lastMovedAt: new Date() },
        $setOnInsert: { reservedQuantity: 0 },
      },
      { upsert: true, ...opts },
    );

    // StockMove を記録 / Record StockMove
    const moveNumber = await generateSequenceNumber('MV');
    await StockMove.create(
      [
        {
          moveNumber,
          moveType: 'adjustment',
          state: 'done',
          productId: new mongoose.Types.ObjectId(productId),
          productSku: product.sku,
          productName: product.name,
          lotId: lotId ? new mongoose.Types.ObjectId(lotId) : undefined,
          fromLocationId: isIncrease ? virtualSupplier._id : new mongoose.Types.ObjectId(locationId),
          toLocationId: isIncrease ? new mongoose.Types.ObjectId(locationId) : virtualCustomer._id,
          quantity: absQty,
          referenceType: 'adjustment',
          executedAt: new Date(),
          memo: memo || `在庫調整: ${isIncrease ? '+' : ''}${qty}`,
        },
      ],
      opts,
    );

    // 操作ログ / 操作日志 (fire-and-forget)
    logOperation({
      action: 'adjustment',
      description: `在庫調整: ${product.sku} ${isIncrease ? '+' : ''}${qty} @ ${location.code}`,
      productId: productId,
      productSku: product.sku,
      productName: product.name,
      locationCode: location.code,
      quantity: qty,
      referenceNumber: moveNumber,
      referenceType: 'adjustment',
    }).catch(() => {});

    return {
      message: `在庫を調整しました（${isIncrease ? '+' : ''}${qty}）`,
      moveNumber,
    };
  });
}

/**
 * 在庫移動（ロケーション間） / Inter-location stock transfer
 *
 * 移動元の StockQuant を減少、移動先を増加し StockMove を記録。
 * Decreases source StockQuant, increases destination, and records a StockMove.
 */
export async function transferStock(params: TransferStockParams): Promise<TransferStockResult> {
  const { productId, fromLocationId, toLocationId, quantity, lotId, memo } = params;

  // バリデーション / Validation
  if (!productId || !fromLocationId || !toLocationId || !quantity || quantity <= 0) {
    throw new ValidationError('productId, fromLocationId, toLocationId, quantity(>0) は必須です');
  }
  if (fromLocationId === toLocationId) {
    throw new ValidationError('移動元と移動先が同じです');
  }

  const product = await Product.findById(productId).lean();
  if (!product) {
    throw new NotFoundError('商品が見つかりません');
  }

  const [fromLoc, toLoc] = await Promise.all([
    Location.findById(fromLocationId).lean(),
    Location.findById(toLocationId).lean(),
  ]);
  if (!fromLoc) {
    throw new NotFoundError('移動元ロケーションが見つかりません');
  }
  if (!toLoc) {
    throw new NotFoundError('移動先ロケーションが見つかりません');
  }

  const qty = Number(quantity);
  const fromQuantFilter = {
    productId: new mongoose.Types.ObjectId(productId),
    locationId: new mongoose.Types.ObjectId(fromLocationId),
    lotId: lotId ? new mongoose.Types.ObjectId(lotId) : undefined,
  };

  // 有効在庫チェック / Check available stock at source
  const sourceQuant = await StockQuant.findOne(fromQuantFilter).lean();
  const available = (sourceQuant?.quantity ?? 0) - (sourceQuant?.reservedQuantity ?? 0);
  if (available < qty) {
    throw new ValidationError(
      `移動元の有効在庫が不足しています（有効: ${available}, 移動数: ${qty}）`,
    );
  }

  return withOptionalTransaction(async (session) => {
    const opts = session ? { session } : {};

    // 移動元を減少 / Decrease source
    await StockQuant.findOneAndUpdate(
      fromQuantFilter,
      { $inc: { quantity: -qty }, $set: { lastMovedAt: new Date() } },
      opts,
    );

    // 移動先を増加（upsert） / Increase destination (upsert)
    const toQuantFilter = {
      productId: new mongoose.Types.ObjectId(productId),
      locationId: new mongoose.Types.ObjectId(toLocationId),
      lotId: lotId ? new mongoose.Types.ObjectId(lotId) : undefined,
    };
    await StockQuant.findOneAndUpdate(
      toQuantFilter,
      {
        $inc: { quantity: qty },
        $set: { productSku: product.sku, lastMovedAt: new Date() },
        $setOnInsert: { reservedQuantity: 0 },
      },
      { upsert: true, ...opts },
    );

    // StockMove を記録 / Record StockMove
    const moveNumber = await generateSequenceNumber('MV');
    await StockMove.create(
      [
        {
          moveNumber,
          moveType: 'transfer',
          state: 'done',
          productId: new mongoose.Types.ObjectId(productId),
          productSku: product.sku,
          productName: product.name,
          lotId: lotId ? new mongoose.Types.ObjectId(lotId) : undefined,
          fromLocationId: new mongoose.Types.ObjectId(fromLocationId),
          toLocationId: new mongoose.Types.ObjectId(toLocationId),
          quantity: qty,
          referenceType: 'manual',
          executedAt: new Date(),
          memo: memo || `在庫移動: ${fromLoc.code} → ${toLoc.code}`,
        },
      ],
      opts,
    );

    // 操作ログ / 操作日志 (fire-and-forget)
    logOperation({
      action: 'transfer',
      description: `在庫移動: ${product.sku} ${qty}個 ${fromLoc.code} → ${toLoc.code}`,
      productId: productId,
      productSku: product.sku,
      productName: product.name,
      locationCode: `${fromLoc.code} → ${toLoc.code}`,
      quantity: qty,
      referenceNumber: moveNumber,
      referenceType: 'transfer',
    }).catch(() => {});

    return {
      message: `${qty}個を ${fromLoc.code} → ${toLoc.code} に移動しました`,
      moveNumber,
    };
  });
}

/**
 * 一括在庫調整 / Bulk stock adjustment
 *
 * SKU + ロケーションコードで一括調整。各アイテムは個別に処理し、
 * 失敗したアイテムがあっても残りは続行する。
 * Processes each item independently; failures do not block remaining items.
 */
export async function bulkAdjustStock(items: BulkAdjustItem[]): Promise<BulkAdjustResult> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('調整データが必要です');
  }

  const { supplier: virtualSupplier, customer: virtualCustomer } = await getVirtualLocations();

  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (const adj of items) {
    try {
      const { productSku, locationCode, quantity: adjQty, lotNumber, memo } = adj;
      if (!productSku || !locationCode || !adjQty || adjQty === 0) {
        errors.push(`${productSku || '?'}: 必須項目が不足`);
        failCount++;
        continue;
      }

      const product = await Product.findOne({ sku: productSku }).lean();
      if (!product) {
        errors.push(`${productSku}: 商品が見つかりません`);
        failCount++;
        continue;
      }

      const location = await Location.findOne({ code: locationCode }).lean();
      if (!location) {
        errors.push(`${productSku}: ロケーション「${locationCode}」が見つかりません`);
        failCount++;
        continue;
      }

      const qty = Number(adjQty);
      const isIncrease = qty > 0;
      const absQty = Math.abs(qty);

      // ロット検索 / Find lot
      let lotId: mongoose.Types.ObjectId | undefined;
      if (lotNumber) {
        const lot = await Lot.findOne({ productId: product._id, lotNumber }).lean();
        if (lot) lotId = lot._id;
      }

      const quantFilter = {
        productId: product._id,
        locationId: location._id,
        lotId: lotId || undefined,
      };

      // 減少時の有効在庫チェック / Check available on decrease
      if (!isIncrease) {
        const current = await StockQuant.findOne(quantFilter).lean();
        const avail = (current?.quantity ?? 0) - (current?.reservedQuantity ?? 0);
        if (avail < absQty) {
          errors.push(`${productSku}@${locationCode}: 有効在庫不足 (${avail} < ${absQty})`);
          failCount++;
          continue;
        }
      }

      await StockQuant.findOneAndUpdate(
        quantFilter,
        {
          $inc: { quantity: qty },
          $set: { productSku: product.sku, lastMovedAt: new Date() },
          $setOnInsert: { reservedQuantity: 0 },
        },
        { upsert: true },
      );

      const moveNumber = await generateSequenceNumber('MV');
      await StockMove.create({
        moveNumber,
        moveType: 'adjustment',
        state: 'done',
        productId: product._id,
        productSku: product.sku,
        productName: product.name,
        lotId,
        fromLocationId: isIncrease ? virtualSupplier._id : location._id,
        toLocationId: isIncrease ? location._id : virtualCustomer._id,
        quantity: absQty,
        referenceType: 'adjustment',
        executedAt: new Date(),
        memo: memo || `一括調整: ${isIncrease ? '+' : ''}${qty}`,
      });

      successCount++;
    } catch (e: any) {
      errors.push(`${adj.productSku || '?'}: ${e.message}`);
      failCount++;
    }
  }

  return {
    message: `一括調整完了: 成功${successCount}件、失敗${failCount}件`,
    successCount,
    failCount,
    errors,
  };
}

/**
 * 入出庫履歴取得 / List stock movements with pagination
 */
export async function listMovements(
  filters: MovementFilters,
  pagination: PaginationParams,
): Promise<{ items: any[]; total: number; page: number; limit: number }> {
  const match: Record<string, unknown> = {};
  if (filters.productId) {
    match.productId = new mongoose.Types.ObjectId(filters.productId);
  }
  if (filters.moveType) {
    match.moveType = filters.moveType;
  }
  if (filters.state) {
    match.state = filters.state;
  }

  const page = Math.max(1, pagination.page || 1);
  const limit = Math.min(500, Math.max(1, pagination.limit || 50));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    StockMove.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'locations',
          localField: 'fromLocationId',
          foreignField: '_id',
          as: 'fromLocation',
        },
      },
      { $unwind: { path: '$fromLocation', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'locations',
          localField: 'toLocationId',
          foreignField: '_id',
          as: 'toLocation',
        },
      },
      { $unwind: { path: '$toLocation', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          moveNumber: 1,
          moveType: 1,
          state: 1,
          productId: 1,
          productSku: 1,
          productName: 1,
          lotId: 1,
          lotNumber: 1,
          'fromLocation.code': 1,
          'fromLocation.name': 1,
          'toLocation.code': 1,
          'toLocation.name': 1,
          quantity: 1,
          referenceType: 1,
          referenceId: 1,
          referenceNumber: 1,
          scheduledDate: 1,
          executedAt: 1,
          executedBy: 1,
          memo: 1,
          createdAt: 1,
        },
      },
    ]),
    StockMove.countDocuments(match),
  ]);

  return { items, total, page, limit };
}

/**
 * 安全在庫割れアラート / Low stock alerts
 */
export async function listLowStockAlerts(): Promise<any[]> {
  const products = await Product.find({
    inventoryEnabled: true,
    safetyStock: { $gt: 0 },
  }).lean();

  if (products.length === 0) {
    return [];
  }

  const productIds = products.map((p) => p._id);

  const stockSummary = await StockQuant.aggregate([
    { $match: { productId: { $in: productIds } } },
    {
      $group: {
        _id: '$productId',
        totalQuantity: { $sum: '$quantity' },
        totalReserved: { $sum: '$reservedQuantity' },
        totalAvailable: { $sum: { $subtract: ['$quantity', '$reservedQuantity'] } },
      },
    },
  ]);

  const stockMap = new Map(stockSummary.map((s) => [String(s._id), s]));

  return products
    .map((p) => {
      const stock = stockMap.get(String(p._id));
      const availableQty = stock?.totalAvailable ?? 0;
      return {
        productId: p._id,
        productSku: p.sku,
        productName: p.name,
        safetyStock: p.safetyStock,
        availableQuantity: availableQty,
        shortage: p.safetyStock - availableQty,
      };
    })
    .filter((a) => a.shortage > 0)
    .sort((a, b) => b.shortage - a.shortage);
}

/**
 * 0在庫レコードのクリーンアップ / Cleanup zero-stock records
 */
export async function cleanupZeroStock(): Promise<{ deletedCount: number }> {
  const result = await StockQuant.deleteMany({
    quantity: { $lte: 0 },
    reservedQuantity: { $lte: 0 },
  });
  return { deletedCount: result.deletedCount };
}

// ─── 在庫差異レポート型 / 库存差异报告类型 ─────────────────────────

/** 在庫差異アイテム / Inventory discrepancy item */
export interface InventoryDiscrepancy {
  productSku: string;
  productName: string;
  locationCode: string;
  lotNumber?: string;
  currentQty: number;
  currentReserved: number;
  calculatedQty: number;
  difference: number;
}

/** 在庫リビルド結果 / Inventory rebuild result */
export interface RebuildInventoryResult {
  discrepancies: InventoryDiscrepancy[];
  totalChecked: number;
  discrepancyCount: number;
  fixed: boolean;
}

/**
 * 在庫リビルド（整合性チェック＆修復） / 库存重建（一致性检查与修复）
 *
 * 完了済み（state='done'）の StockMove レコードから在庫数を再計算し、
 * 現在の StockQuant と比較して差異を報告する。
 * fix=true の場合、StockQuant を計算値に更新する。
 *
 * Recalculates stock from done StockMove records and compares with current
 * StockQuant values. If fix=true, updates StockQuant to match calculated values.
 */
export async function rebuildInventory(fix: boolean = false): Promise<RebuildInventoryResult> {
  // 1. 完了済み StockMove から在庫を集計 / 从已完成的 StockMove 聚合库存
  //    toLocationId への入庫 = +quantity, fromLocationId からの出庫 = -quantity
  //    仮想ロケーションを除外して実ロケーションのみ集計
  //    排除虚拟位置，只聚合实际位置
  const virtualLocations = await Location.find({
    code: { $regex: /^VIRTUAL\// },
  }).lean();
  const virtualLocationIds = virtualLocations.map((loc) => loc._id);

  // 入庫集計（toLocationId が実ロケーション）/ 入库聚合（toLocationId 为实际位置）
  const inboundAgg = await StockMove.aggregate([
    { $match: { state: 'done', toLocationId: { $nin: virtualLocationIds } } },
    {
      $group: {
        _id: {
          productId: '$productId',
          locationId: '$toLocationId',
          lotId: '$lotId',
        },
        totalQty: { $sum: '$quantity' },
      },
    },
  ]);

  // 出庫集計（fromLocationId が実ロケーション）/ 出库聚合（fromLocationId 为实际位置）
  const outboundAgg = await StockMove.aggregate([
    { $match: { state: 'done', fromLocationId: { $nin: virtualLocationIds } } },
    {
      $group: {
        _id: {
          productId: '$productId',
          locationId: '$fromLocationId',
          lotId: '$lotId',
        },
        totalQty: { $sum: '$quantity' },
      },
    },
  ]);

  // 計算マップ構築: key = productId:locationId:lotId / 构建计算 Map
  const calcMap = new Map<string, number>();
  const makeKey = (productId: string, locationId: string, lotId?: string): string =>
    `${productId}:${locationId}:${lotId || 'none'}`;

  for (const row of inboundAgg) {
    const key = makeKey(String(row._id.productId), String(row._id.locationId), row._id.lotId ? String(row._id.lotId) : undefined);
    calcMap.set(key, (calcMap.get(key) || 0) + row.totalQty);
  }
  for (const row of outboundAgg) {
    const key = makeKey(String(row._id.productId), String(row._id.locationId), row._id.lotId ? String(row._id.lotId) : undefined);
    calcMap.set(key, (calcMap.get(key) || 0) - row.totalQty);
  }

  // 2. 現在の StockQuant を全取得 / 获取当前所有 StockQuant
  const allQuants = await StockQuant.find({}).lean();

  // 商品・ロケーション情報のルックアップ用 / 商品・位置信息查询用
  const productIds = [...new Set(allQuants.map((q) => String(q.productId)))];
  const locationIds = [...new Set(allQuants.map((q) => String(q.locationId)))];
  const [products, locations, lots] = await Promise.all([
    Product.find({ _id: { $in: productIds } }).lean(),
    Location.find({ _id: { $in: locationIds } }).lean(),
    Lot.find({}).select('_id lotNumber').lean(),
  ]);
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const locationMap = new Map(locations.map((l) => [String(l._id), l]));
  const lotMap = new Map(lots.map((l) => [String(l._id), l]));

  // 3. 差異検出 / 差异检测
  const discrepancies: InventoryDiscrepancy[] = [];
  const checkedKeys = new Set<string>();

  for (const quant of allQuants) {
    const key = makeKey(String(quant.productId), String(quant.locationId), quant.lotId ? String(quant.lotId) : undefined);
    checkedKeys.add(key);

    const calculatedQty = calcMap.get(key) || 0;
    const currentQty = quant.quantity;

    if (currentQty !== calculatedQty) {
      const product = productMap.get(String(quant.productId));
      const location = locationMap.get(String(quant.locationId));
      const lot = quant.lotId ? lotMap.get(String(quant.lotId)) : undefined;

      discrepancies.push({
        productSku: product?.sku || quant.productSku || 'unknown',
        productName: product?.name || 'unknown',
        locationCode: location?.code || 'unknown',
        lotNumber: (lot as any)?.lotNumber,
        currentQty,
        currentReserved: quant.reservedQuantity,
        calculatedQty,
        difference: calculatedQty - currentQty,
      });
    }
  }

  // 計算マップにあるが StockQuant にないレコードもチェック
  // 检查计算 Map 中存在但 StockQuant 中不存在的记录
  for (const [key, calculatedQty] of calcMap.entries()) {
    if (checkedKeys.has(key) || calculatedQty === 0) continue;

    const [productId, locationId, lotIdStr] = key.split(':');
    const product = productMap.get(productId);
    const location = locationMap.get(locationId);
    const lot = lotIdStr !== 'none' ? lotMap.get(lotIdStr) : undefined;

    discrepancies.push({
      productSku: product?.sku || 'unknown',
      productName: product?.name || 'unknown',
      locationCode: location?.code || 'unknown',
      lotNumber: (lot as any)?.lotNumber,
      currentQty: 0,
      currentReserved: 0,
      calculatedQty,
      difference: calculatedQty,
    });
  }

  // 4. fix=true の場合、StockQuant を更新 / fix=true 时更新 StockQuant
  if (fix && discrepancies.length > 0) {
    for (const disc of discrepancies) {
      const product = products.find((p) => p.sku === disc.productSku);
      const location = locations.find((l) => l.code === disc.locationCode);
      if (!product || !location) continue;

      const lot = disc.lotNumber ? lots.find((l) => (l as any).lotNumber === disc.lotNumber) : undefined;

      const filter = {
        productId: product._id,
        locationId: location._id,
        lotId: lot ? lot._id : undefined,
      };

      if (disc.calculatedQty <= 0 && disc.currentQty <= 0) {
        // 両方0以下なら削除 / 两者都<=0则删除
        await StockQuant.deleteOne(filter);
      } else {
        await StockQuant.findOneAndUpdate(
          filter,
          {
            $set: {
              quantity: disc.calculatedQty,
              productSku: product.sku,
              lastMovedAt: new Date(),
            },
            $setOnInsert: { reservedQuantity: 0 },
          },
          { upsert: true },
        );
      }
    }

    logger.info(
      { discrepancyCount: discrepancies.length },
      '在庫リビルド: 差異を修正しました / 库存重建: 已修复差异',
    );
  }

  return {
    discrepancies,
    totalChecked: checkedKeys.size + [...calcMap.keys()].filter((k) => !checkedKeys.has(k) && (calcMap.get(k) || 0) !== 0).length,
    discrepancyCount: discrepancies.length,
    fixed: fix && discrepancies.length > 0,
  };
}

// ─── 期限切れ引当解放型 / 过期预留释放类型 ─────────────────────────

/** 期限切れ引当解放結果 / Expired reservation release result */
export interface ReleaseExpiredResult {
  releasedCount: number;
  releasedMoves: Array<{
    moveNumber: string;
    productSku: string;
    quantity: number;
    orderNumber?: string;
    createdAt: Date;
  }>;
}

/**
 * 期限切れ引当の解放 / 过期预留的释放
 *
 * 指定分数以上 confirmed 状態のまま放置された StockMove を検索し、
 * キャンセルして StockQuant の reservedQuantity を戻す。
 *
 * Finds StockMove records in 'confirmed' state older than timeoutMinutes,
 * cancels them, and releases reservedQuantity in StockQuant.
 *
 * TODO: スケジュールジョブ（WMS Schedule）から定期的に呼び出すこと
 * TODO: 应该从定时任务（WMS Schedule）定期调用此函数
 */
export async function releaseExpiredReservations(
  timeoutMinutes: number = 30,
): Promise<ReleaseExpiredResult> {
  if (timeoutMinutes <= 0) {
    throw new ValidationError('timeoutMinutes は1以上を指定してください / timeoutMinutes must be >= 1');
  }

  const cutoffDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  // タイムアウトした confirmed の StockMove を検索
  // 查找超时的 confirmed StockMove
  const expiredMoves = await StockMove.find({
    state: 'confirmed',
    createdAt: { $lt: cutoffDate },
  }).lean();

  if (expiredMoves.length === 0) {
    return { releasedCount: 0, releasedMoves: [] };
  }

  // 一括で StockQuant の引当を戻す / 批量释放 StockQuant 的预留
  const quantOps = expiredMoves.map((move) => ({
    updateOne: {
      filter: {
        productId: move.productId,
        locationId: move.fromLocationId,
        ...(move.lotId ? { lotId: move.lotId } : { lotId: undefined }),
      },
      update: {
        $inc: { reservedQuantity: -move.quantity },
      },
    },
  }));
  await StockQuant.bulkWrite(quantOps);

  // 一括で StockMove をキャンセル / 批量取消 StockMove
  const moveIds = expiredMoves.map((m) => m._id);
  await StockMove.updateMany(
    { _id: { $in: moveIds } },
    { $set: { state: 'cancelled', memo: `タイムアウト自動解放（${timeoutMinutes}分超過） / 超时自动释放（超过${timeoutMinutes}分钟）` } },
  );

  const releasedMoves = expiredMoves.map((m) => ({
    moveNumber: m.moveNumber,
    productSku: m.productSku,
    quantity: m.quantity,
    orderNumber: m.referenceNumber,
    createdAt: m.createdAt,
  }));

  logger.info(
    { releasedCount: expiredMoves.length, timeoutMinutes },
    '期限切れ引当を解放しました / 已释放过期预留',
  );

  return {
    releasedCount: expiredMoves.length,
    releasedMoves,
  };
}
