import type { Request, Response } from 'express';
import { Warehouse } from '@/models/warehouse';
import { sendError } from '@/api/helpers/responseHelper';

export const listWarehouses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page, limit, isActive } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { code: { $regex: escaped, $options: 'i' } },
        { name: { $regex: escaped, $options: 'i' } },
        { name2: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (typeof isActive === 'string') {
      if (isActive === 'true') filter.isActive = true;
      if (isActive === 'false') filter.isActive = false;
    }

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      Warehouse.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Warehouse.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: any) {
    sendError(res, '倉庫の取得に失敗しました', 500, 'INTERNAL_ERROR');
  }
};

export const getWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await Warehouse.findById(req.params.id).lean();
    if (!item) {
      sendError(res, '倉庫が見つかりません', 404, 'NOT_FOUND');
      return;
    }
    res.json(item);
  } catch (error: any) {
    sendError(res, '倉庫の取得に失敗しました', 500, 'INTERNAL_ERROR');
  }
};

export const createWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, name2, postalCode, prefecture, city, address, address2, phone, coolTypes, capacity, operatingHours, memo, isActive, sortOrder } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      sendError(res, '倉庫コードは必須です', 400, 'VALIDATION_ERROR');
      return;
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      sendError(res, '倉庫名は必須です', 400, 'VALIDATION_ERROR');
      return;
    }

    const existing = await Warehouse.findOne({ code: code.trim() }).lean();
    if (existing) {
      sendError(res, `倉庫コード「${code.trim()}」は既に存在します`, 409, 'DUPLICATE_ERROR');
      return;
    }

    const created = await Warehouse.create({
      code: code.trim(),
      name: name.trim(),
      name2: name2?.trim() || '',
      postalCode: postalCode?.trim() || '',
      prefecture: prefecture?.trim() || '',
      city: city?.trim() || '',
      address: address?.trim() || '',
      address2: address2?.trim() || '',
      phone: phone?.trim() || '',
      coolTypes: Array.isArray(coolTypes) ? coolTypes : [],
      capacity: capacity !== undefined ? capacity : 0,
      operatingHours: operatingHours?.trim() || '',
      memo: memo?.trim() || '',
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder !== undefined ? sortOrder : 0,
    });

    res.status(201).json(created.toObject());
  } catch (error: any) {
    if (error.code === 11000) {
      const duplicateKey = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const duplicateValue = error.keyValue ? error.keyValue[duplicateKey] : 'unknown';
      sendError(res, `重複エラー: ${duplicateKey} フィールドの値「${duplicateValue}」が既に存在します`, 409, 'DUPLICATE_ERROR');
      return;
    }
    sendError(res, '倉庫の作成に失敗しました', 500, 'INTERNAL_ERROR');
  }
};

export const updateWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, name2, postalCode, prefecture, city, address, address2, phone, coolTypes, capacity, operatingHours, memo, isActive, sortOrder } = req.body;

    const existing = await Warehouse.findById(req.params.id).lean();
    if (!existing) {
      sendError(res, '倉庫が見つかりません', 404, 'NOT_FOUND');
      return;
    }

    // If code is changing, verify uniqueness
    if (code && code.trim() !== existing.code) {
      const duplicate = await Warehouse.findOne({ code: code.trim(), _id: { $ne: existing._id } }).lean();
      if (duplicate) {
        res.status(409).json({
          message: `倉庫コード「${code.trim()}」は既に存在します`,
          duplicateField: 'code',
          duplicateValue: code.trim(),
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (code !== undefined) updateData.code = code.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (name2 !== undefined) updateData.name2 = name2.trim();
    if (postalCode !== undefined) updateData.postalCode = postalCode.trim();
    if (prefecture !== undefined) updateData.prefecture = prefecture.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (address2 !== undefined) updateData.address2 = address2.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (coolTypes !== undefined) updateData.coolTypes = Array.isArray(coolTypes) ? coolTypes : [];
    if (capacity !== undefined) updateData.capacity = capacity;
    if (operatingHours !== undefined) updateData.operatingHours = operatingHours.trim();
    if (memo !== undefined) updateData.memo = memo.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updated = await Warehouse.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      sendError(res, '倉庫が見つかりません', 404, 'NOT_FOUND');
      return;
    }

    res.json(updated);
  } catch (error: any) {
    if (error.code === 11000) {
      const duplicateKey = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const duplicateValue = error.keyValue ? error.keyValue[duplicateKey] : 'unknown';
      sendError(res, `重複エラー: ${duplicateKey} フィールドの値「${duplicateValue}」が既に存在します`, 409, 'DUPLICATE_ERROR');
      return;
    }
    sendError(res, '倉庫の更新に失敗しました', 500, 'INTERNAL_ERROR');
  }
};

export const deleteWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await Warehouse.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    ).lean();

    if (!updated) {
      sendError(res, '倉庫が見つかりません', 404, 'NOT_FOUND');
      return;
    }

    res.json({ message: 'Deleted', id: updated._id });
  } catch (error: any) {
    sendError(res, '倉庫の削除に失敗しました', 500, 'INTERNAL_ERROR');
  }
};

export const exportWarehouses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const warehouses = await Warehouse.find({ isActive: true }).sort({ code: 1 }).lean();
    res.json(warehouses);
  } catch (error: any) {
    sendError(res, '倉庫のエクスポートに失敗しました', 500, 'INTERNAL_ERROR');
  }
};
