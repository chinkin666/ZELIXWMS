import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { SetProduct } from '@/models/setProduct';
import { SetOrder } from '@/models/setOrder';
import type { SetOrderType } from '@/models/setOrder';

// ─── SetProduct CRUD ───

export const listSetProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, isActive } = req.query;
    const filter: Record<string, unknown> = {};

    if (typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { sku: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ];
    }
    if (typeof isActive === 'string') {
      filter.isActive = isActive === 'true';
    }

    const items = await SetProduct.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch set products', error: error.message });
  }
};

export const getSetProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await SetProduct.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: 'Set product not found' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch set product', error: error.message });
  }
};

export const createSetProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sku, name, components, memo } = req.body;

    if (!sku?.trim() || !name?.trim()) {
      res.status(400).json({ message: '品番と名称は必須です' });
      return;
    }

    if (!Array.isArray(components) || components.length === 0) {
      res.status(400).json({ message: '構成品は1つ以上必要です' });
      return;
    }

    // Check sku uniqueness
    const existing = await SetProduct.findOne({ sku: sku.trim() }).lean();
    if (existing) {
      res.status(409).json({ message: `品番「${sku.trim()}」は既に存在します` });
      return;
    }

    const created = await SetProduct.create({
      sku: sku.trim(),
      name: name.trim(),
      components: components.map((c: any) => ({
        productId: c.productId,
        sku: c.sku?.trim() || '',
        name: c.name?.trim() || '',
        quantity: Number(c.quantity) || 1,
      })),
      memo: memo?.trim() || undefined,
    });

    res.status(201).json(created.toObject());
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ message: '品番が重複しています' });
      return;
    }
    res.status(500).json({ message: 'Failed to create set product', error: error.message });
  }
};

export const updateSetProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await SetProduct.findById(req.params.id);
    if (!item) {
      res.status(404).json({ message: 'Set product not found' });
      return;
    }

    const { sku, name, components, isActive, memo } = req.body;

    if (sku !== undefined) {
      const trimmed = sku.trim();
      if (!trimmed) {
        res.status(400).json({ message: '品番は必須です' });
        return;
      }
      if (trimmed !== item.sku) {
        const dup = await SetProduct.findOne({ sku: trimmed, _id: { $ne: item._id } }).lean();
        if (dup) {
          res.status(409).json({ message: `品番「${trimmed}」は既に存在します` });
          return;
        }
      }
      item.sku = trimmed;
    }

    if (name !== undefined) item.name = name.trim();
    if (memo !== undefined) item.memo = memo?.trim() || undefined;
    if (isActive !== undefined) item.isActive = isActive;

    if (Array.isArray(components)) {
      if (components.length === 0) {
        res.status(400).json({ message: '構成品は1つ以上必要です' });
        return;
      }
      item.components = components.map((c: any) => ({
        productId: c.productId,
        sku: c.sku?.trim() || '',
        name: c.name?.trim() || '',
        quantity: Number(c.quantity) || 1,
      })) as any;
    }

    await item.save();
    res.json(item.toObject());
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update set product', error: error.message });
  }
};

export const deleteSetProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await SetProduct.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      res.status(404).json({ message: 'Set product not found' });
      return;
    }
    res.json({ message: 'Deleted', id: deleted._id });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete set product', error: error.message });
  }
};

// ─── SetOrder (Assembly / Disassembly) ───

async function generateOrderNumber(type: SetOrderType): Promise<string> {
  const prefix = type === 'assembly' ? 'SET' : 'DIS';
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const pattern = `${prefix}-${dateStr}-`;

  const lastOrder = await SetOrder.findOne({ orderNumber: { $regex: `^${pattern}` } })
    .sort({ orderNumber: -1 })
    .lean();

  let seq = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNumber.split('-').pop() || '0', 10);
    seq = lastSeq + 1;
  }

  return `${pattern}${String(seq).padStart(3, '0')}`;
}

export const createSetOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { setProductId, type, quantity, stockCategory, desiredDate, lotNumber, expiryDate, memo } = req.body;

    if (!setProductId || !type || !quantity) {
      res.status(400).json({ message: 'setProductId, type, quantity は必須です' });
      return;
    }

    if (!['assembly', 'disassembly'].includes(type)) {
      res.status(400).json({ message: 'type は assembly または disassembly を指定してください' });
      return;
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      res.status(400).json({ message: '数量は1以上の整数を指定してください' });
      return;
    }

    const setProduct = await SetProduct.findById(setProductId).lean();
    if (!setProduct) {
      res.status(404).json({ message: 'セット組が見つかりません' });
      return;
    }

    const orderNumber = await generateOrderNumber(type);

    const components = setProduct.components.map((c) => ({
      productId: c.productId,
      sku: c.sku,
      name: c.name,
      quantityPerSet: c.quantity,
      totalQuantity: c.quantity * qty,
    }));

    const order = await SetOrder.create({
      orderNumber,
      type,
      setProductId: setProduct._id,
      setSku: setProduct.sku,
      setName: setProduct.name,
      quantity: qty,
      completedQuantity: 0,
      stockCategory: stockCategory?.trim() || undefined,
      desiredDate: desiredDate || undefined,
      lotNumber: lotNumber?.trim() || undefined,
      expiryDate: expiryDate || undefined,
      status: 'pending',
      components,
      memo: memo?.trim() || undefined,
    });

    res.status(201).json(order.toObject());
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create set order', error: error.message });
  }
};

export const listSetOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, status, search, setSku, dateFrom, dateTo, page, limit } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof type === 'string' && type) filter.type = type;
    if (typeof status === 'string' && status) filter.status = status;
    if (typeof setSku === 'string' && setSku.trim()) {
      filter.setSku = { $regex: setSku.trim(), $options: 'i' };
    }
    if (typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { orderNumber: { $regex: q, $options: 'i' } },
        { setSku: { $regex: q, $options: 'i' } },
        { setName: { $regex: q, $options: 'i' } },
      ];
    }

    // Date range filter on completedAt or createdAt
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (typeof dateFrom === 'string') dateFilter.$gte = new Date(dateFrom);
      if (typeof dateTo === 'string') dateFilter.$lte = new Date(dateTo);
      filter.createdAt = dateFilter;
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      SetOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      SetOrder.countDocuments(filter),
    ]);

    res.json({ items, total, page: pageNum, limit: limitNum });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch set orders', error: error.message });
  }
};

export const getSetOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await SetOrder.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: 'Set order not found' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch set order', error: error.message });
  }
};

export const completeSetOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await SetOrder.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: 'Set order not found' });
      return;
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      res.status(400).json({ message: `この指示は既に${order.status === 'completed' ? '完了' : 'キャンセル'}されています` });
      return;
    }

    const { completedQuantity } = req.body;
    const qty = Number(completedQuantity);
    if (!Number.isInteger(qty) || qty < 1) {
      res.status(400).json({ message: '完成数は1以上の整数を指定してください' });
      return;
    }

    order.completedQuantity = qty;
    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();

    res.json(order.toObject());
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to complete set order', error: error.message });
  }
};

export const cancelSetOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await SetOrder.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: 'Set order not found' });
      return;
    }

    if (order.status === 'completed') {
      res.status(400).json({ message: '完了済みの指示はキャンセルできません' });
      return;
    }

    order.status = 'cancelled';
    await order.save();

    res.json(order.toObject());
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to cancel set order', error: error.message });
  }
};
