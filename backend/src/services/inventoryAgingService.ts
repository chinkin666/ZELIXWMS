import { StockQuant } from '@/models/stockQuant';
import { Product } from '@/models/product';
import { Location } from '@/models/location';
import { createAutoCharge } from '@/services/chargeService';
import { logger } from '@/lib/logger';

/**
 * 在庫エイジング管理サービス / 库存老化管理服务
 *
 * 日本の3PL倉庫では、長期在庫に対して追加保管料を課金し、
 * 荷主に在庫回転の改善を促すのが一般的。
 * 日本3PL仓库中，对长期库存收取超期保管费，
 * 促使货主改善库存周转是常见做法。
 *
 * エイジング区分 / 老化分级:
 * - 正常: 0-30日
 * - 注意: 31-60日
 * - 警告: 61-90日
 * - 超過: 91日以上（追加保管料発生）
 */

export type AgingLevel = 'normal' | 'caution' | 'warning' | 'overdue';

export interface AgingItem {
  productId: string;
  sku: string;
  productName: string;
  locationId: string;
  locationName: string;
  quantity: number;
  lastMovedAt: Date;
  daysStored: number;
  agingLevel: AgingLevel;
  clientId?: string;
}

export interface AgingSummary {
  normal: { count: number; skuCount: number };
  caution: { count: number; skuCount: number };
  warning: { count: number; skuCount: number };
  overdue: { count: number; skuCount: number };
  total: { count: number; skuCount: number };
}

/**
 * エイジングレベルを判定 / 判定老化级别
 */
function getAgingLevel(daysStored: number): AgingLevel {
  if (daysStored <= 30) return 'normal';
  if (daysStored <= 60) return 'caution';
  if (daysStored <= 90) return 'warning';
  return 'overdue';
}

/**
 * 在庫エイジングレポートを生成 / 生成库存老化报告
 *
 * StockQuantの lastMovedAt を基準に、各在庫の滞留日数を計算。
 * 基于StockQuant的lastMovedAt，计算各库存的滞留天数。
 */
export async function getAgingReport(
  options?: {
    clientId?: string;
    warehouseId?: string;
    minDays?: number;
    limit?: number;
  },
): Promise<{
  items: AgingItem[];
  summary: AgingSummary;
}> {
  const filter: Record<string, unknown> = {
    quantity: { $gt: 0 },
  };
  if (options?.clientId) filter.clientId = options.clientId;

  const quants = await StockQuant.find(filter).lean();

  // 関連データを一括取得 / 批量获取关联数据
  const productIds = [...new Set(quants.map((q) => String(q.productId)))];
  const locationIds = [...new Set(quants.map((q) => String(q.locationId)))];

  const [products, locations] = await Promise.all([
    Product.find({ _id: { $in: productIds } }).select('_id sku name').lean(),
    Location.find({ _id: { $in: locationIds } }).select('_id name warehouseId').lean(),
  ]);

  const productMap = new Map(products.map((p) => [String(p._id), { sku: p.sku, name: p.name }]));
  const locationMap = new Map(locations.map((l) => [String(l._id), { name: l.name, warehouseId: l.warehouseId ? String(l.warehouseId) : undefined }]));

  const now = new Date();
  const items: AgingItem[] = [];

  for (const quant of quants) {
    const locInfo = locationMap.get(String(quant.locationId));

    // warehouseId フィルタ / warehouseId过滤
    if (options?.warehouseId && locInfo?.warehouseId !== options.warehouseId) {
      continue;
    }

    const lastMoved = quant.lastMovedAt || (quant as any).createdAt || now;
    const daysStored = Math.floor((now.getTime() - new Date(lastMoved).getTime()) / (1000 * 60 * 60 * 24));

    if (options?.minDays && daysStored < options.minDays) continue;

    const prodInfo = productMap.get(String(quant.productId));
    const agingLevel = getAgingLevel(daysStored);

    items.push({
      productId: String(quant.productId),
      sku: prodInfo?.sku || quant.productSku || '',
      productName: prodInfo?.name || '',
      locationId: String(quant.locationId),
      locationName: locInfo?.name || '',
      quantity: quant.quantity,
      lastMovedAt: new Date(lastMoved),
      daysStored,
      agingLevel,
      clientId: (quant as any).clientId ? String((quant as any).clientId) : undefined,
    });
  }

  // 滞留日数の降順でソート / 按滞留天数降序排序
  items.sort((a, b) => b.daysStored - a.daysStored);

  // サマリー集計 / 汇总统计
  const summary: AgingSummary = {
    normal: { count: 0, skuCount: 0 },
    caution: { count: 0, skuCount: 0 },
    warning: { count: 0, skuCount: 0 },
    overdue: { count: 0, skuCount: 0 },
    total: { count: 0, skuCount: 0 },
  };

  const skuSets: Record<AgingLevel, Set<string>> = {
    normal: new Set(),
    caution: new Set(),
    warning: new Set(),
    overdue: new Set(),
  };

  for (const item of items) {
    summary[item.agingLevel].count += item.quantity;
    skuSets[item.agingLevel].add(item.sku);
    summary.total.count += item.quantity;
  }

  summary.normal.skuCount = skuSets.normal.size;
  summary.caution.skuCount = skuSets.caution.size;
  summary.warning.skuCount = skuSets.warning.size;
  summary.overdue.skuCount = skuSets.overdue.size;
  summary.total.skuCount = new Set(items.map((i) => i.sku)).size;

  const limit = options?.limit || 500;
  return {
    items: items.slice(0, limit),
    summary,
  };
}

/**
 * 超期保管料を自動計算（日次バッチ）
 * 自动计算超期仓储费（日次批处理）
 *
 * 90日超過の在庫に対して、通常保管料の1.5倍の追加料金を課金。
 * 对超过90天的库存，收取通常仓储费1.5倍的追加费用。
 */
export async function chargeOverdueStorage(tenantId: string): Promise<{
  chargedItems: number;
  totalAmount: number;
}> {
  try {
    const { items } = await getAgingReport({ minDays: 91 });
    let chargedItems = 0;
    let totalAmount = 0;

    // 顧客別にグループ化 / 按客户分组
    const clientGroups = new Map<string, AgingItem[]>();
    for (const item of items) {
      const key = item.clientId || 'default';
      const group = clientGroups.get(key) || [];
      group.push(item);
      clientGroups.set(key, group);
    }

    for (const [clientId, groupItems] of clientGroups) {
      const totalQty = groupItems.reduce((sum, i) => sum + i.quantity, 0);

      await createAutoCharge({
        tenantId,
        clientId: clientId === 'default' ? undefined : clientId,
        chargeType: 'overdue_storage',
        referenceType: 'manual',
        quantity: totalQty,
        description: `長期保管料（90日超過 ${groupItems.length}SKU, ${totalQty}個）/ 超期仓储费（90天超 ${groupItems.length}SKU, ${totalQty}个）`,
      });

      chargedItems += groupItems.length;
    }

    logger.info(
      { tenantId, chargedItems, totalAmount },
      '超期保管料計算完了 / 超期仓储费计算完成',
    );

    return { chargedItems, totalAmount };
  } catch (err) {
    logger.error({ err, tenantId }, '超期保管料計算失敗 / 超期仓储费计算失败');
    return { chargedItems: 0, totalAmount: 0 };
  }
}
