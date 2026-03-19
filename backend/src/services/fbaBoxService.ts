import { FbaBox, IFbaBox, FbaBoxStatus, validateFbaBox, FBA_BOX_LIMITS } from '@/models/fbaBox';
import { logger } from '@/lib/logger';

/**
 * FBA箱管理サービス / FBA箱管理服务
 *
 * FBA納品プランの箱レベル操作を管理する。
 * 管理FBA纳品计划的箱级操作。
 *
 * 操作 / 操作:
 * - 分箱: 1箱 → 2箱に分割 / 一箱拆为两箱
 * - 合箱: 2箱 → 1箱に統合 / 两箱合为一箱
 * - 換箱: 箱番号を変更 / 更换箱号
 * - 箱規格検証: Amazon制限チェック / Amazon规格校验
 */

// ─── 箱番号生成 / 箱号生成 ───

function generateBoxNumber(orderId: string, index: number): string {
  return `${orderId.slice(-6)}-U${String(index).padStart(3, '0')}`;
}

// ─── 分箱操作 / 分箱操作 ───

/**
 * 1箱を2箱に分割する / 一箱拆为两箱
 *
 * 日本のFBA倉庫では、重量オーバーや混合SKU制限で
 * 箱を分ける必要が頻繁に発生する。
 */
export async function splitBox(
  boxId: string,
  splitItems: Array<{ sku: string; quantity: number }>,
): Promise<{ originalBox: IFbaBox; newBox: IFbaBox }> {
  const originalBox = await FbaBox.findById(boxId);
  if (!originalBox) {
    throw new Error(`箱が見つかりません: ${boxId} / 箱不存在`);
  }
  if (originalBox.status !== 'packing') {
    throw new Error(`packing状態の箱のみ分箱可能です / 只能拆分packing状态的箱`);
  }

  // 分割する商品を元箱から減算、新箱に追加
  // 从原箱减去，加到新箱
  const newItems = [];
  for (const splitItem of splitItems) {
    const originalItem = originalBox.items.find((i) => i.sku === splitItem.sku);
    if (!originalItem) {
      throw new Error(`SKU ${splitItem.sku} が元箱にありません / 原箱中不存在此SKU`);
    }
    if (splitItem.quantity > originalItem.quantity) {
      throw new Error(
        `分割数量(${splitItem.quantity})が元数量(${originalItem.quantity})を超えています / 拆分数量超过原数量`,
      );
    }

    originalItem.quantity -= splitItem.quantity;
    newItems.push({
      productId: originalItem.productId,
      sku: originalItem.sku,
      fnsku: originalItem.fnsku,
      quantity: splitItem.quantity,
    });
  }

  // 数量0の商品を削除 / 删除数量为0的商品
  originalBox.items = originalBox.items.filter((i) => i.quantity > 0);
  await originalBox.save();

  // 新箱の箱番号 = 元箱-B / 新箱箱号
  const existingCount = await FbaBox.countDocuments({
    inboundOrderId: originalBox.inboundOrderId,
  });

  const newBox = await FbaBox.create({
    tenantId: originalBox.tenantId,
    inboundOrderId: originalBox.inboundOrderId,
    boxNumber: generateBoxNumber(String(originalBox.inboundOrderId), existingCount + 1),
    destinationFc: originalBox.destinationFc,
    items: newItems,
    status: 'packing',
    boxLabelPrinted: false,
    shippingLabelPrinted: false,
  });

  logger.info(
    { originalBoxId: boxId, newBoxId: String(newBox._id) },
    '分箱完了 / 分箱完成',
  );

  return { originalBox, newBox };
}

// ─── 合箱操作 / 合箱操作 ───

/**
 * 2箱を1箱に統合する / 两箱合为一箱
 */
export async function mergeBoxes(
  targetBoxId: string,
  sourceBoxId: string,
): Promise<IFbaBox> {
  const targetBox = await FbaBox.findById(targetBoxId);
  const sourceBox = await FbaBox.findById(sourceBoxId);

  if (!targetBox || !sourceBox) {
    throw new Error('対象箱またはソース箱が見つかりません / 目标箱或源箱不存在');
  }
  if (targetBox.status !== 'packing' || sourceBox.status !== 'packing') {
    throw new Error('packing状態の箱のみ合箱可能です / 只能合并packing状态的箱');
  }
  if (String(targetBox.inboundOrderId) !== String(sourceBox.inboundOrderId)) {
    throw new Error('同一入庫予約の箱のみ合箱可能です / 只能合并同一入库预定的箱');
  }

  // ソース箱の商品をターゲット箱に移動 / 将源箱商品移到目标箱
  for (const sourceItem of sourceBox.items) {
    const existing = targetBox.items.find((i) => i.sku === sourceItem.sku);
    if (existing) {
      existing.quantity += sourceItem.quantity;
    } else {
      targetBox.items.push({
        productId: sourceItem.productId,
        sku: sourceItem.sku,
        fnsku: sourceItem.fnsku,
        quantity: sourceItem.quantity,
      });
    }
  }

  // 合算重量 / 合计重量
  if (targetBox.weight && sourceBox.weight) {
    targetBox.weight += sourceBox.weight;
  }

  await targetBox.save();

  // ソース箱を削除 / 删除源箱
  await sourceBox.deleteOne();

  logger.info(
    { targetBoxId, sourceBoxId },
    '合箱完了 / 合箱完成',
  );

  return targetBox;
}

// ─── 箱規格一括検証 / 箱规批量校验 ───

/**
 * 入庫予約の全箱を一括検証する / 批量校验入库预定的所有箱
 */
export async function validateAllBoxes(
  inboundOrderId: string,
): Promise<{
  totalBoxes: number;
  validBoxes: number;
  invalidBoxes: Array<{ boxNumber: string; errors: string[] }>;
}> {
  const boxes = await FbaBox.find({ inboundOrderId }).lean();

  let validBoxes = 0;
  const invalidBoxes: Array<{ boxNumber: string; errors: string[] }> = [];

  for (const box of boxes) {
    const result = validateFbaBox(box);
    if (result.valid) {
      validBoxes++;
    } else {
      invalidBoxes.push({ boxNumber: box.boxNumber, errors: result.errors });
    }
  }

  return {
    totalBoxes: boxes.length,
    validBoxes,
    invalidBoxes,
  };
}

// ─── 多仓纳品拆分 / 多仓拆分 ───

/**
 * FC別に箱をグループ化 / 按FC分组箱
 */
export async function groupBoxesByFc(
  inboundOrderId: string,
): Promise<Record<string, IFbaBox[]>> {
  const boxes = await FbaBox.find({ inboundOrderId }).lean();
  const groups: Record<string, IFbaBox[]> = {};

  for (const box of boxes) {
    const fc = box.destinationFc || 'default';
    if (!groups[fc]) groups[fc] = [];
    groups[fc].push(box);
  }

  return groups;
}
