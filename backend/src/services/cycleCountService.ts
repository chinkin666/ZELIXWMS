import mongoose from 'mongoose';
import { CycleCountPlan, ICycleCountPlan } from '@/models/cycleCountPlan';
import { StockQuant } from '@/models/stockQuant';
import { Product } from '@/models/product';
import { Location } from '@/models/location';
import { logger } from '@/lib/logger';

/**
 * 循環棚卸サービス / 循环盘点服务
 *
 * 月次20%のSKUをランダム抽選し、棚卸計画を自動生成する。
 * 每月随机抽选20%的SKU，自动生成盘点计划。
 *
 * 日本の3PL SOP / 日本3PL SOP:
 * - 毎月20%のSKU → 5ヶ月で100%カバー
 * - 差異率 > 0.5% の場合は即時アラート
 * - 年1回の全数棚卸は決算期に実施
 */

// ─── 計画番号生成 / 计划编号生成 ───

function generatePlanNumber(period: string): string {
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `CC-${period}-${rand}`;
}

// ─── 月次計画自動生成 / 月度计划自动生成 ───

/**
 * 指定月の循環棚卸計画を自動生成する
 * 自动生成指定月的循环盘点计划
 *
 * @param tenantId テナントID
 * @param period 対象月（YYYY-MM）
 * @param coverageRate 抽選率（デフォルト0.2 = 20%）
 */
export async function generateMonthlyCycleCount(
  tenantId: string,
  period: string,
  coverageRate: number = 0.2,
): Promise<ICycleCountPlan> {
  // 既存計画チェック / 检查已有计划
  const existing = await CycleCountPlan.findOne({
    tenantId,
    period,
    planType: 'monthly_cycle',
    status: { $ne: 'cancelled' },
  });
  if (existing) {
    throw new Error(`${period} の循環棚卸計画は既に存在します / ${period} 的循环盘点计划已存在`);
  }

  // 全SKUの在庫を取得 / 获取所有SKU的库存
  const allQuants = await StockQuant.find({
    quantity: { $gt: 0 },
  }).lean();

  if (allQuants.length === 0) {
    throw new Error('在庫がありません / 无库存');
  }

  // ユニークSKU一覧 / 唯一SKU列表
  const uniqueSkus = [...new Set(allQuants.map((q) => q.productSku))];
  const totalSkuCount = uniqueSkus.length;
  const targetSkuCount = Math.max(1, Math.ceil(totalSkuCount * coverageRate));

  // ランダム抽選 / 随机抽选
  const shuffled = [...uniqueSkus].sort(() => Math.random() - 0.5);
  const selectedSkus = new Set(shuffled.slice(0, targetSkuCount));

  // 選択されたSKUの在庫→棚卸項目に変換 / 将选中SKU的库存转为盘点项目
  const selectedQuants = allQuants.filter((q) => selectedSkus.has(q.productSku));

  // 関連データ一括取得 / 批量获取关联数据
  const productIds = [...new Set(selectedQuants.map((q) => String(q.productId)))];
  const locationIds = [...new Set(selectedQuants.map((q) => String(q.locationId)))];

  const [products, locations] = await Promise.all([
    Product.find({ _id: { $in: productIds } }).select('_id sku').lean(),
    Location.find({ _id: { $in: locationIds } }).select('_id code').lean(),
  ]);

  const locMap = new Map(locations.map((l) => [String(l._id), l.code]));

  const items = selectedQuants.map((q) => ({
    productId: q.productId,
    sku: q.productSku,
    locationId: q.locationId,
    locationCode: locMap.get(String(q.locationId)) || '',
    systemQuantity: q.quantity,
    status: 'pending' as const,
  }));

  const plan = await CycleCountPlan.create({
    tenantId,
    planNumber: generatePlanNumber(period),
    planType: 'monthly_cycle',
    period,
    targetSkuCount,
    totalSkuCount,
    coverageRate: targetSkuCount / totalSkuCount,
    items,
    status: 'draft',
    alertTriggered: false,
  });

  logger.info(
    { planNumber: plan.planNumber, targetSkuCount, totalSkuCount, itemCount: items.length },
    '循環棚卸計画生成完了 / 循环盘点计划生成完成',
  );

  return plan;
}

// ─── カウント結果記録 / 记录计数结果 ───

/**
 * 棚卸項目のカウント結果を記録する
 * 记录盘点项目的计数结果
 */
export async function recordCount(
  planId: string,
  itemIndex: number,
  countedQuantity: number,
  countedBy: string,
): Promise<ICycleCountPlan> {
  const plan = await CycleCountPlan.findById(planId);
  if (!plan) {
    throw new Error(`棚卸計画が見つかりません: ${planId} / 盘点计划不存在`);
  }
  if (plan.status !== 'in_progress') {
    throw new Error('進行中の計画のみカウント可能です / 只能对进行中的计划计数');
  }

  const item = plan.items[itemIndex];
  if (!item) {
    throw new Error(`項目インデックス ${itemIndex} が存在しません / 项目索引不存在`);
  }

  item.countedQuantity = countedQuantity;
  item.variance = countedQuantity - item.systemQuantity;
  item.varianceRate = item.systemQuantity > 0
    ? Math.abs(item.variance) / item.systemQuantity
    : (countedQuantity > 0 ? 1 : 0);
  item.countedBy = countedBy;
  item.countedAt = new Date();
  item.status = 'counted';

  await plan.save();
  return plan;
}

// ─── 差異率チェック / 差异率检查 ───

/**
 * 完了した棚卸計画の差異率をチェックし、0.5%超過でアラートを発行
 * 检查已完成盘点计划的差异率，超过0.5%发出警报
 */
export async function checkVarianceAlerts(
  planId: string,
): Promise<{
  totalVarianceRate: number;
  alertTriggered: boolean;
  highVarianceItems: Array<{ sku: string; locationCode: string; varianceRate: number }>;
}> {
  const plan = await CycleCountPlan.findById(planId);
  if (!plan) {
    throw new Error(`棚卸計画が見つかりません: ${planId} / 盘点计划不存在`);
  }

  const countedItems = plan.items.filter((i) => i.status === 'counted' || i.status === 'confirmed');

  if (countedItems.length === 0) {
    return { totalVarianceRate: 0, alertTriggered: false, highVarianceItems: [] };
  }

  // 全体差異率 / 整体差异率
  const totalSystem = countedItems.reduce((s, i) => s + i.systemQuantity, 0);
  const totalVariance = countedItems.reduce((s, i) => s + Math.abs(i.variance || 0), 0);
  const totalVarianceRate = totalSystem > 0 ? totalVariance / totalSystem : 0;

  // 0.5%超過の項目 / 超过0.5%的项目
  const highVarianceItems = countedItems
    .filter((i) => (i.varianceRate || 0) > 0.005)
    .map((i) => ({
      sku: i.sku,
      locationCode: i.locationCode,
      varianceRate: i.varianceRate || 0,
    }));

  const alertTriggered = totalVarianceRate > 0.005;

  // 計画を更新 / 更新计划
  plan.totalVarianceRate = totalVarianceRate;
  plan.alertTriggered = alertTriggered;
  await plan.save();

  if (alertTriggered) {
    logger.warn(
      { planNumber: plan.planNumber, totalVarianceRate, highVarianceCount: highVarianceItems.length },
      '棚卸差異率アラート / 盘点差异率警报',
    );
  }

  return { totalVarianceRate, alertTriggered, highVarianceItems };
}
