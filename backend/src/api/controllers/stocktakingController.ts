import type { Request, Response } from 'express';
import { StocktakingOrder } from '@/models/stocktakingOrder';
import { StockQuant } from '@/models/stockQuant';
import { StockMove } from '@/models/stockMove';
import { Location } from '@/models/location';
import { Product } from '@/models/product';
import { Lot } from '@/models/lot';
import { logOperation } from '@/services/operationLogger';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// 番号生成
// ---------------------------------------------------------------------------
function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(10000000 + Math.random() * 90000000);
  return `ST${dateStr}-${rand}`;
}

// ---------------------------------------------------------------------------
// GET /api/stocktaking-orders
// ---------------------------------------------------------------------------
export async function listStocktakingOrders(req: Request, res: Response) {
  try {
    const { status, type, page = '1', limit = '50' } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      StocktakingOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      StocktakingOrder.countDocuments(filter),
    ]);

    res.json({ data: docs, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// GET /api/stocktaking-orders/:id
// ---------------------------------------------------------------------------
export async function getStocktakingOrder(req: Request, res: Response) {
  try {
    const doc = await StocktakingOrder.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: '棚卸指示が見つかりません' });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/stocktaking-orders
// ---------------------------------------------------------------------------
export async function createStocktakingOrder(req: Request, res: Response) {
  try {
    const { type, targetLocations, targetProducts, scheduledDate, memo } = req.body;

    // 对象ロケーション/商品のフィルタ構築
    const quantFilter: Record<string, unknown> = {};
    if (targetLocations?.length) {
      quantFilter.locationId = { $in: targetLocations.map((id: string) => new mongoose.Types.ObjectId(id)) };
    }
    if (targetProducts?.length) {
      quantFilter.productId = { $in: targetProducts.map((id: string) => new mongoose.Types.ObjectId(id)) };
    }

    // StockQuantからシステム在庫をスナップショット
    const quants = await StockQuant.find(quantFilter).lean();

    // ロケーション名を取得
    const locationIds = [...new Set(quants.map((q) => String(q.locationId)))];
    const locations = await Location.find({ _id: { $in: locationIds } }).lean();
    const locMap = new Map(locations.map((l) => [String(l._id), l.name]));

    // 商品名を取得
    const productIds = [...new Set(quants.map((q) => String(q.productId)))];
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const prodMap = new Map(products.map((p) => [String(p._id), { sku: p.sku, name: p.name }]));

    // ロット番号を一括取得 / 批量获取批次号
    const lotIds = quants.map(q => q.lotId).filter((id): id is mongoose.Types.ObjectId => !!id);
    const lotMap = new Map<string, string>();
    if (lotIds.length > 0) {
      const lots = await Lot.find({ _id: { $in: lotIds } }).select('_id lotNumber').lean();
      for (const l of lots) { lotMap.set(String(l._id), l.lotNumber); }
    }

    const lines = quants.map((q) => {
      const prod = prodMap.get(String(q.productId));
      return {
        locationId: q.locationId,
        locationName: locMap.get(String(q.locationId)) || '',
        productId: q.productId,
        productSku: prod?.sku || q.productSku || '',
        productName: prod?.name || '',
        lotId: q.lotId || undefined,
        lotNumber: q.lotId ? lotMap.get(String(q.lotId)) : undefined,
        systemQuantity: q.quantity,
        countedQuantity: undefined as number | undefined,
        variance: undefined as number | undefined,
        status: 'pending' as const,
      };
    });

    const doc = await StocktakingOrder.create({
      orderNumber: generateOrderNumber(),
      type: type || 'spot',
      status: 'draft',
      targetLocations: targetLocations || [],
      targetProducts: targetProducts || [],
      scheduledDate,
      lines,
      memo,
    });

    logOperation({
      action: 'stocktaking',
      description: `棚卸を作成: ${doc.orderNumber}（${lines.length}行）`,
      referenceNumber: doc.orderNumber,
      referenceType: 'stocktakingOrder',
      referenceId: String(doc._id),
      quantity: lines.length,
    }).catch(() => {});

    res.status(201).json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/stocktaking-orders/:id
// ---------------------------------------------------------------------------
export async function updateStocktakingOrder(req: Request, res: Response) {
  try {
    const doc = await StocktakingOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '棚卸指示が見つかりません' });
    if (doc.status !== 'draft' && doc.status !== 'in_progress') {
      return res.status(400).json({ error: 'この状態では編集できません' });
    }

    const { type, scheduledDate, memo, lines } = req.body;
    if (type !== undefined) doc.type = type;
    if (scheduledDate !== undefined) doc.scheduledDate = scheduledDate;
    if (memo !== undefined) doc.memo = memo;
    if (lines !== undefined) doc.lines = lines;

    await doc.save();
    res.json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/stocktaking-orders/:id/start - 棚卸開始
// ---------------------------------------------------------------------------
export async function startStocktakingOrder(req: Request, res: Response) {
  try {
    const doc = await StocktakingOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '棚卸指示が見つかりません' });
    if (doc.status !== 'draft') {
      return res.status(400).json({ error: 'ドラフト状態のみ開始できます' });
    }

    doc.status = 'in_progress';
    doc.startedAt = new Date();
    await doc.save();
    res.json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/stocktaking-orders/:id/count - カウント結果登録
// ---------------------------------------------------------------------------
export async function recordCount(req: Request, res: Response) {
  try {
    const doc = await StocktakingOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '棚卸指示が見つかりません' });
    if (doc.status !== 'in_progress') {
      return res.status(400).json({ error: '進行中の棚卸のみカウント可能です' });
    }

    const { counts } = req.body;
    // counts: Array<{ lineIndex: number, countedQuantity: number }>
    if (!Array.isArray(counts)) {
      return res.status(400).json({ error: 'counts配列が必要です' });
    }

    for (const c of counts) {
      const line = doc.lines[c.lineIndex];
      if (!line) continue;
      line.countedQuantity = c.countedQuantity;
      line.variance = c.countedQuantity - line.systemQuantity;
      line.status = 'counted';
    }

    await doc.save();
    res.json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/stocktaking-orders/:id/complete - 棚卸完了
// ---------------------------------------------------------------------------
export async function completeStocktakingOrder(req: Request, res: Response) {
  try {
    const doc = await StocktakingOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '棚卸指示が見つかりません' });
    if (doc.status !== 'in_progress') {
      return res.status(400).json({ error: '進行中の棚卸のみ完了できます' });
    }

    const uncounted = doc.lines.filter((l) => l.status === 'pending');
    if (uncounted.length > 0) {
      return res.status(400).json({
        error: `未カウントの明細が${uncounted.length}件あります`,
      });
    }

    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();
    res.json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/stocktaking-orders/:id/adjust - 差異調整を在庫に反映
// ---------------------------------------------------------------------------
export async function adjustStocktakingOrder(req: Request, res: Response) {
  try {
    const doc = await StocktakingOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '棚卸指示が見つかりません' });
    if (doc.status !== 'completed') {
      return res.status(400).json({ error: '完了済みの棚卸のみ調整できます' });
    }

    // VIRTUAL/SUPPLIER ロケーション取得（在庫調整用）
    const virtualLoc = await Location.findOne({ type: 'virtual/supplier' }).lean();
    if (!virtualLoc) {
      return res.status(400).json({ error: '仮想ロケーション(VIRTUAL/SUPPLIER)が見つかりません' });
    }

    const varianceLines = doc.lines.filter((l) => l.variance && l.variance !== 0);
    const errors: string[] = [];
    let adjustedCount = 0;

    for (const line of varianceLines) {
      try {
        const variance = line.variance!;
        const now = new Date();
        const moveNumber = `SM${now.toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(10000000 + Math.random() * 90000000)}`;

        // 正の差異: 増加（supplier → location）
        // 負の差異: 減少（location → supplier）
        const fromLoc = variance > 0 ? virtualLoc._id : line.locationId;
        const toLoc = variance > 0 ? line.locationId : virtualLoc._id;

        await StockMove.create({
          moveNumber,
          moveType: 'stocktaking',
          state: 'done',
          productId: line.productId,
          productSku: line.productSku,
          productName: line.productName,
          lotId: line.lotId,
          fromLocationId: fromLoc,
          toLocationId: toLoc,
          quantity: Math.abs(variance),
          referenceType: 'stocktaking-order',
          referenceId: String(doc._id),
          referenceNumber: doc.orderNumber,
          executedAt: now,
          memo: `棚卸調整: システム${line.systemQuantity} → 実数${line.countedQuantity}`,
        });

        // StockQuant更新
        const quantFilter = {
          productId: line.productId,
          locationId: line.locationId,
          ...(line.lotId ? { lotId: line.lotId } : { lotId: { $exists: false } }),
        };

        // 正負どちらの差異でも upsert で安全に更新 / 正负差异都用upsert安全更新
        await StockQuant.findOneAndUpdate(
          quantFilter,
          {
            $inc: { quantity: variance },
            $set: { lastMovedAt: new Date() },
          },
          { upsert: true },
        );

        line.status = 'verified';
        adjustedCount++;
      } catch (e: any) {
        errors.push(`${line.productSku}@${line.locationName}: ${e.message}`);
      }
    }

    // 差異のない行もverifiedに
    for (const line of doc.lines) {
      if (line.variance === 0 || line.variance === undefined) {
        line.status = 'verified';
      }
    }

    doc.status = 'adjusted';
    doc.adjustedAt = new Date();
    await doc.save();

    logOperation({
      action: 'stocktaking',
      description: `棚卸調整完了: ${doc.orderNumber}（${adjustedCount}件調整${errors.length > 0 ? `, ${errors.length}件エラー` : ''}）`,
      referenceNumber: doc.orderNumber,
      referenceType: 'stocktakingOrder',
      referenceId: String(doc._id),
      quantity: adjustedCount,
    }).catch(() => {});

    res.json({
      data: doc.toObject(),
      adjustedCount,
      errors,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/stocktaking-orders/:id/cancel - 棚卸キャンセル
// ---------------------------------------------------------------------------
export async function cancelStocktakingOrder(req: Request, res: Response) {
  try {
    const doc = await StocktakingOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '棚卸指示が見つかりません' });
    if (doc.status === 'adjusted') {
      return res.status(400).json({ error: '調整済みの棚卸はキャンセルできません' });
    }

    doc.status = 'cancelled';
    await doc.save();
    res.json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/stocktaking-orders/:id
// ---------------------------------------------------------------------------
export async function deleteStocktakingOrder(req: Request, res: Response) {
  try {
    const doc = await StocktakingOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '棚卸指示が見つかりません' });
    if (doc.status !== 'draft' && doc.status !== 'cancelled') {
      return res.status(400).json({ error: 'ドラフトまたはキャンセル済みのみ削除できます' });
    }

    await doc.deleteOne();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
