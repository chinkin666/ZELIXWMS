import type { Request, Response } from 'express';
import { InventoryCategory } from '@/models/inventoryCategory';

const DEFAULT_CATEGORIES = [
  { code: 'normal', name: '通常', description: '通常在庫', isDefault: true, sortOrder: 0, colorLabel: '#67c23a' },
  { code: 'returned', name: '返品', description: '返品在庫', isDefault: true, sortOrder: 1, colorLabel: '#e6a23c' },
  { code: 'defective', name: '不良', description: '不良在庫', isDefault: true, sortOrder: 2, colorLabel: '#f56c6c' },
] as const;

export const listCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await InventoryCategory.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.json({ data: items, total: items.length });
  } catch (error: any) {
    res.status(500).json({ message: '在庫区分の取得に失敗しました', error: error.message });
  }
};

export const getCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await InventoryCategory.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: '在庫区分が見つかりません' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: '在庫区分の取得に失敗しました', error: error.message });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, description, isDefault, isActive, sortOrder, colorLabel } = req.body;

    if (!code || !name) {
      res.status(400).json({ message: 'コードと名称は必須です' });
      return;
    }

    const existing = await InventoryCategory.findOne({ code }).lean();
    if (existing) {
      res.status(409).json({
        message: `コード「${code}」は既に存在します`,
        duplicateField: 'code',
        duplicateValue: code,
      });
      return;
    }

    const created = await InventoryCategory.create({
      code,
      name,
      description,
      isDefault: isDefault ?? false,
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
      colorLabel,
    });

    res.status(201).json(created.toObject());
  } catch (error: any) {
    if (error.code === 11000) {
      const duplicateKey = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const duplicateValue = error.keyValue ? error.keyValue[duplicateKey] : 'unknown';
      res.status(409).json({
        message: `重複エラー: ${duplicateKey} フィールドの値「${duplicateValue}」が既に存在します`,
        duplicateField: duplicateKey,
        duplicateValue,
      });
      return;
    }
    res.status(500).json({ message: '在庫区分の作成に失敗しました', error: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await InventoryCategory.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: '在庫区分が見つかりません' });
      return;
    }

    // Prevent editing code of default categories
    if (existing.isDefault && req.body.code && req.body.code !== existing.code) {
      res.status(403).json({ message: 'デフォルト在庫区分のコードは変更できません' });
      return;
    }

    const updateData = { ...req.body };
    // Never allow changing isDefault via update
    delete updateData.isDefault;

    const updated = await InventoryCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: '在庫区分が見つかりません' });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ message: 'コードが重複しています' });
      return;
    }
    res.status(500).json({ message: '在庫区分の更新に失敗しました', error: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await InventoryCategory.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: '在庫区分が見つかりません' });
      return;
    }

    if (existing.isDefault) {
      res.status(403).json({ message: 'デフォルト在庫区分は削除できません' });
      return;
    }

    await InventoryCategory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted', id: existing._id });
  } catch (error: any) {
    res.status(500).json({ message: '在庫区分の削除に失敗しました', error: error.message });
  }
};

export const seedDefaults = async (_req: Request, res: Response): Promise<void> => {
  try {
    const results: Array<{ code: string; status: string }> = [];

    for (const category of DEFAULT_CATEGORIES) {
      const existing = await InventoryCategory.findOne({ code: category.code }).lean();
      if (existing) {
        results.push({ code: category.code, status: 'already_exists' });
      } else {
        await InventoryCategory.create(category);
        results.push({ code: category.code, status: 'created' });
      }
    }

    res.json({ message: 'デフォルト在庫区分のシード完了', results });
  } catch (error: any) {
    res.status(500).json({ message: 'シードに失敗しました', error: error.message });
  }
};
