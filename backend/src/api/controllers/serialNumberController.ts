import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { SerialNumber } from '@/models/serialNumber';

const VALID_STATUSES = ['available', 'reserved', 'shipped', 'returned', 'damaged', 'scrapped'] as const;

/** シリアル番号一覧 */
export const listSerialNumbers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, status, warehouseId, lotId, search, page: pageStr, limit: limitStr } = req.query;

    const filter: Record<string, unknown> = {};
    if (typeof productId === 'string' && productId.trim()) {
      filter.productId = new mongoose.Types.ObjectId(productId);
    }
    if (typeof status === 'string' && status.trim()) {
      filter.status = status.trim();
    }
    if (typeof warehouseId === 'string' && warehouseId.trim()) {
      filter.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    }
    if (typeof lotId === 'string' && lotId.trim()) {
      filter.lotId = new mongoose.Types.ObjectId(lotId);
    }
    if (typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { serialNumber: regex },
      ];
    }

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitStr) || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      SerialNumber.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SerialNumber.countDocuments(filter),
    ]);

    res.json({ data, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: 'シリアル番号一覧の取得に失敗しました', error: error.message });
  }
};

/** シリアル番号詳細 */
export const getSerialNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const serial = await SerialNumber.findById(req.params.id).lean();
    if (!serial) {
      res.status(404).json({ message: 'シリアル番号が見つかりません' });
      return;
    }
    res.json(serial);
  } catch (error: any) {
    res.status(500).json({ message: 'シリアル番号の取得に失敗しました', error: error.message });
  }
};

/** シリアル番号作成 */
export const createSerialNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serialNumber, productId } = req.body;

    if (!serialNumber || !productId) {
      res.status(400).json({ message: 'serialNumber と productId は必須です' });
      return;
    }

    const existing = await SerialNumber.findOne({
      productId: new mongoose.Types.ObjectId(productId),
      serialNumber: serialNumber.trim(),
    }).lean();
    if (existing) {
      res.status(409).json({ message: 'この商品に同じシリアル番号が既に存在します' });
      return;
    }

    const serial = await SerialNumber.create({
      ...req.body,
      serialNumber: serialNumber.trim(),
    });

    res.status(201).json(serial);
  } catch (error: any) {
    res.status(500).json({ message: 'シリアル番号の作成に失敗しました', error: error.message });
  }
};

/** シリアル番号一括作成 */
export const bulkCreateSerialNumbers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serialNumbers } = req.body;

    if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      res.status(400).json({ message: 'serialNumbers 配列は必須です' });
      return;
    }

    // Validate each entry has required fields
    for (let i = 0; i < serialNumbers.length; i++) {
      const entry = serialNumbers[i];
      if (!entry.serialNumber || !entry.productId) {
        res.status(400).json({
          message: `serialNumbers[${i}]: serialNumber と productId は必須です`,
        });
        return;
      }
    }

    // Check for duplicates within the batch
    const keys = serialNumbers.map(
      (s: any) => `${s.productId}:${s.serialNumber.trim()}`,
    );
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      res.status(400).json({ message: 'バッチ内に重複するシリアル番号があります' });
      return;
    }

    // Check for existing records
    const orConditions = serialNumbers.map((s: any) => ({
      productId: new mongoose.Types.ObjectId(s.productId),
      serialNumber: s.serialNumber.trim(),
    }));
    const existingCount = await SerialNumber.countDocuments({ $or: orConditions });
    if (existingCount > 0) {
      res.status(409).json({
        message: '既に存在するシリアル番号が含まれています',
        existingCount,
      });
      return;
    }

    const docs = serialNumbers.map((s: any) => ({
      ...s,
      serialNumber: s.serialNumber.trim(),
    }));

    const created = await SerialNumber.insertMany(docs);
    res.status(201).json({ created, count: created.length });
  } catch (error: any) {
    res.status(500).json({ message: 'シリアル番号の一括作成に失敗しました', error: error.message });
  }
};

/** シリアル番号更新 */
export const updateSerialNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const serial = await SerialNumber.findById(req.params.id);
    if (!serial) {
      res.status(404).json({ message: 'シリアル番号が見つかりません' });
      return;
    }

    const { serialNumber, productId } = req.body;

    // Check uniqueness if serialNumber or productId is changing
    const newSerialNumber = serialNumber?.trim() ?? serial.serialNumber;
    const newProductId = productId ?? serial.productId;
    if (
      (serialNumber && serialNumber.trim() !== serial.serialNumber) ||
      (productId && String(productId) !== String(serial.productId))
    ) {
      const existing = await SerialNumber.findOne({
        productId: new mongoose.Types.ObjectId(newProductId),
        serialNumber: newSerialNumber,
        _id: { $ne: serial._id },
      }).lean();
      if (existing) {
        res.status(409).json({ message: 'この商品に同じシリアル番号が既に存在します' });
        return;
      }
    }

    const updatableFields = [
      'serialNumber', 'productId', 'lotId', 'status', 'warehouseId', 'locationId',
      'shipmentOrderId', 'receivedAt', 'shippedAt', 'memo',
    ] as const;

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        (serial as any)[field] = req.body[field];
      }
    }

    await serial.save();
    res.json(serial);
  } catch (error: any) {
    res.status(500).json({ message: 'シリアル番号の更新に失敗しました', error: error.message });
  }
};

/** シリアル番号ステータス更新 */
export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const serial = await SerialNumber.findById(req.params.id);
    if (!serial) {
      res.status(404).json({ message: 'シリアル番号が見つかりません' });
      return;
    }

    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({
        message: `status は次のいずれかである必要があります: ${VALID_STATUSES.join(', ')}`,
      });
      return;
    }

    // Status transition validation
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      available: ['reserved', 'damaged', 'scrapped'],
      reserved: ['available', 'shipped', 'damaged'],
      shipped: ['returned'],
      returned: ['available', 'damaged', 'scrapped'],
      damaged: ['scrapped', 'available'],
      scrapped: [],
    };

    const allowed = ALLOWED_TRANSITIONS[serial.status] ?? [];
    if (!allowed.includes(status)) {
      res.status(400).json({
        message: `ステータスを「${serial.status}」から「${status}」に変更できません`,
        allowedTransitions: allowed,
      });
      return;
    }

    serial.status = status;

    // Auto-set timestamps based on status
    if (status === 'shipped' && !serial.shippedAt) {
      serial.shippedAt = new Date();
    }

    await serial.save();
    res.json(serial);
  } catch (error: any) {
    res.status(500).json({ message: 'シリアル番号のステータス更新に失敗しました', error: error.message });
  }
};

/** シリアル番号をコードで検索 */
export const getSerialNumberByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serialNumber, productId } = req.query;

    if (!serialNumber || !productId) {
      res.status(400).json({ message: 'serialNumber と productId クエリパラメータは必須です' });
      return;
    }

    const serial = await SerialNumber.findOne({
      serialNumber: String(serialNumber).trim(),
      productId: new mongoose.Types.ObjectId(String(productId)),
    }).lean();

    if (!serial) {
      res.status(404).json({ message: 'シリアル番号が見つかりません' });
      return;
    }

    res.json(serial);
  } catch (error: any) {
    res.status(500).json({ message: 'シリアル番号の検索に失敗しました', error: error.message });
  }
};
