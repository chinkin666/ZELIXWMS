import { InboundOrder } from '@/models/inboundOrder';
import type { IInboundOrder, IServiceOption, IVarianceReport } from '@/models/inboundOrder';
import { ServiceRate } from '@/models/serviceRate';
import { WorkCharge } from '@/models/workCharge';
import { Product } from '@/models/product';
import { Client } from '@/models/client';
import type { HydratedDocument } from 'mongoose';
import { logger } from '@/lib/logger';

/**
 * 通過型入庫予約サービス / 通过型入库预定服务
 *
 * 通過型フロー（FBA/RSL/B2B）の全ライフサイクルを管理する。
 * 管理通过型流程（FBA/RSL/B2B）的全生命周期。
 *
 * ステートマシン / 状态机:
 * draft → confirmed → arrived → processing → [awaiting_label] → ready_to_ship → shipped → done
 */

// --- 自動採番 / 自动编号 ---
function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `IN-${y}${m}${d}-${rand}`;
}

/**
 * 入庫予約作成（客户门户调用）/ 入庫予約作成（顧客ポータルから呼び出し）
 */
export async function createPassthroughOrder(
  data: Partial<IInboundOrder> & { tenantId: string },
): Promise<HydratedDocument<IInboundOrder>> {
  const orderNumber = generateOrderNumber();

  // 作業オプションの費用計算 / 作业选项费用计算
  const serviceOptions = data.serviceOptions || [];
  for (const opt of serviceOptions) {
    // ServiceRate から単価を取得（顧客専用 → デフォルト）
    // 从 ServiceRate 获取单价（客户专属 → 默认）
    const rate = await ServiceRate.findOne({
      tenantId: data.tenantId,
      clientId: data.clientId?.toString() || '',
      chargeType: opt.optionCode,
      isActive: true,
    }).lean() || await ServiceRate.findOne({
      tenantId: data.tenantId,
      $or: [{ clientId: '' }, { clientId: null }, { clientId: { $exists: false } }],
      chargeType: opt.optionCode,
      isActive: true,
    }).lean();

    if (rate) {
      opt.unitPrice = rate.unitPrice;
      opt.estimatedCost = opt.quantity * rate.unitPrice;
    }
  }

  // SKU → productId 自動マッチング / SKU → productId 自动匹配
  const lines = data.lines || [];
  for (const line of lines) {
    if (!line.productId || line.productId.toString() === '000000000000000000000000') {
      // SKU / FNSKU / JAN で商品を検索 / 按 SKU/FNSKU/JAN 搜索商品
      const product = await Product.findOne({
        $or: [
          { sku: line.productSku },
          { fnsku: line.productSku },
          { janCode: line.productSku },
        ],
      }).lean();
      if (product) {
        line.productId = product._id;
        line.productName = line.productName || product.name;
      }
    }
  }

  // 顧客名反査 / 客户名反查
  let clientName = data.clientName;
  if (!clientName && data.clientId) {
    const c = await Client.findById(data.clientId).lean();
    clientName = c?.name;
  }

  const order = await InboundOrder.create({
    tenantId: data.tenantId,
    orderNumber,
    status: 'confirmed',
    flowType: 'passthrough',
    destinationType: data.destinationType,
    clientId: data.clientId,
    clientName,
    subClientId: data.subClientId,
    shopId: data.shopId,
    lines,
    expectedDate: data.expectedDate,
    totalBoxCount: data.totalBoxCount,
    memo: data.memo,
    createdBy: data.createdBy,
    serviceOptions,
    fbaInfo: data.fbaInfo,
    rslInfo: data.rslInfo,
    b2bInfo: data.b2bInfo,
    shippingMethod: data.shippingMethod,
    customFields: data.customFields,
  });

  return order;
}

/**
 * 受付（仓库扫码接收）/ 受付（倉庫スキャン受領）
 *
 * confirmed → arrived
 */
export async function arriveOrder(
  orderId: string,
  input: {
    actualBoxCount: number;
    receivedBy: string;
    varianceDetails?: IVarianceReport['details'];
  },
): Promise<HydratedDocument<IInboundOrder>> {
  const order = await InboundOrder.findById(orderId);
  if (!order) throw new Error('入庫予約が見つかりません / 入库预定不存在');
  if (order.status !== 'confirmed') {
    throw new Error(`ステータスが「confirmed」ではありません（現在: ${order.status}）/ 状态不是 confirmed`);
  }

  order.status = 'arrived';
  order.actualArrivalDate = new Date();
  order.actualBoxCount = input.actualBoxCount;
  order.receivedBy = input.receivedBy;
  order.arrivedAt = new Date();

  // 差异明细 / 差異明細
  if (input.varianceDetails && input.varianceDetails.length > 0) {
    const hasVariance = input.varianceDetails.some((d) => d.variance !== 0);
    order.varianceReport = {
      hasVariance,
      details: input.varianceDetails,
      reportedAt: new Date(),
    };
  }

  // 有作业选项 → processing, 无 → ready_to_ship
  // 作業オプションあり → processing, なし → ready_to_ship
  if (order.serviceOptions && order.serviceOptions.length > 0) {
    order.status = 'processing';
  } else {
    // FBA标是否就绪 / FBAラベル準備OK?
    const labelReady = checkLabelReady(order);
    order.status = labelReady ? 'ready_to_ship' : 'awaiting_label';
  }

  await order.save();
  return order;
}

/**
 * 作業完了（単一作業オプション）/ 单个作业选项完成
 */
export async function completeServiceOption(
  orderId: string,
  optionCode: string,
  actualQuantity: number,
): Promise<HydratedDocument<IInboundOrder>> {
  const order = await InboundOrder.findById(orderId);
  if (!order) throw new Error('入庫予約が見つかりません / 入库预定不存在');

  const opt = order.serviceOptions?.find((o) => o.optionCode === optionCode);
  if (!opt) throw new Error(`作業オプション「${optionCode}」が見つかりません / 作业选项不存在`);

  opt.actualQuantity = actualQuantity;
  opt.actualCost = actualQuantity * opt.unitPrice;
  opt.status = 'completed';

  // 自動計費 / 自动计费
  await createChargeForOption(order, opt);

  // 全オプション完了チェック / 全部选项完成检查
  const allCompleted = order.serviceOptions?.every((o) => o.status === 'completed');
  if (allCompleted) {
    const labelReady = checkLabelReady(order);
    order.status = labelReady ? 'ready_to_ship' : 'awaiting_label';
  }

  await order.save();
  return order;
}

/**
 * FBAラベルアップロード完了 / FBA标上传完成
 *
 * awaiting_label → ready_to_ship（作業が全完了の場合）
 */
export async function onLabelUploaded(orderId: string): Promise<HydratedDocument<IInboundOrder>> {
  const order = await InboundOrder.findById(orderId);
  if (!order) throw new Error('入庫予約が見つかりません / 入库预定不存在');

  if (order.status === 'awaiting_label') {
    const allCompleted = !order.serviceOptions?.length || order.serviceOptions.every((o) => o.status === 'completed');
    if (allCompleted) {
      order.status = 'ready_to_ship';
    }
  }

  await order.save();
  return order;
}

/**
 * 出荷完了 / 出货完成
 *
 * ready_to_ship → shipped
 */
export async function shipOrder(
  orderId: string,
  input: {
    trackingNumbers: Array<{ boxNumber?: string; trackingNumber: string; carrier?: string }>;
    shippedBy?: string;
  },
): Promise<HydratedDocument<IInboundOrder>> {
  const order = await InboundOrder.findById(orderId);
  if (!order) throw new Error('入庫予約が見つかりません / 入库预定不存在');
  if (order.status !== 'ready_to_ship') {
    throw new Error(`ステータスが「ready_to_ship」ではありません（現在: ${order.status}）/ 状态不是 ready_to_ship`);
  }

  order.status = 'shipped';
  order.trackingNumbers = input.trackingNumbers;
  order.shippedAt = new Date();

  await order.save();
  return order;
}

/**
 * 差異確認（客户门户调用）/ 差異確認（顧客ポータルから呼び出し）
 */
export async function acknowledgeVariance(orderId: string): Promise<HydratedDocument<IInboundOrder>> {
  const order = await InboundOrder.findById(orderId);
  if (!order) throw new Error('入庫予約が見つかりません / 入库预定不存在');

  if (order.varianceReport) {
    order.varianceReport.clientViewedAt = new Date();
    order.markModified('varianceReport');
  }

  await order.save();
  return order;
}

// --- 内部ヘルパー / 内部工具 ---

function checkLabelReady(order: HydratedDocument<IInboundOrder>): boolean {
  if (order.destinationType === 'b2b') return true; // B2B 不需要平台标
  if (order.destinationType === 'fba') {
    return order.fbaInfo?.labelSplitStatus === 'split' || !!order.fbaInfo?.labelPdfUrl;
  }
  if (order.destinationType === 'rsl') {
    return order.rslInfo?.labelSplitStatus === 'split' || !!order.rslInfo?.labelPdfUrl;
  }
  return true;
}

async function createChargeForOption(
  order: HydratedDocument<IInboundOrder>,
  opt: IServiceOption,
): Promise<void> {
  try {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await WorkCharge.create({
      tenantId: order.tenantId || 'default',
      clientId: order.clientId?.toString() || '',
      subClientId: order.subClientId?.toString() || '',
      shopId: order.shopId?.toString() || '',
      chargeType: opt.optionCode,
      chargeDate: now,
      referenceType: 'inboundOrder',
      referenceId: order._id.toString(),
      referenceNumber: order.orderNumber,
      quantity: opt.actualQuantity || opt.quantity,
      unitPrice: opt.unitPrice,
      amount: opt.actualCost || opt.estimatedCost,
      description: `${opt.optionName} (${order.orderNumber})`,
      billingPeriod: period,
      isBilled: false,
    });
  } catch (err) {
    // 計費失敗は警告のみ、メインフローをブロックしない
    // 计费失败仅警告，不阻塞主流程
    logger.warn({ optionCode: opt.optionCode, err }, '[PassthroughService] 計費失敗 / 计费失败');
  }
}
