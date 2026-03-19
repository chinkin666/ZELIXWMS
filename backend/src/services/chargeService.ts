import { ServiceRate } from '@/models/serviceRate';
import { WorkCharge } from '@/models/workCharge';
import { BillingRecord } from '@/models/billingRecord';
import { StockQuant } from '@/models/stockQuant';
import { Client } from '@/models/client';
import { logger } from '@/lib/logger';

// ============================================
// 作業チャージ自動生成サービス / 作业费用自动生成服务
// ============================================

interface ChargeInput {
  tenantId: string;
  clientId?: string;
  clientName?: string;
  chargeType: string;  // ChargeType
  referenceType: string;
  referenceId?: string;
  referenceNumber?: string;
  quantity: number;
  description: string;
}

/**
 * 料金マスタを検索（顧客専用→デフォルトのフォールバック）
 * 从费率表查找（客户专属→默认回退）
 */
async function findRate(tenantId: string, chargeType: string, clientId?: string) {
  // 1. clientId 指定の料金を優先 / 优先货主指定费率
  let rate = await ServiceRate.findOne({
    tenantId,
    clientId,
    chargeType,
    isActive: true,
  }).lean();

  // 2. なければデフォルト料金（clientId=null）/ 无则使用默认费率
  if (!rate) {
    rate = await ServiceRate.findOne({
      tenantId,
      clientId: { $in: [null, undefined, ''] },
      chargeType,
      isActive: true,
    }).lean();
  }

  return rate;
}

/**
 * 作業チャージを自動生成 / 自动生成作业收费
 * fire-and-forget で呼び出す想定 / 以fire-and-forget方式调用
 *
 * 料金マスタ検索優先順位 / 费率表搜索优先级:
 * 1. clientId 指定の料金 / 指定货主的费率
 * 2. デフォルト料金（clientId=null）/ 默认费率（clientId=null）
 * 3. 該当なし → チャージしない / 无匹配 → 不收费
 */
export async function createAutoCharge(input: ChargeInput): Promise<void> {
  try {
    const rate = await findRate(input.tenantId, input.chargeType, input.clientId);

    // 料金設定なし → チャージしない / 无费率设置 → 不创建费用
    if (!rate) return;

    const amount = input.quantity * rate.unitPrice;

    // 請求期間の自動設定 / 自动设置计费期间
    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await WorkCharge.create({
      tenantId: input.tenantId,
      clientId: input.clientId,
      clientName: input.clientName,
      chargeType: input.chargeType,
      chargeDate: now,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      referenceNumber: input.referenceNumber,
      quantity: input.quantity,
      unitPrice: rate.unitPrice,
      amount,
      description: input.description,
      billingPeriod,
      isBilled: false,
    });
  } catch (err) {
    // 非ブロッキング：ログのみ / 非阻塞：仅记录日志
    logger.warn({ err, input }, 'Auto charge creation failed (non-blocking) / 自動チャージ作成失敗（非ブロッキング）');
  }
}

// ============================================
// 保管料自動計算 / 仓储费自动计算
// ============================================

/**
 * 指定テナントの全顧客の保管料を計算・記録する
 * 为指定租户的所有客户计算并记录仓储费
 *
 * 計算ロジック / 计算逻辑:
 * - StockQuant から各顧客のロケーション占有数を集計
 * - ServiceRate の 'storage' 料金（per_location_day）を適用
 * - 1日1回の実行を想定（BullMQスケジュール等で呼び出し）
 */
export async function calculateDailyStorageFees(tenantId: string): Promise<{
  clientsCharged: number;
  totalAmount: number;
}> {
  try {
    // 顧客別の占有ロケーション数を集計 / 按客户汇总占用库位数
    const occupancy = await StockQuant.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      {
        $group: {
          _id: { clientId: '$clientId' },
          locationCount: { $addToSet: '$locationId' },
        },
      },
      {
        $project: {
          clientId: '$_id.clientId',
          locationCount: { $size: '$locationCount' },
          _id: 0,
        },
      },
    ]);

    let clientsCharged = 0;
    let totalAmount = 0;
    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 一括で保管料金マスタを取得（N+1防止）/ 批量获取仓储费率（防止N+1）
    const allStorageRates = await ServiceRate.find({
      tenantId,
      chargeType: 'storage',
      isActive: true,
    }).lean();
    const clientRateMap = new Map<string, any>();
    let defaultStorageRate: any = null;
    for (const r of allStorageRates) {
      if (r.clientId) {
        clientRateMap.set(String(r.clientId), r);
      } else {
        defaultStorageRate = r;
      }
    }

    for (const item of occupancy) {
      const clientId = item.clientId ? String(item.clientId) : undefined;
      const rate = (clientId ? clientRateMap.get(clientId) : null) || defaultStorageRate;
      if (!rate) continue;

      const amount = item.locationCount * rate.unitPrice;

      await WorkCharge.create({
        tenantId,
        clientId,
        chargeType: 'storage',
        chargeDate: now,
        referenceType: 'manual',
        quantity: item.locationCount,
        unitPrice: rate.unitPrice,
        amount,
        description: `保管料（${item.locationCount}ロケーション×${rate.unitPrice}円/日）/ 仓储费（${item.locationCount}库位×${rate.unitPrice}元/天）`,
        billingPeriod,
        isBilled: false,
      });

      clientsCharged++;
      totalAmount += amount;
    }

    logger.info({ tenantId, clientsCharged, totalAmount }, 'Daily storage fees calculated / 日次保管料計算完了');
    return { clientsCharged, totalAmount };
  } catch (err) {
    logger.error({ err, tenantId }, 'Failed to calculate storage fees / 保管料計算失敗');
    return { clientsCharged: 0, totalAmount: 0 };
  }
}

// ============================================
// 月次請求書生成 / 月度账单生成
// ============================================

/**
 * 指定期間の未請求チャージを集計し、BillingRecordを生成する
 * 汇总指定期间的未计费费用，生成BillingRecord
 *
 * @param tenantId テナントID / 租户ID
 * @param period 対象期間（YYYY-MM）/ 目标期间（YYYY-MM）
 */
export async function generateMonthlyBilling(
  tenantId: string,
  period: string,
): Promise<{ recordCount: number; totalAmount: number }> {
  try {
    // 未請求のWorkChargeを顧客別に集計 / 按客户汇总未计费的WorkCharge
    const summary = await WorkCharge.aggregate([
      {
        $match: {
          tenantId,
          billingPeriod: period,
          isBilled: false,
        },
      },
      {
        $group: {
          _id: '$clientId',
          orderCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          handlingFee: {
            $sum: {
              $cond: [
                { $in: ['$chargeType', ['inbound_handling', 'outbound_handling', 'picking', 'packing', 'return_handling', 'labeling', 'inspection']] },
                '$amount',
                0,
              ],
            },
          },
          storageFee: {
            $sum: {
              $cond: [
                { $in: ['$chargeType', ['storage', 'overdue_storage']] },
                '$amount',
                0,
              ],
            },
          },
          shippingCost: {
            $sum: {
              $cond: [
                { $in: ['$chargeType', ['shipping', 'fba_delivery']] },
                '$amount',
                0,
              ],
            },
          },
          otherFees: {
            $sum: {
              $cond: [
                { $nin: ['$chargeType', ['inbound_handling', 'outbound_handling', 'picking', 'packing', 'return_handling', 'labeling', 'inspection', 'storage', 'overdue_storage', 'shipping', 'fba_delivery']] },
                '$amount',
                0,
              ],
            },
          },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    let recordCount = 0;
    let grandTotal = 0;

    // 一括で顧客名を取得（N+1防止）/ 批量获取客户名（防止N+1）
    const clientIds = summary.map(s => s._id).filter(Boolean);
    const clientMap = new Map<string, string>();
    if (clientIds.length > 0) {
      const clients = await Client.find({ _id: { $in: clientIds } }).lean();
      for (const c of clients) {
        clientMap.set(String(c._id), c.name);
      }
    }

    for (const item of summary) {
      const clientId = item._id || undefined;

      // 顧客名取得（事前取得済みマップから）/ 获取客户名（从预加载map）
      const clientName = clientId ? clientMap.get(String(clientId)) : undefined;

      // BillingRecord を upsert / 更新或创建BillingRecord
      await BillingRecord.findOneAndUpdate(
        { tenantId, period, clientId: clientId || null },
        {
          $set: {
            clientName,
            orderCount: item.orderCount,
            totalQuantity: item.totalQuantity,
            totalShippingCost: item.shippingCost,
            handlingFee: item.handlingFee,
            storageFee: item.storageFee,
            otherFees: item.otherFees,
            totalAmount: item.totalAmount,
            status: 'draft',
          },
        },
        { upsert: true, new: true },
      );

      // 対象 WorkCharge を請求済みに更新 / 标记对应WorkCharge为已计费
      await WorkCharge.updateMany(
        {
          tenantId,
          billingPeriod: period,
          clientId: clientId || { $in: [null, undefined, ''] },
          isBilled: false,
        },
        { $set: { isBilled: true } },
      );

      recordCount++;
      grandTotal += item.totalAmount;
    }

    logger.info({ tenantId, period, recordCount, grandTotal }, 'Monthly billing generated / 月次請求書生成完了');
    return { recordCount, totalAmount: grandTotal };
  } catch (err) {
    logger.error({ err, tenantId, period }, 'Failed to generate monthly billing / 月次請求書生成失敗');
    return { recordCount: 0, totalAmount: 0 };
  }
}

/**
 * 請求サマリー取得 / 获取计费汇总
 *
 * @param tenantId テナントID / 租户ID
 * @param period 対象期間（YYYY-MM）/ 目标期间（YYYY-MM）
 */
export async function getBillingSummary(
  tenantId: string,
  period: string,
): Promise<{
  records: any[];
  grandTotal: number;
}> {
  const records = await BillingRecord.find({ tenantId, period })
    .sort({ totalAmount: -1 })
    .lean();

  const grandTotal = records.reduce((sum, r) => sum + r.totalAmount, 0);

  return { records, grandTotal };
}
