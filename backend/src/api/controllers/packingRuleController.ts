import type { Request, Response } from 'express';
import { PackingRule } from '@/models/packingRule';
import { Product } from '@/models/product';
import { Material } from '@/models/material';
import { getTenantId } from '@/api/helpers/tenantHelper';

// ============================================
// 梱包ルール CRUD / 梱包规则 CRUD
// ============================================

/**
 * 梱包ルール一覧取得（優先度順）
 * 获取梱包规则列表（按优先级排序）
 * GET /api/packing-rules
 */
export const listPackingRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.query;
    const filter: Record<string, unknown> = {};
    if (tenantId && typeof tenantId === 'string') {
      filter.tenantId = tenantId;
    }
    const rules = await PackingRule.find(filter).sort({ priority: 1 }).lean();
    res.json(rules);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '梱包ルールの取得に失敗しました / 获取梱包规则失败', error: message });
  }
};

/**
 * 梱包ルール作成
 * 创建梱包规则
 * POST /api/packing-rules
 */
export const createPackingRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { name, priority, isActive, conditions, materials, memo } = req.body;

    // バリデーション / 验证
    if (!tenantId || typeof tenantId !== 'string' || !tenantId) {
      res.status(400).json({ message: 'tenantIdは必須です / tenantId为必填项' });
      return;
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'ルール名は必須です / 规则名为必填项' });
      return;
    }
    if (!Array.isArray(materials) || materials.length === 0) {
      res.status(400).json({ message: '耗材は1つ以上必要です / 至少需要1个耗材' });
      return;
    }

    const rule = await PackingRule.create({
      tenantId: tenantId,
      name: name.trim(),
      priority: typeof priority === 'number' ? priority : 100,
      isActive: isActive !== false,
      conditions: conditions || {},
      materials,
      memo: memo?.trim() || undefined,
    });

    res.status(201).json(rule.toObject());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '梱包ルールの作成に失敗しました / 创建梱包规则失败', error: message });
  }
};

/**
 * 梱包ルール更新
 * 更新梱包规则
 * PUT /api/packing-rules/:id
 */
export const updatePackingRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, priority, isActive, conditions, materials, memo } = req.body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ message: 'ルール名は必須です / 规则名为必填项' });
        return;
      }
      updateData.name = name.trim();
    }
    if (priority !== undefined && typeof priority === 'number') updateData.priority = priority;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (conditions !== undefined) updateData.conditions = conditions;
    if (materials !== undefined) {
      if (!Array.isArray(materials) || materials.length === 0) {
        res.status(400).json({ message: '耗材は1つ以上必要です / 至少需要1个耗材' });
        return;
      }
      updateData.materials = materials;
    }
    if (memo !== undefined) updateData.memo = memo?.trim() || undefined;

    const updated = await PackingRule.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: '梱包ルールが見つかりません / 未找到梱包规则' });
      return;
    }

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '梱包ルールの更新に失敗しました / 更新梱包规则失败', error: message });
  }
};

/**
 * 梱包ルール削除
 * 删除梱包规则
 * DELETE /api/packing-rules/:id
 */
export const deletePackingRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await PackingRule.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      res.status(404).json({ message: '梱包ルールが見つかりません / 未找到梱包规则' });
      return;
    }
    res.json({ message: '梱包ルールを削除しました / 已删除梱包规则', id: deleted._id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '梱包ルールの削除に失敗しました / 删除梱包规则失败', error: message });
  }
};

/**
 * 梱包ルール評価 - 注文データから一致する耗材を返す
 * 梱包规则评估 - 根据订单数据返回匹配的耗材
 * POST /api/packing-rules/evaluate
 *
 * Body: { tenantId, products: [{sku, quantity}], coolType?, invoiceType? }
 * Response: { materials: [...], rule: matchedRuleName } | { materials: [], rule: null }
 */
export const evaluatePackingRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { products, coolType, invoiceType } = req.body;

    if (!tenantId || typeof tenantId !== 'string') {
      res.status(400).json({ message: 'tenantIdは必須です / tenantId为必填项' });
      return;
    }
    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ message: '商品情報は必須です / 商品信息为必填项' });
      return;
    }

    // 商品マスターから重量・寸法を取得 / 从商品主数据获取重量和尺寸
    const skus = products.map((p: { sku: string }) => p.sku).filter(Boolean);
    const productMasters = await Product.find({ sku: { $in: skus } }).lean();
    const productMap = new Map(productMasters.map((p) => [p.sku, p]));

    // 合計重量・合計才数・合計商品数を計算 / 计算总重量、总才数、总商品数
    let totalWeight = 0;
    let totalDimension = 0;
    let totalProductCount = 0;

    for (const item of products as Array<{ sku: string; quantity: number }>) {
      const master = productMap.get(item.sku);
      const qty = item.quantity || 1;
      totalProductCount += qty;

      if (master) {
        // 重量計算 / 重量计算
        if (master.weight) {
          totalWeight += master.weight * qty;
        }
        // 才数計算（幅×奥行×高さ / 1000）/ 才数计算
        if (master.width && master.depth && master.height) {
          const dimension = (master.width * master.depth * master.height) / 1000;
          totalDimension += dimension * qty;
        }
      }
    }

    // 有効なルールを優先度順に取得 / 按优先级获取有效规则
    const rules = await PackingRule.find({
      tenantId,
      isActive: true,
    }).sort({ priority: 1 }).lean();

    // 条件マッチング / 条件匹配
    for (const rule of rules) {
      const cond = rule.conditions;
      let matched = true;

      if (cond.maxWeight !== undefined && cond.maxWeight !== null) {
        if (totalWeight > cond.maxWeight) matched = false;
      }
      if (cond.maxDimension !== undefined && cond.maxDimension !== null) {
        if (totalDimension > cond.maxDimension) matched = false;
      }
      if (cond.coolType !== undefined && cond.coolType !== null) {
        if (coolType !== cond.coolType) matched = false;
      }
      if (cond.invoiceType !== undefined && cond.invoiceType !== null) {
        if (invoiceType !== cond.invoiceType) matched = false;
      }
      if (cond.maxProductCount !== undefined && cond.maxProductCount !== null) {
        if (totalProductCount > cond.maxProductCount) matched = false;
      }

      if (matched) {
        // マッチしたルールの耗材を返す / 返回匹配规则的耗材
        // Materialマスターからコスト情報を取得 / 从耗材主数据获取成本信息
        const materialSkus = rule.materials.map((m) => m.materialSku);
        const materialMasters = await Material.find({
          tenantId,
          sku: { $in: materialSkus },
          isActive: true,
        }).lean();
        const materialMap = new Map(materialMasters.map((m) => [m.sku, m]));

        const resultMaterials = rule.materials.map((m) => {
          const master = materialMap.get(m.materialSku);
          return {
            materialSku: m.materialSku,
            materialName: m.materialName ?? master?.name,
            quantity: m.quantity,
            unitCost: m.unitCost ?? master?.unitCost,
          };
        });

        res.json({
          materials: resultMaterials,
          rule: rule.name,
          ruleId: rule._id,
          // デバッグ用集計値 / 调试用汇总值
          _calculated: {
            totalWeight,
            totalDimension,
            totalProductCount,
          },
        });
        return;
      }
    }

    // マッチなし / 无匹配
    res.json({
      materials: [],
      rule: null,
      ruleId: null,
      _calculated: {
        totalWeight,
        totalDimension,
        totalProductCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '梱包ルールの評価に失敗しました / 评估梱包规则失败', error: message });
  }
};
