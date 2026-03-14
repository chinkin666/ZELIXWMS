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

  for (const prod of products) {
    const sku = prod.productSku || prod.inputSku;

    // productId がない場合、SKU で商品マスタを検索して自動解決
    let productId = prod.productId;
    let product = productId ? await Product.findById(productId).lean() : null;

    if (!product && sku) {
      // メインSKU or サブSKU で検索
      product = await Product.findOne({
        $or: [
          { sku: sku },
          { _allSku: sku },
        ],
      }).lean();
      if (product) {
        productId = String(product._id);
      }
    }

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

    // FEFO: 賞味期限が近い順で引当。lotId なしの在庫は後ろに回す。
    const quantDocs = await StockQuant.find({
      productId: new mongoose.Types.ObjectId(productId!),
      $expr: { $gt: [{ $subtract: ['$quantity', '$reservedQuantity'] }, 0] },
    })
      .lean();

    // lotId → expiryDate マップ構築
    const lotIds = quantDocs.map(q => q.lotId).filter((id): id is mongoose.Types.ObjectId => !!id);
    const lotsMap = new Map<string, Date | null>();
    if (lotIds.length > 0) {
      const lots = await Lot.find({ _id: { $in: lotIds }, status: 'active' }).lean();
      for (const l of lots) {
        lotsMap.set(String(l._id), l.expiryDate || null);
      }
    }

    // FEFO ソート：有期限（近い順） → 無期限 → ロットなし（lastMovedAt 早い順）
    const quants = [...quantDocs].sort((a, b) => {
      const aExpiry = a.lotId ? lotsMap.get(String(a.lotId)) : null;
      const bExpiry = b.lotId ? lotsMap.get(String(b.lotId)) : null;

      // 期限切れ or recalled のロットは除外済み（active のみ lotsMap に入っている）
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

      // StockQuant を引当
      await StockQuant.updateOne(
        { _id: quant._id },
        { $inc: { reservedQuantity: reserve } },
      );

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
        lotNumber: quant.lotId ? (await Lot.findById(quant.lotId).lean())?.lotNumber : undefined,
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

  let movedCount = 0;

  for (const move of moves) {
    // StockQuant を消込
    await StockQuant.updateOne(
      {
        productId: move.productId,
        locationId: move.fromLocationId,
        lotId: move.lotId || undefined,
      },
      {
        $inc: {
          quantity: -move.quantity,
          reservedQuantity: -move.quantity,
        },
        $set: { lastMovedAt: new Date() },
      },
    );

    // StockMove を完了
    move.state = 'done';
    move.executedAt = new Date();
    await move.save();

    movedCount++;
  }

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

  let cancelledCount = 0;

  for (const move of moves) {
    // StockQuant の reservedQuantity を戻す
    await StockQuant.updateOne(
      {
        productId: move.productId,
        locationId: move.fromLocationId,
        lotId: move.lotId || undefined,
      },
      {
        $inc: { reservedQuantity: -move.quantity },
      },
    );

    // StockMove をキャンセル
    move.state = 'cancelled';
    await move.save();

    cancelledCount++;
  }

  // 扩展系统事件 / 拡張システムイベント
  if (cancelledCount > 0) {
    extensionManager.emit(HOOK_EVENTS.STOCK_RELEASED, {
      orderId,
      cancelledCount,
    }).catch((err: unknown) => logger.warn({ err }, 'Extension hook failed (non-blocking)'));
  }

  return { cancelledCount };
}
