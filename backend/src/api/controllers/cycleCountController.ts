import type { Request, Response } from 'express';
import { CycleCountPlan } from '@/models/cycleCountPlan';
import mongoose from 'mongoose';
import { getTenantId } from '@/api/helpers/tenantHelper';

function generateNumber(): string {
  const d = new Date();
  return `CC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

// 一覧 / 列表
export const listCycleCounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { status, period, page, limit } = req.query;
    const filter: Record<string, unknown> = { tenantId };
    if (status) filter.status = status;
    if (period) filter.period = period;

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit || '20'), 10) || 20));

    const [data, total] = await Promise.all([
      CycleCountPlan.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      CycleCountPlan.countDocuments(filter),
    ]);
    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 作成 / 创建
export const createCycleCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const plan = await CycleCountPlan.create({
      ...req.body,
      tenantId,
      planNumber: generateNumber(),
      status: 'draft',
      alertTriggered: false,
    });
    res.status(201).json(plan.toObject());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 詳細 / 详情
export const getCycleCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const plan = await CycleCountPlan.findById(req.params.id).lean();
    if (!plan) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 自動生成（月度20% SKU をランダム選択）/ 自动生成（月度随机选取20% SKU）
export const generateItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const plan = await CycleCountPlan.findById(req.params.id);
    if (!plan) { res.status(404).json({ message: 'Not found' }); return; }

    // StockQuant から在庫のある商品×ロケーションを取得 / 从 StockQuant 获取有库存的商品×库位
    const StockQuant = mongoose.connection.collection('stock_quants');
    const quants = await StockQuant.find({ quantity: { $gt: 0 } }).toArray();

    if (quants.length === 0) {
      res.json({ message: 'No stock to count', items: 0 });
      return;
    }

    // 20% をランダム選択 / 随机选取20%
    const targetCount = Math.max(1, Math.ceil(quants.length * 0.2));
    const shuffled = quants.sort(() => Math.random() - 0.5).slice(0, targetCount);

    const Location = mongoose.connection.collection('locations');
    const Product = mongoose.connection.collection('products');

    const items = [];
    for (const q of shuffled) {
      const loc = await Location.findOne({ _id: q.locationId });
      const prod = await Product.findOne({ _id: q.productId });
      items.push({
        productId: q.productId,
        sku: prod?.sku || 'unknown',
        locationId: q.locationId,
        locationCode: loc?.code || 'unknown',
        systemQuantity: q.quantity,
        status: 'pending',
      });
    }

    plan.items = items as any;
    plan.targetSkuCount = items.length;
    plan.totalSkuCount = quants.length;
    plan.coverageRate = items.length / quants.length;
    plan.status = 'in_progress';
    await plan.save();

    res.json({ items: items.length, totalSkuCount: quants.length, coverageRate: plan.coverageRate });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 盘点结果提交 / 棚卸結果提出
export const submitCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const plan = await CycleCountPlan.findById(req.params.id);
    if (!plan) { res.status(404).json({ message: 'Not found' }); return; }

    const { counts } = req.body; // [{ sku, locationCode, countedQuantity, countedBy }]
    if (!counts?.length) { res.status(400).json({ message: 'counts required' }); return; }

    for (const c of counts) {
      const item = plan.items.find(
        (i) => i.sku === c.sku && i.locationCode === c.locationCode,
      );
      if (item) {
        item.countedQuantity = c.countedQuantity;
        item.variance = c.countedQuantity - item.systemQuantity;
        item.varianceRate = item.systemQuantity > 0 ? Math.abs(item.variance) / item.systemQuantity : 0;
        item.countedBy = c.countedBy;
        item.countedAt = new Date();
        item.status = 'counted';
      }
    }

    plan.markModified('items');
    await plan.save();
    res.json(plan.toObject());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 完了 / 完成
export const completeCycleCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const plan = await CycleCountPlan.findById(req.params.id);
    if (!plan) { res.status(404).json({ message: 'Not found' }); return; }

    // 総差異率計算 / 总差异率计算
    const counted = plan.items.filter((i) => i.status === 'counted' || i.status === 'confirmed');
    const totalSystem = counted.reduce((s, i) => s + i.systemQuantity, 0);
    const totalVariance = counted.reduce((s, i) => s + Math.abs(i.variance || 0), 0);
    plan.totalVarianceRate = totalSystem > 0 ? totalVariance / totalSystem : 0;
    plan.alertTriggered = plan.totalVarianceRate > 0.005; // >0.5% 预警
    plan.status = 'completed';
    plan.completedAt = new Date();
    await plan.save();

    res.json(plan.toObject());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 盘点覆盖率统计 / 棚卸カバー率統計
export const coverageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const year = req.query.year || new Date().getFullYear();

    const plans = await CycleCountPlan.find({
      tenantId,
      period: { $regex: `^${year}` },
      status: 'completed',
    }).lean();

    // 統計已盘 SKU / 統計済み SKU
    const countedSkus = new Set<string>();
    for (const plan of plans) {
      for (const item of plan.items) {
        if (item.status === 'counted' || item.status === 'confirmed') {
          countedSkus.add(item.sku);
        }
      }
    }

    res.json({
      year,
      completedPlans: plans.length,
      countedSkuCount: countedSkus.size,
      averageVarianceRate: plans.length > 0
        ? plans.reduce((s, p) => s + (p.totalVarianceRate || 0), 0) / plans.length
        : 0,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
