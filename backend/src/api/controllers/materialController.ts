import type { Request, Response } from 'express';
import { Material } from '@/models/material';

/** テナントID取得 / 获取租户ID */
function getTenantId(_req: Request): string {
  return 'default';
}

// ============================================
// 耗材 CRUD / 耗材 CRUD
// ============================================

/**
 * 耗材一覧取得（カテゴリ・検索・ページネーション対応）
 * 获取耗材列表（支持类别、搜索、分页）
 * GET /api/materials
 */
export const listMaterials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search, isActive, page, limit } = req.query;
    const tenantId = getTenantId(req);

    const filter: Record<string, unknown> = { tenantId };
    // カテゴリフィルター / 类别过滤
    if (typeof category === 'string' && category.trim()) {
      filter.category = category.trim();
    }
    // 有効/無効フィルター / 启用/禁用过滤
    if (typeof isActive === 'string') {
      filter.isActive = isActive === 'true';
    }
    // 検索フィルター（SKU・名前）/ 搜索过滤（SKU・名称）
    if (typeof search === 'string' && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [{ sku: searchRegex }, { name: searchRegex }];
    }

    // ページネーション / 分页
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Material.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Material.countDocuments(filter),
    ]);

    res.json({ data: items, total, page: pageNum, limit: limitNum });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '耗材の取得に失敗しました / 获取耗材失败', error: message });
  }
};

/**
 * 耗材詳細取得
 * 获取耗材详情
 * GET /api/materials/:id
 */
export const getMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await Material.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: '耗材が見つかりません / 未找到耗材' });
      return;
    }
    res.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '耗材の取得に失敗しました / 获取耗材失败', error: message });
  }
};

/**
 * 耗材作成（SKUユニーク検証付き）
 * 创建耗材（带SKU唯一性验证）
 * POST /api/materials
 */
export const createMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { sku, name, category, unitCost, inventoryEnabled,
            currentStock, safetyStock, widthMm, depthMm, heightMm,
            supplierCode, caseQuantity, leadTime, isActive, memo } = req.body;

    // バリデーション / 验证
    if (!sku || typeof sku !== 'string' || !sku.trim()) {
      res.status(400).json({ message: 'SKUは必須です / SKU为必填项' });
      return;
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: '耗材名は必須です / 耗材名为必填项' });
      return;
    }
    const validCategories = ['box', 'cushioning', 'tape', 'label', 'bag', 'other'];
    if (!category || !validCategories.includes(category)) {
      res.status(400).json({ message: 'カテゴリは必須です（box/cushioning/tape/label/bag/other）/ 类别为必填项' });
      return;
    }
    if (unitCost === undefined || unitCost === null || typeof unitCost !== 'number' || unitCost < 0) {
      res.status(400).json({ message: '単価は0以上の数値です / 单价必须为0以上的数值' });
      return;
    }

    // SKUユニーク検証 / SKU唯一性验证
    const existing = await Material.findOne({ tenantId, sku: sku.trim() }).lean();
    if (existing) {
      res.status(409).json({
        message: `SKU「${sku.trim()}」は既に存在します / SKU「${sku.trim()}」已存在`,
        duplicateField: 'sku',
      });
      return;
    }

    const created = await Material.create({
      tenantId,
      sku: sku.trim(),
      name: name.trim(),
      category,
      unitCost,
      inventoryEnabled: inventoryEnabled !== false ? Boolean(inventoryEnabled) : false,
      currentStock: typeof currentStock === 'number' ? currentStock : undefined,
      safetyStock: typeof safetyStock === 'number' ? safetyStock : undefined,
      widthMm: typeof widthMm === 'number' ? widthMm : undefined,
      depthMm: typeof depthMm === 'number' ? depthMm : undefined,
      heightMm: typeof heightMm === 'number' ? heightMm : undefined,
      supplierCode: typeof supplierCode === 'string' ? supplierCode.trim() : undefined,
      caseQuantity: typeof caseQuantity === 'number' ? caseQuantity : undefined,
      leadTime: typeof leadTime === 'number' ? leadTime : undefined,
      isActive: isActive !== false,
      memo: typeof memo === 'string' ? memo.trim() : undefined,
    });

    res.status(201).json(created.toObject());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if ((error as any)?.code === 11000) {
      res.status(409).json({ message: 'SKUが重複しています / SKU重复', error: message });
      return;
    }
    res.status(500).json({ message: '耗材の作成に失敗しました / 创建耗材失败', error: message });
  }
};

/**
 * 耗材更新
 * 更新耗材
 * PUT /api/materials/:id
 */
export const updateMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sku, name, category, unitCost, inventoryEnabled,
            currentStock, safetyStock, widthMm, depthMm, heightMm,
            supplierCode, caseQuantity, leadTime, isActive, memo } = req.body;

    const updateData: Record<string, unknown> = {};

    if (sku !== undefined) {
      if (typeof sku !== 'string' || !sku.trim()) {
        res.status(400).json({ message: 'SKUは必須です / SKU为必填项' });
        return;
      }
      updateData.sku = sku.trim();
    }
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ message: '耗材名は必須です / 耗材名为必填项' });
        return;
      }
      updateData.name = name.trim();
    }
    if (category !== undefined) {
      const validCategories = ['box', 'cushioning', 'tape', 'label', 'bag', 'other'];
      if (!validCategories.includes(category)) {
        res.status(400).json({ message: '無効なカテゴリです / 无效的类别' });
        return;
      }
      updateData.category = category;
    }
    if (unitCost !== undefined) {
      if (typeof unitCost !== 'number' || unitCost < 0) {
        res.status(400).json({ message: '単価は0以上の数値です / 单价必须为0以上的数值' });
        return;
      }
      updateData.unitCost = unitCost;
    }
    if (inventoryEnabled !== undefined) updateData.inventoryEnabled = Boolean(inventoryEnabled);
    if (currentStock !== undefined) updateData.currentStock = currentStock;
    if (safetyStock !== undefined) updateData.safetyStock = safetyStock;
    if (widthMm !== undefined) updateData.widthMm = widthMm;
    if (depthMm !== undefined) updateData.depthMm = depthMm;
    if (heightMm !== undefined) updateData.heightMm = heightMm;
    if (supplierCode !== undefined) updateData.supplierCode = typeof supplierCode === 'string' ? supplierCode.trim() : supplierCode;
    if (caseQuantity !== undefined) updateData.caseQuantity = caseQuantity;
    if (leadTime !== undefined) updateData.leadTime = leadTime;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (memo !== undefined) updateData.memo = typeof memo === 'string' ? memo.trim() : memo;

    // SKU変更時のユニーク検証 / SKU变更时的唯一性验证
    if (updateData.sku) {
      const existing = await Material.findById(req.params.id).lean();
      if (!existing) {
        res.status(404).json({ message: '耗材が見つかりません / 未找到耗材' });
        return;
      }
      if (updateData.sku !== existing.sku) {
        const duplicate = await Material.findOne({
          tenantId: existing.tenantId,
          sku: updateData.sku as string,
          _id: { $ne: existing._id },
        }).lean();
        if (duplicate) {
          res.status(409).json({
            message: `SKU「${updateData.sku}」は既に存在します / SKU「${updateData.sku}」已存在`,
            duplicateField: 'sku',
          });
          return;
        }
      }
    }

    const updated = await Material.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: '耗材が見つかりません / 未找到耗材' });
      return;
    }

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if ((error as any)?.code === 11000) {
      res.status(409).json({ message: 'SKUが重複しています / SKU重复', error: message });
      return;
    }
    res.status(500).json({ message: '耗材の更新に失敗しました / 更新耗材失败', error: message });
  }
};

/**
 * 耗材削除（論理削除: isActive=false）
 * 删除耗材（逻辑删除: isActive=false）
 * DELETE /api/materials/:id
 */
export const deleteMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await Material.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    ).lean();

    if (!deleted) {
      res.status(404).json({ message: '耗材が見つかりません / 未找到耗材' });
      return;
    }

    res.json({ message: '耗材を無効化しました / 已禁用耗材', id: deleted._id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '耗材の削除に失敗しました / 删除耗材失败', error: message });
  }
};

/**
 * 耗材在庫調整（手動増減）
 * 耗材库存调整（手动增减）
 * POST /api/materials/:id/adjust-stock
 *
 * Body: { adjustment: number, reason?: string }
 * adjustment > 0: 入庫 / 入库, < 0: 出庫 / 出库
 */
export const adjustMaterialStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { adjustment, reason } = req.body;

    if (typeof adjustment !== 'number' || !Number.isFinite(adjustment) || adjustment === 0) {
      res.status(400).json({ message: '調整数量は0以外の数値です / 调整数量必须为非零数值' });
      return;
    }

    const material = await Material.findById(req.params.id);
    if (!material) {
      res.status(404).json({ message: '耗材が見つかりません / 未找到耗材' });
      return;
    }

    if (!material.inventoryEnabled) {
      res.status(400).json({ message: 'この耗材は在庫管理が無効です / 该耗材未启用库存管理' });
      return;
    }

    const currentStock = material.currentStock ?? 0;
    const newStock = currentStock + adjustment;

    if (newStock < 0) {
      res.status(400).json({
        message: `在庫不足: 現在${currentStock}、調整${adjustment} / 库存不足: 当前${currentStock}、调整${adjustment}`,
      });
      return;
    }

    const updated = await Material.findByIdAndUpdate(
      req.params.id,
      { currentStock: newStock },
      { new: true },
    ).lean();

    res.json({
      ...updated,
      _adjustment: {
        previous: currentStock,
        adjustment,
        current: newStock,
        reason: typeof reason === 'string' ? reason.trim() : undefined,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '在庫調整に失敗しました / 库存调整失败', error: message });
  }
};
