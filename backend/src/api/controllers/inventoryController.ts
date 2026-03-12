import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { StockQuant } from '@/models/stockQuant';
import { StockMove } from '@/models/stockMove';
import { Location } from '@/models/location';
import { Product } from '@/models/product';
import { Lot } from '@/models/lot';
import { generateSequenceNumber } from '@/utils/sequenceGenerator';
import { reserveStockForOrder } from '@/services/stockService';
import { ShipmentOrder } from '@/models/shipmentOrder';

/** 在庫一覧（StockQuant） product × location × lot */
export const listStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, productSku, locationId, showZero } = req.query;

    const filter: Record<string, unknown> = {};
    if (typeof productId === 'string' && productId.trim()) {
      filter.productId = new mongoose.Types.ObjectId(productId.trim());
    }
    if (typeof productSku === 'string' && productSku.trim()) {
      filter.productSku = { $regex: productSku.trim(), $options: 'i' };
    }
    if (typeof locationId === 'string' && locationId.trim()) {
      filter.locationId = new mongoose.Types.ObjectId(locationId.trim());
    }
    if (showZero !== 'true') {
      filter.quantity = { $gt: 0 };
    }

    const quants = await StockQuant.aggregate([
      { $match: filter },
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

    res.json(quants);
  } catch (error: any) {
    res.status(500).json({ message: '在庫一覧の取得に失敗しました', error: error.message });
  }
};

/** 在庫集計（商品単位） */
export const listStockSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;

    const matchStage: Record<string, unknown> = { quantity: { $gt: 0 } };
    if (typeof search === 'string' && search.trim()) {
      matchStage.productSku = { $regex: search.trim(), $options: 'i' };
    }

    const summary = await StockQuant.aggregate([
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
              if: { $and: [{ $gt: ['$product.safetyStock', 0] }, { $lt: ['$totalAvailable', '$product.safetyStock'] }] },
              then: true,
              else: false,
            },
          },
        },
      },
      { $sort: { productSku: 1 } },
    ]);

    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ message: '在庫集計の取得に失敗しました', error: error.message });
  }
};

/** 商品別在庫詳細 */
export const getProductStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const filter: Record<string, unknown> = {
      productId: new mongoose.Types.ObjectId(productId),
      quantity: { $gt: 0 },
    };

    const quants = await StockQuant.aggregate([
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

    res.json(quants);
  } catch (error: any) {
    res.status(500).json({ message: '商品別在庫の取得に失敗しました', error: error.message });
  }
};

/** 在庫調整（棚卸し） */
export const adjustStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, locationId, lotId, adjustQuantity, memo } = req.body;

    if (!productId || !locationId || adjustQuantity === undefined || adjustQuantity === 0) {
      res.status(400).json({ message: 'productId, locationId, adjustQuantity(非0) は必須です' });
      return;
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      res.status(404).json({ message: '商品が見つかりません' });
      return;
    }

    const location = await Location.findById(locationId).lean();
    if (!location) {
      res.status(404).json({ message: 'ロケーションが見つかりません' });
      return;
    }

    // 仮想ロケーション取得
    const virtualSupplier = await Location.findOne({ code: 'VIRTUAL/SUPPLIER' }).lean();
    const virtualCustomer = await Location.findOne({ code: 'VIRTUAL/CUSTOMER' }).lean();
    if (!virtualSupplier || !virtualCustomer) {
      res.status(500).json({ message: '仮想ロケーションが見つかりません。初期データを作成してください。' });
      return;
    }

    const qty = Number(adjustQuantity);
    const isIncrease = qty > 0;
    const absQty = Math.abs(qty);

    // StockQuant を upsert
    const quantFilter = {
      productId: new mongoose.Types.ObjectId(productId),
      locationId: new mongoose.Types.ObjectId(locationId),
      lotId: lotId ? new mongoose.Types.ObjectId(lotId) : undefined,
    };

    // 減少の場合は現在の在庫チェック
    if (!isIncrease) {
      const currentQuant = await StockQuant.findOne(quantFilter).lean();
      const currentAvailable = (currentQuant?.quantity ?? 0) - (currentQuant?.reservedQuantity ?? 0);
      if (currentAvailable < absQty) {
        res.status(400).json({
          message: `有効在庫が不足しています（現在: ${currentAvailable}, 調整: ${qty}）`,
        });
        return;
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

    // StockMove を記録
    const moveNumber = await generateSequenceNumber('MV');
    await StockMove.create({
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
    });

    res.json({ message: `在庫を調整しました（${isIncrease ? '+' : ''}${qty}）`, moveNumber });
  } catch (error: any) {
    res.status(500).json({ message: '在庫調整に失敗しました', error: error.message });
  }
};

/** 入出庫履歴 */
export const listMovements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, moveType, state, page: pageStr, limit: limitStr } = req.query;

    const filter: Record<string, unknown> = {};
    if (typeof productId === 'string' && productId.trim()) {
      filter.productId = new mongoose.Types.ObjectId(productId.trim());
    }
    if (typeof moveType === 'string' && moveType.trim()) {
      filter.moveType = moveType.trim();
    }
    if (typeof state === 'string' && state.trim()) {
      filter.state = state.trim();
    }

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitStr) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      StockMove.aggregate([
        { $match: filter },
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
      StockMove.countDocuments(filter),
    ]);

    res.json({ items, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: '入出庫履歴の取得に失敗しました', error: error.message });
  }
};

/** 安全在庫割れアラート */
export const listLowStockAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    // safetyStock > 0 の商品を取得
    const products = await Product.find({
      inventoryEnabled: true,
      safetyStock: { $gt: 0 },
    }).lean();

    if (products.length === 0) {
      res.json([]);
      return;
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

    const alerts = products
      .map((p) => {
        const stock = stockMap.get(String(p._id));
        const available = stock?.totalAvailable ?? 0;
        return {
          productId: p._id,
          productSku: p.sku,
          productName: p.name,
          safetyStock: p.safetyStock,
          availableQuantity: available,
          shortage: p.safetyStock - available,
        };
      })
      .filter((a) => a.shortage > 0)
      .sort((a, b) => b.shortage - a.shortage);

    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ message: '安全在庫アラートの取得に失敗しました', error: error.message });
  }
};

/** 出荷引当（出荷作業画面から手動実行） */
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

    const orders = await ShipmentOrder.find({ _id: { $in: validIds.map((id: string) => new mongoose.Types.ObjectId(id)) } }).lean();

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
  } catch (error: any) {
    res.status(500).json({ message: '在庫引当に失敗しました', error: error.message });
  }
};

/** 在庫移動（ロケーション間） */
export const transferStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, fromLocationId, toLocationId, quantity, lotId, memo } = req.body;

    if (!productId || !fromLocationId || !toLocationId || !quantity || quantity <= 0) {
      res.status(400).json({ message: 'productId, fromLocationId, toLocationId, quantity(>0) は必須です' });
      return;
    }
    if (fromLocationId === toLocationId) {
      res.status(400).json({ message: '移動元と移動先が同じです' });
      return;
    }

    const product = await Product.findById(productId).lean();
    if (!product) { res.status(404).json({ message: '商品が見つかりません' }); return; }

    const [fromLoc, toLoc] = await Promise.all([
      Location.findById(fromLocationId).lean(),
      Location.findById(toLocationId).lean(),
    ]);
    if (!fromLoc) { res.status(404).json({ message: '移動元ロケーションが見つかりません' }); return; }
    if (!toLoc) { res.status(404).json({ message: '移動先ロケーションが見つかりません' }); return; }

    const qty = Number(quantity);
    const fromQuantFilter = {
      productId: new mongoose.Types.ObjectId(productId),
      locationId: new mongoose.Types.ObjectId(fromLocationId),
      lotId: lotId ? new mongoose.Types.ObjectId(lotId) : undefined,
    };

    // Check available stock at source
    const sourceQuant = await StockQuant.findOne(fromQuantFilter).lean();
    const available = (sourceQuant?.quantity ?? 0) - (sourceQuant?.reservedQuantity ?? 0);
    if (available < qty) {
      res.status(400).json({ message: `移動元の有効在庫が不足しています（有効: ${available}, 移動数: ${qty}）` });
      return;
    }

    // Decrease source
    await StockQuant.findOneAndUpdate(
      fromQuantFilter,
      { $inc: { quantity: -qty }, $set: { lastMovedAt: new Date() } },
    );

    // Increase destination (upsert)
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
      { upsert: true },
    );

    // Record StockMove
    const moveNumber = await generateSequenceNumber('MV');
    await StockMove.create({
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
    });

    res.json({ message: `${qty}個を ${fromLoc.code} → ${toLoc.code} に移動しました`, moveNumber });
  } catch (error: any) {
    res.status(500).json({ message: '在庫移動に失敗しました', error: error.message });
  }
};

/** 一括在庫調整 */
export const bulkAdjustStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { adjustments } = req.body;
    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      res.status(400).json({ message: '調整データが必要です' });
      return;
    }

    const virtualSupplier = await Location.findOne({ code: 'VIRTUAL/SUPPLIER' }).lean();
    const virtualCustomer = await Location.findOne({ code: 'VIRTUAL/CUSTOMER' }).lean();
    if (!virtualSupplier || !virtualCustomer) {
      res.status(500).json({ message: '仮想ロケーションが見つかりません' });
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const adj of adjustments) {
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

        // Find or skip lot
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

    res.json({
      message: `一括調整完了: 成功${successCount}件、失敗${failCount}件`,
      successCount,
      failCount,
      errors,
    });
  } catch (error: any) {
    res.status(500).json({ message: '一括調整に失敗しました', error: error.message });
  }
};

/** 0在庫レコードのクリーンアップ */
export const cleanupZeroStock = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await StockQuant.deleteMany({
      quantity: { $lte: 0 },
      reservedQuantity: { $lte: 0 },
    });
    res.json({ message: `${result.deletedCount}件の0在庫レコードを削除しました`, deletedCount: result.deletedCount });
  } catch (error: any) {
    res.status(500).json({ message: '0在庫の削除に失敗しました', error: error.message });
  }
};
