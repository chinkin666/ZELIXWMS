import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Lot } from '@/models/lot';
import { Product } from '@/models/product';
import { StockQuant } from '@/models/stockQuant';

/** ロット一覧 */
export const listLots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, status, search, page: pageStr, limit: limitStr } = req.query;

    const filter: Record<string, unknown> = {};
    if (typeof productId === 'string' && productId.trim()) {
      filter.productId = new mongoose.Types.ObjectId(productId);
    }
    if (typeof status === 'string' && status.trim()) {
      filter.status = status.trim();
    }
    if (typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { lotNumber: regex },
        { productSku: regex },
        { productName: regex },
      ];
    }

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitStr) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Lot.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lot.countDocuments(filter),
    ]);

    res.json({ items, total, page, limit });
  } catch (error: unknown) {
    // エラーメッセージ抽出 / 提取错误消息
    const errMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'ロット一覧の取得に失敗しました', error: errMessage });
  }
};

/** ロット詳細 */
export const getLot = async (req: Request, res: Response): Promise<void> => {
  try {
    const lot = await Lot.findById(req.params.id).lean();
    if (!lot) {
      res.status(404).json({ message: 'ロットが見つかりません' });
      return;
    }

    // ロットの在庫数を集計
    const quants = await StockQuant.find({ lotId: lot._id })
      .populate('locationId', 'code name fullPath')
      .lean();

    const totalQuantity = quants.reduce((sum, q) => sum + q.quantity, 0);
    const totalReserved = quants.reduce((sum, q) => sum + q.reservedQuantity, 0);

    res.json({
      ...lot,
      quants,
      totalQuantity,
      totalReserved,
      totalAvailable: totalQuantity - totalReserved,
    });
  } catch (error: unknown) {
    // エラーメッセージ抽出 / 提取错误消息
    const errMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'ロットの取得に失敗しました', error: errMessage });
  }
};

/** ロット作成 */
export const createLot = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lotNumber, productId, expiryDate, manufactureDate, status: lotStatus, memo } = req.body;

    if (!lotNumber || !productId) {
      res.status(400).json({ message: 'lotNumber と productId は必須です' });
      return;
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      res.status(400).json({ message: '商品が見つかりません' });
      return;
    }

    const existing = await Lot.findOne({
      productId: new mongoose.Types.ObjectId(productId),
      lotNumber: lotNumber.trim(),
    }).lean();
    if (existing) {
      res.status(409).json({ message: 'この商品に同じロット番号が既に存在します', lot: existing });
      return;
    }

    const lot = await Lot.create({
      lotNumber: lotNumber.trim(),
      productId: product._id,
      productSku: product.sku,
      productName: product.name,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      manufactureDate: manufactureDate ? new Date(manufactureDate) : undefined,
      status: lotStatus || 'active',
      memo: memo || undefined,
    });

    res.status(201).json(lot);
  } catch (error: unknown) {
    // エラーメッセージ抽出 / 提取错误消息
    const errMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'ロットの作成に失敗しました', error: errMessage });
  }
};

/** ロット更新 */
export const updateLot = async (req: Request, res: Response): Promise<void> => {
  try {
    const lot = await Lot.findById(req.params.id);
    if (!lot) {
      res.status(404).json({ message: 'ロットが見つかりません' });
      return;
    }

    const { expiryDate, manufactureDate, status: lotStatus, memo } = req.body;

    if (expiryDate !== undefined) lot.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
    if (manufactureDate !== undefined) lot.manufactureDate = manufactureDate ? new Date(manufactureDate) : undefined;
    if (lotStatus !== undefined) lot.status = lotStatus;
    if (memo !== undefined) lot.memo = memo || undefined;

    await lot.save();
    res.json(lot);
  } catch (error: unknown) {
    // エラーメッセージ抽出 / 提取错误消息
    const errMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'ロットの更新に失敗しました', error: errMessage });
  }
};

/** ロット削除（在庫がない場合のみ） */
export const deleteLot = async (req: Request, res: Response): Promise<void> => {
  try {
    const lot = await Lot.findById(req.params.id).lean();
    if (!lot) {
      res.status(404).json({ message: 'ロットが見つかりません' });
      return;
    }

    const quantCount = await StockQuant.countDocuments({
      lotId: lot._id,
      quantity: { $gt: 0 },
    });
    if (quantCount > 0) {
      res.status(400).json({ message: 'このロットに在庫があるため削除できません' });
      return;
    }

    await Lot.findByIdAndDelete(req.params.id);
    res.json({ message: 'ロットを削除しました' });
  } catch (error: unknown) {
    // エラーメッセージ抽出 / 提取错误消息
    const errMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'ロットの削除に失敗しました', error: errMessage });
  }
};

/** 賞味期限アラート（期限切れ間近・期限切れのロット） */
export const listExpiryAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { daysAhead: daysStr } = req.query;
    const daysAhead = Math.max(1, Number(daysStr) || 30);

    const now = new Date();
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + daysAhead);

    // 期限切れ + 期限間近のアクティブロット（在庫あり）
    const lots = await Lot.find({
      expiryDate: { $lte: alertDate },
      status: { $in: ['active'] },
    })
      .sort({ expiryDate: 1 })
      .lean();

    // 各ロットの在庫数集計
    const alerts = [];
    for (const lot of lots) {
      const agg = await StockQuant.aggregate([
        { $match: { lotId: lot._id } },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$quantity' },
            totalReserved: { $sum: '$reservedQuantity' },
          },
        },
      ]);

      const stock = agg[0] || { totalQuantity: 0, totalReserved: 0 };
      if (stock.totalQuantity <= 0) continue;

      const isExpired = lot.expiryDate && lot.expiryDate <= now;

      alerts.push({
        lotId: String(lot._id),
        lotNumber: lot.lotNumber,
        productId: String(lot.productId),
        productSku: lot.productSku,
        productName: lot.productName,
        expiryDate: lot.expiryDate,
        daysUntilExpiry: lot.expiryDate
          ? Math.ceil((lot.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
        isExpired,
        totalQuantity: stock.totalQuantity,
        totalAvailable: stock.totalQuantity - stock.totalReserved,
      });
    }

    res.json({ alerts, daysAhead });
  } catch (error: unknown) {
    // エラーメッセージ抽出 / 提取错误消息
    const errMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '賞味期限アラートの取得に失敗しました', error: errMessage });
  }
};

/** バッチ処理：期限切れロットのステータスを expired に更新 */
export const updateExpiredLots = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();

    const result = await Lot.updateMany(
      {
        expiryDate: { $lte: now },
        status: 'active',
      },
      {
        $set: { status: 'expired' },
      },
    );

    res.json({
      message: `${result.modifiedCount}件のロットを期限切れに更新しました`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: unknown) {
    // エラーメッセージ抽出 / 提取错误消息
    const errMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '期限切れ更新に失敗しました', error: errMessage });
  }
};

/**
 * 入庫検品時のロット自動作成/取得ヘルパー（他コントローラから呼ぶ）。
 * lotTrackingEnabled の商品に対して、lotNumber で既存ロットを探すか新規作成。
 */
export async function findOrCreateLot(
  productId: string,
  productSku: string,
  productName: string | undefined,
  lotNumber: string,
  expiryDate?: Date,
  manufactureDate?: Date,
): Promise<mongoose.Types.ObjectId> {
  const existing = await Lot.findOne({
    productId: new mongoose.Types.ObjectId(productId),
    lotNumber,
  });

  if (existing) {
    // 賞味期限が設定されていない場合のみ更新
    if (expiryDate && !existing.expiryDate) {
      existing.expiryDate = expiryDate;
      await existing.save();
    }
    return existing._id;
  }

  const lot = await Lot.create({
    lotNumber,
    productId: new mongoose.Types.ObjectId(productId),
    productSku,
    productName,
    expiryDate,
    manufactureDate,
    status: 'active',
  });

  return lot._id;
}
