import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { InventoryLedger } from '@/models/inventoryLedger';
import { InventoryReservation } from '@/models/inventoryReservation';

export const getLedgerEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, warehouseId, type, referenceType, from, to, page, limit } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof productId === 'string' && productId.trim()) {
      filter.productId = new mongoose.Types.ObjectId(productId.trim());
    }
    if (typeof warehouseId === 'string' && warehouseId.trim()) {
      filter.warehouseId = new mongoose.Types.ObjectId(warehouseId.trim());
    }
    if (typeof type === 'string' && type.trim()) {
      filter.type = type.trim();
    }
    if (typeof referenceType === 'string' && referenceType.trim()) {
      filter.referenceType = referenceType.trim();
    }

    if (typeof from === 'string' || typeof to === 'string') {
      const dateFilter: Record<string, Date> = {};
      if (typeof from === 'string' && from.trim()) {
        dateFilter.$gte = new Date(from.trim());
      }
      if (typeof to === 'string' && to.trim()) {
        dateFilter.$lte = new Date(to.trim());
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.createdAt = dateFilter;
      }
    }

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      InventoryLedger.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      InventoryLedger.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: '在庫台帳の取得に失敗しました', error: error.message });
  }
};

export const getStockLevel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, warehouseId } = req.query;

    if (!productId || typeof productId !== 'string' || !productId.trim()) {
      res.status(400).json({ message: '商品IDは必須です' });
      return;
    }

    const productOid = new mongoose.Types.ObjectId(productId.trim());

    const ledgerMatch: Record<string, unknown> = { productId: productOid };
    if (typeof warehouseId === 'string' && warehouseId.trim()) {
      ledgerMatch.warehouseId = new mongoose.Types.ObjectId(warehouseId.trim());
    }

    const reservationMatch: Record<string, unknown> = {
      productId: productOid,
      status: 'active',
    };
    if (typeof warehouseId === 'string' && warehouseId.trim()) {
      reservationMatch.warehouseId = new mongoose.Types.ObjectId(warehouseId.trim());
    }

    const [stockResult, reservedResult] = await Promise.all([
      InventoryLedger.aggregate([
        { $match: ledgerMatch },
        { $group: { _id: null, totalStock: { $sum: '$quantity' } } },
      ]),
      InventoryReservation.aggregate([
        { $match: reservationMatch },
        { $group: { _id: null, reservedStock: { $sum: '$quantity' } } },
      ]),
    ]);

    const totalStock = stockResult.length > 0 ? stockResult[0].totalStock : 0;
    const reservedStock = reservedResult.length > 0 ? reservedResult[0].reservedStock : 0;
    const availableStock = totalStock - reservedStock;

    res.json({
      productId: productId.trim(),
      warehouseId: warehouseId || null,
      totalStock,
      reservedStock,
      availableStock,
    });
  } catch (error: any) {
    res.status(500).json({ message: '在庫数の取得に失敗しました', error: error.message });
  }
};

export const getStockLevels = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouseId, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // warehouseId はオプション / warehouseId 可选
    const matchFilter: Record<string, unknown> = {};
    if (typeof warehouseId === 'string' && warehouseId.trim()) {
      matchFilter.warehouseId = new mongoose.Types.ObjectId(warehouseId.trim());
    }

    const reservationFilter: Record<string, unknown> = { status: 'active' };
    if (matchFilter.warehouseId) {
      reservationFilter.warehouseId = matchFilter.warehouseId;
    }

    const [stockData, reservedData, totalProducts] = await Promise.all([
      InventoryLedger.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$productId', totalStock: { $sum: '$quantity' }, productSku: { $first: '$productSku' } } },
        { $sort: { productSku: 1 } },
        { $skip: skip },
        { $limit: limitNum },
      ]),
      InventoryReservation.aggregate([
        { $match: reservationFilter },
        { $group: { _id: '$productId', reservedStock: { $sum: '$quantity' } } },
      ]),
      InventoryLedger.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$productId' } },
        { $count: 'total' },
      ]),
    ]);

    const reservedMap = new Map<string, number>();
    for (const r of reservedData) {
      reservedMap.set(String(r._id), r.reservedStock);
    }

    const data = stockData.map((item) => {
      const productIdStr = String(item._id);
      const reservedStock = reservedMap.get(productIdStr) || 0;
      return {
        productId: item._id,
        productSku: item.productSku,
        totalStock: item.totalStock,
        reservedStock,
        availableStock: item.totalStock - reservedStock,
      };
    });

    const total = totalProducts.length > 0 ? totalProducts[0].total : 0;

    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: '在庫サマリーの取得に失敗しました', error: error.message });
  }
};

export const createLedgerEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      productId, productSku, warehouseId, locationId, lotId, lotNumber,
      type, quantity, referenceType, referenceId, referenceNumber,
      reason, executedBy, executedAt, memo,
    } = req.body;

    const allowedTypes = ['adjustment', 'count'];
    if (!type || !allowedTypes.includes(type)) {
      res.status(400).json({
        message: `手動登録では type は ${allowedTypes.join(', ')} のいずれかを指定してください`,
      });
      return;
    }

    if (!productId) {
      res.status(400).json({ message: '商品IDは必須です' });
      return;
    }
    if (!productSku || typeof productSku !== 'string' || !productSku.trim()) {
      res.status(400).json({ message: '商品SKUは必須です' });
      return;
    }
    if (quantity === undefined || quantity === null || typeof quantity !== 'number') {
      res.status(400).json({ message: '数量は必須です' });
      return;
    }

    const created = await InventoryLedger.create({
      productId,
      productSku: productSku.trim(),
      warehouseId: warehouseId || undefined,
      locationId: locationId || undefined,
      lotId: lotId || undefined,
      lotNumber: lotNumber?.trim(),
      type,
      quantity,
      referenceType: referenceType || 'manual',
      referenceId,
      referenceNumber,
      reason: reason?.trim(),
      executedBy: executedBy?.trim(),
      executedAt: executedAt || new Date(),
      memo: memo?.trim(),
    });

    res.status(201).json(created.toObject());
  } catch (error: any) {
    res.status(500).json({ message: '在庫台帳エントリの作成に失敗しました', error: error.message });
  }
};

export const getReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, status, source, page, limit } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof productId === 'string' && productId.trim()) {
      filter.productId = new mongoose.Types.ObjectId(productId.trim());
    }
    if (typeof status === 'string' && status.trim()) {
      filter.status = status.trim();
    }
    if (typeof source === 'string' && source.trim()) {
      filter.source = source.trim();
    }

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      InventoryReservation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      InventoryReservation.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: '在庫引当の取得に失敗しました', error: error.message });
  }
};

export const createReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      productId, productSku, warehouseId, locationId, lotId, serialId,
      quantity, source, referenceId, referenceNumber, expiresAt, memo,
    } = req.body;

    if (!productId) {
      res.status(400).json({ message: '商品IDは必須です' });
      return;
    }
    if (!productSku || typeof productSku !== 'string' || !productSku.trim()) {
      res.status(400).json({ message: '商品SKUは必須です' });
      return;
    }
    if (quantity === undefined || quantity === null || typeof quantity !== 'number' || quantity <= 0) {
      res.status(400).json({ message: '引当数量は1以上の数値を指定してください' });
      return;
    }
    if (!source) {
      res.status(400).json({ message: '引当元種別は必須です' });
      return;
    }
    if (!referenceId) {
      res.status(400).json({ message: '引当元IDは必須です' });
      return;
    }

    const created = await InventoryReservation.create({
      productId,
      productSku: productSku.trim(),
      warehouseId: warehouseId || undefined,
      locationId: locationId || undefined,
      lotId: lotId || undefined,
      serialId: serialId || undefined,
      quantity,
      status: 'active',
      source,
      referenceId,
      referenceNumber: referenceNumber?.trim(),
      reservedAt: new Date(),
      expiresAt: expiresAt || undefined,
      memo: memo?.trim(),
    });

    res.status(201).json(created.toObject());
  } catch (error: any) {
    res.status(500).json({ message: '在庫引当の作成に失敗しました', error: error.message });
  }
};

export const releaseReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await InventoryReservation.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: '在庫引当が見つかりません' });
      return;
    }

    if (existing.status !== 'active') {
      res.status(400).json({
        message: `ステータスが「${existing.status}」のため解放できません。アクティブな引当のみ解放可能です`,
      });
      return;
    }

    const updated = await InventoryReservation.findByIdAndUpdate(
      req.params.id,
      { status: 'released', releasedAt: new Date() },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: '在庫引当が見つかりません' });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: '在庫引当の解放に失敗しました', error: error.message });
  }
};

export const fulfillReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await InventoryReservation.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: '在庫引当が見つかりません' });
      return;
    }

    if (existing.status !== 'active') {
      res.status(400).json({
        message: `ステータスが「${existing.status}」のため消化できません。アクティブな引当のみ消化可能です`,
      });
      return;
    }

    const updated = await InventoryReservation.findByIdAndUpdate(
      req.params.id,
      { status: 'fulfilled', fulfilledAt: new Date() },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: '在庫引当が見つかりません' });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: '在庫引当の消化に失敗しました', error: error.message });
  }
};
