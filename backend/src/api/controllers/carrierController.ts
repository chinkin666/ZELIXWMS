import type { Request, Response } from 'express';
import { Carrier } from '@/models/carrier';
import { createCarrierSchema, updateCarrierSchema } from '@/schemas/carrierSchema';
import { BUILT_IN_CARRIERS, isBuiltInCarrierId, getBuiltInCarrier } from '@/data/builtInCarriers';
import { sendError } from '@/api/helpers/responseHelper';

export const listCarriers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, enabled, page, limit } = req.query;

    // ページネーション（上限200） / 分页参数（上限200）
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 50, 1), 200);

    const filter: Record<string, unknown> = {};
    if (typeof code === 'string' && code.trim()) {
      filter.code = { $regex: code.trim(), $options: 'i' };
    }
    if (typeof name === 'string' && name.trim()) {
      filter.name = { $regex: name.trim(), $options: 'i' };
    }
    if (typeof enabled === 'string') {
      if (enabled === 'true') filter.enabled = true;
      if (enabled === 'false') filter.enabled = false;
    }

    // Get DB carriers
    const dbCarriers = await Carrier.find(filter).sort({ createdAt: -1 }).lean();

    // Filter built-in carriers based on query params
    // 内蔵キャリアをクエリパラメータでフィルタ / 根据查询参数过滤内置承运商
    let filteredBuiltIn = [...BUILT_IN_CARRIERS];
    if (typeof code === 'string' && code.trim()) {
      const codePattern = code.trim().toLowerCase();
      filteredBuiltIn = filteredBuiltIn.filter((c) => c.code.toLowerCase().includes(codePattern));
    }
    if (typeof name === 'string' && name.trim()) {
      const namePattern = name.trim().toLowerCase();
      filteredBuiltIn = filteredBuiltIn.filter((c) => c.name.toLowerCase().includes(namePattern));
    }
    if (typeof enabled === 'string') {
      if (enabled === 'true') filteredBuiltIn = filteredBuiltIn.filter((c) => c.enabled === true);
      if (enabled === 'false') filteredBuiltIn = filteredBuiltIn.filter((c) => c.enabled === false);
    }

    // 全件結合後にページネーションで切り出し / 合并后通过分页截取
    const allItems = [...filteredBuiltIn, ...dbCarriers];
    const total = allItems.length;
    const skip = (pageNum - 1) * limitNum;
    const items = allItems.slice(skip, skip + limitNum);

    res.json({ items, total, page: pageNum, limit: limitNum });
  } catch (error: unknown) {
    sendError(res, 'Failed to fetch carriers', 500, 'INTERNAL_ERROR');
  }
};

export const getCarrier = async (req: Request, res: Response): Promise<void> => {
  try {
    const carrierId = req.params.id;

    // Check if it's a built-in carrier
    if (isBuiltInCarrierId(carrierId)) {
      const builtInCarrier = getBuiltInCarrier(carrierId);
      if (builtInCarrier) {
        res.json(builtInCarrier);
        return;
      }
      sendError(res, 'Carrier not found', 404, 'NOT_FOUND');
      return;
    }

    // Otherwise, fetch from database
    const item = await Carrier.findById(carrierId).lean();
    if (!item) {
      sendError(res, 'Carrier not found', 404, 'NOT_FOUND');
      return;
    }
    res.json(item);
  } catch (error: unknown) {
    sendError(res, 'Failed to fetch carrier', 500, 'INTERNAL_ERROR');
  }
};

export const createCarrier = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createCarrierSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR');
      return;
    }

    const created = await Carrier.create(parsed.data);
    res.status(201).json(created.toObject());
  } catch (error: unknown) {
    // MongoDB重複キーエラー判定 / MongoDB重复键错误判定
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: unknown }).code === 11000
    ) {
      const mongoErr = error as { keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> };
      const duplicateKey = mongoErr.keyPattern ? Object.keys(mongoErr.keyPattern)[0] : 'unknown';
      const duplicateValue = mongoErr.keyValue ? mongoErr.keyValue[duplicateKey] : 'unknown';
      sendError(res, `重複エラー: ${duplicateKey} フィールドの値「${duplicateValue}」が既に存在します`, 409, 'DUPLICATE_ERROR');
      return;
    }
    sendError(res, 'Failed to create carrier', 500, 'INTERNAL_ERROR');
  }
};

export const updateCarrier = async (req: Request, res: Response): Promise<void> => {
  try {
    const carrierId = req.params.id;

    // Prevent updating built-in carriers
    if (isBuiltInCarrierId(carrierId)) {
      sendError(res, '内蔵配送業者は編集できません', 403, 'FORBIDDEN');
      return;
    }

    const existing = await Carrier.findById(carrierId).lean();
    if (!existing) {
      sendError(res, 'Carrier not found', 404, 'NOT_FOUND');
      return;
    }

    const parsed = updateCarrierSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR');
      return;
    }

    const updated = await Carrier.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      sendError(res, 'Carrier not found', 404, 'NOT_FOUND');
      return;
    }

    res.json(updated);
  } catch (error: unknown) {
    sendError(res, 'Failed to update carrier', 500, 'INTERNAL_ERROR');
  }
};

export const deleteCarrier = async (req: Request, res: Response): Promise<void> => {
  try {
    const carrierId = req.params.id;

    // Prevent deleting built-in carriers
    if (isBuiltInCarrierId(carrierId)) {
      sendError(res, '内蔵配送業者は削除できません', 403, 'FORBIDDEN');
      return;
    }

    const deleted = await Carrier.findByIdAndDelete(carrierId).lean();
    if (!deleted) {
      sendError(res, 'Carrier not found', 404, 'NOT_FOUND');
      return;
    }
    res.json({ message: 'Deleted', id: deleted._id });
  } catch (error: unknown) {
    sendError(res, 'Failed to delete carrier', 500, 'INTERNAL_ERROR');
  }
};



