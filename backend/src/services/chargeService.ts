import { ServiceRate } from '@/models/serviceRate';
import { WorkCharge } from '@/models/workCharge';
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
    // 料金マスタから単価を検索 / 从费率表查找单价
    // 1. clientId 指定の料金を優先 / 优先货主指定费率
    let rate = await ServiceRate.findOne({
      tenantId: input.tenantId,
      clientId: input.clientId,
      chargeType: input.chargeType,
      isActive: true,
    }).lean();

    // 2. なければデフォルト料金（clientId=null）/ 无则使用默认费率
    if (!rate) {
      rate = await ServiceRate.findOne({
        tenantId: input.tenantId,
        clientId: { $in: [null, undefined, ''] },
        chargeType: input.chargeType,
        isActive: true,
      }).lean();
    }

    // 料金設定なし → チャージしない / 无费率设置 → 不创建费用
    if (!rate) return;

    const amount = input.quantity * rate.unitPrice;

    await WorkCharge.create({
      tenantId: input.tenantId,
      clientId: input.clientId,
      clientName: input.clientName,
      chargeType: input.chargeType,
      chargeDate: new Date(),
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      referenceNumber: input.referenceNumber,
      quantity: input.quantity,
      unitPrice: rate.unitPrice,
      amount,
      description: input.description,
      isBilled: false,
    });
  } catch (err) {
    // 非ブロッキング：ログのみ / 非阻塞：仅记录日志
    logger.warn({ err, input }, 'Auto charge creation failed (non-blocking) / 自動チャージ作成失敗（非ブロッキング）');
  }
}
