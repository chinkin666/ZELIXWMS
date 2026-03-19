import { logger } from '@/lib/logger';
import mongoose from 'mongoose';
import { StockQuant } from '@/models/stockQuant';
import { StockMove } from '@/models/stockMove';
import { Location } from '@/models/location';
import { Product } from '@/models/product';
import { Lot } from '@/models/lot';
import { generateSequenceNumber } from '@/utils/sequenceGenerator';
import { extensionManager } from '@/core/extensions';
import { HOOK_EVENTS } from '@/core/extensions/types';

interface OrderProductForReserve {
  productId?: string;
  productSku?: string;
  productName?: string;
  inputSku: string;
  quantity: number;
}

interface ReservationResult {
  success: boolean;
  reservations: Array<{
    productSku: string;
    quantId: string;
    locationId: string;
    lotId?: string;
    quantity: number;
    stockMoveId: string;
  }>;
  errors: string[];
}

/**
 * 出荷確定時の在庫引当。
 * inventoryEnabled=true の商品のみ引当。それ以外はスキップ（理由を errors に記録）。
 */
export async function reserveStockForOrder(
  orderId: string,
  orderNumber: string,
  products: OrderProductForReserve[],
): Promise<ReservationResult> {
  const result: ReservationResult = { success: true, reservations: [], errors: [] };

  const virtualCustomer = await Location.findOne({ code: 'VIRTUAL/CUSTOMER' }).lean();
  if (!virtualCustomer) {
    result.errors.push('仮想ロケーション(VIRTUAL/CUSTOMER)が未作成です。ロケーション管理から初期データを作成してください。');
    return result;
  }

  // ── 一括で商品マスタを取得（N+1解消）/ 批量获取商品主数据 ──
  const allSkus = products.map(p => p.productSku || p.inputSku).filter(Boolean);
  const allProductIds = products.map(p => p.productId).filter(Boolean);
  const [productsByIdResult, productsBySkuResult] = await Promise.all([
    allProductIds.length > 0
      ? Product.find({ _id: { $in: allProductIds } }).lean()
      : Promise.resolve([]),
    allSkus.length > 0
      ? Product.find({ $or: [{ sku: { $in: allSkus } }, { _allSku: { $in: allSkus } }] }).lean()
      : Promise.resolve([]),
  ]);
  const productByIdMap = new Map(productsByIdResult.map(p => [String(p._id), p]));
  const productBySkuMap = new Map<string, any>();
  for (const p of productsBySkuResult) {
    productBySkuMap.set(p.sku, p);
    if (Array.isArray((p as any)._allSku)) {
      for (const s of (p as any)._allSku) { productBySkuMap.set(s, p); }
    }
  }

  // ── 一括で在庫と期限情報を取得 / 批量获取库存和期限 ──
  const resolvedProductIds: string[] = [];
  for (const prod of products) {
    const sku = prod.productSku || prod.inputSku;
    const p = (prod.productId && productByIdMap.get(prod.productId)) || productBySkuMap.get(sku);
    if (p && p.inventoryEnabled) resolvedProductIds.push(String(p._id));
  }

  const [allQuants, allActiveLots] = await Promise.all([
    resolvedProductIds.length > 0
      ? StockQuant.find({
          productId: { $in: resolvedProductIds.map(id => new mongoose.Types.ObjectId(id)) },
          $expr: { $gt: [{ $subtract: ['$quantity', '$reservedQuantity'] }, 0] },
        }).lean()
      : Promise.resolve([]),
    Lot.find({ status: 'active' }).select('_id lotNumber expiryDate').lean(),
  ]);

  // インデックス構築 / 构建索引
  const quantsByProduct = new Map<string, (typeof allQuants)[number][]>();
  for (const q of allQuants) {
    const pid = String(q.productId);
    if (!quantsByProduct.has(pid)) quantsByProduct.set(pid, []);
    quantsByProduct.get(pid)!.push(q);
  }
  const lotsMap = new Map<string, { lotNumber?: string; expiryDate: Date | null }>();
  for (const l of allActiveLots) {
    lotsMap.set(String(l._id), { lotNumber: l.lotNumber, expiryDate: l.expiryDate || null });
  }

  for (const prod of products) {
    const sku = prod.productSku || prod.inputSku;

    // 事前取得済みマップから商品を解決 / 从预加载map解析商品
    const product = (prod.productId && productByIdMap.get(prod.productId)) || productBySkuMap.get(sku);
    const productId = product ? String(product._id) : undefined;

    if (!product) {
      result.errors.push(`${sku}: 商品マスタ未登録（在庫管理対象外）`);
      continue;
    }
    if (!product.inventoryEnabled) {
      result.errors.push(`${sku}: 在庫管理が「しない」に設定されています`);
      continue;
    }

    const qty = prod.quantity;
    if (!qty || qty <= 0) continue;

    // FEFO: 賞味期限が近い順で引当 / FEFO: 按保质期近的先出
    const quantDocs = quantsByProduct.get(productId!) || [];

    // FEFO ソート：有期限（近い順） → 無期限 → ロットなし（lastMovedAt 早い順）
    const quants = [...quantDocs].sort((a, b) => {
      const aLot = a.lotId ? lotsMap.get(String(a.lotId)) : null;
      const bLot = b.lotId ? lotsMap.get(String(b.lotId)) : null;
      const aExpiry = aLot?.expiryDate || null;
      const bExpiry = bLot?.expiryDate || null;

      // lotId はあるが lotsMap にない = non-active ロット → 引当しない
      if (a.lotId && !lotsMap.has(String(a.lotId))) return 1;
      if (b.lotId && !lotsMap.has(String(b.lotId))) return -1;

      if (aExpiry && bExpiry) return aExpiry.getTime() - bExpiry.getTime();
      if (aExpiry && !bExpiry) return -1;
      if (!aExpiry && bExpiry) return 1;
      return (a.lastMovedAt?.getTime() || 0) - (b.lastMovedAt?.getTime() || 0);
    });

    let remaining = qty;
    for (const quant of quants) {
      if (remaining <= 0) break;
      // non-active ロットの在庫はスキップ
      if (quant.lotId && !lotsMap.has(String(quant.lotId))) continue;
      const available = quant.quantity - quant.reservedQuantity;
      if (available <= 0) continue;

      const reserve = Math.min(available, remaining);

      // StockQuant を原子的に引当（TOCTOU防止）/ 原子性分配（防止竞态条件）
      const updateResult = await StockQuant.updateOne(
        {
          _id: quant._id,
          $expr: { $lte: [{ $add: ['$reservedQuantity', reserve] }, '$quantity'] },
        },
        { $inc: { reservedQuantity: reserve } },
      );
      if (updateResult.modifiedCount === 0) {
        // 他のリクエストが先に引当した / 其他请求已先分配
        continue;
      }

      // StockMove を作成 (confirmed = 引当済み、まだ出庫していない)
      const moveNumber = await generateSequenceNumber('MV');
      const move = await StockMove.create({
        moveNumber,
        moveType: 'outbound',
        state: 'confirmed',
        productId: quant.productId,
        productSku: prod.productSku || product.sku,
        productName: prod.productName || product.name,
        lotId: quant.lotId || undefined,
        lotNumber: quant.lotId ? lotsMap.get(String(quant.lotId))?.lotNumber : undefined,
        fromLocationId: quant.locationId,
        toLocationId: virtualCustomer._id,
        quantity: reserve,
        referenceType: 'shipment-order',
        referenceId: orderId,
        referenceNumber: orderNumber,
      });

      result.reservations.push({
        productSku: prod.productSku || product.sku,
        quantId: String(quant._id),
        locationId: String(quant.locationId),
        lotId: quant.lotId ? String(quant.lotId) : undefined,
        quantity: reserve,
        stockMoveId: String(move._id),
      });

      remaining -= reserve;
    }

    if (remaining > 0) {
      result.errors.push(`${prod.productSku || prod.inputSku}: 在庫不足（${remaining}個不足）`);
      // 在庫不足でもエラーにしない（警告のみ）。出荷は続行可能。
    }
  }

  // 扩展系统事件 / 拡張システムイベント
  if (result.reservations.length > 0) {
    extensionManager.emit(HOOK_EVENTS.STOCK_RESERVED, {
      orderId,
      orderNumber,
      reservationCount: result.reservations.length,
      errors: result.errors,
    }).catch((err: unknown) => logger.warn({ err }, 'Extension hook failed (non-blocking)'));
  }

  return result;
}

/**
 * 出荷完了時の在庫消込。
 * confirmed の StockMove を done に変更し、StockQuant の quantity と reservedQuantity を減らす。
 */
export async function completeStockForOrder(orderId: string): Promise<{ movedCount: number }> {
  const moves = await StockMove.find({
    referenceType: 'shipment-order',
    referenceId: orderId,
    state: 'confirmed',
    moveType: 'outbound',
  });

  if (moves.length === 0) return { movedCount: 0 };

  const now = new Date();

  // 一括でStockQuantを更新（負値ガード付き）/ 批量更新StockQuant（防止负值）
  const quantOps = moves.map(move => ({
    updateOne: {
      filter: {
        productId: move.productId,
        locationId: move.fromLocationId,
        ...(move.lotId ? { lotId: move.lotId } : { lotId: undefined }),
        quantity: { $gte: move.quantity },
        reservedQuantity: { $gte: move.quantity },
      },
      update: {
        $inc: { quantity: -move.quantity, reservedQuantity: -move.quantity },
        $set: { lastMovedAt: now },
      },
    },
  }));
  await StockQuant.bulkWrite(quantOps);

  // 一括でStockMoveを完了 / 批量完成StockMove
  const moveIds = moves.map(m => m._id);
  await StockMove.updateMany(
    { _id: { $in: moveIds } },
    { $set: { state: 'done', executedAt: now } },
  );

  const movedCount = moves.length;

  // 扩展系统事件 / 拡張システムイベント
  if (movedCount > 0) {
    extensionManager.emit(HOOK_EVENTS.INVENTORY_CHANGED, {
      orderId,
      type: 'outbound',
      movedCount,
    }).catch((err: unknown) => logger.warn({ err }, 'Extension hook failed (non-blocking)'));
  }

  return { movedCount };
}

/**
 * 確認取消時の在庫引当戻し。
 * confirmed の StockMove をキャンセルし、StockQuant の reservedQuantity を戻す。
 */
export async function unreserveStockForOrder(orderId: string): Promise<{ cancelledCount: number }> {
  const moves = await StockMove.find({
    referenceType: 'shipment-order',
    referenceId: orderId,
    state: 'confirmed',
    moveType: 'outbound',
  });

  if (moves.length === 0) return { cancelledCount: 0 };

  // 一括でStockQuantの引当戻し / 批量释放StockQuant引当
  const quantOps = moves.map(move => ({
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

  // 一括でStockMoveをキャンセル / 批量取消StockMove
  const moveIds = moves.map(m => m._id);
  await StockMove.updateMany(
    { _id: { $in: moveIds } },
    { $set: { state: 'cancelled' } },
  );

  const cancelledCount = moves.length;

  // 扩展系统事件 / 拡張システムイベント
  if (cancelledCount > 0) {
    extensionManager.emit(HOOK_EVENTS.STOCK_RELEASED, {
      orderId,
      cancelledCount,
    }).catch((err: unknown) => logger.warn({ err }, 'Extension hook failed (non-blocking)'));
  }

  return { cancelledCount };
}
