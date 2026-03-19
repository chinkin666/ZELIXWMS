import { StockQuant } from '@/models/stockQuant';
import { Location } from '@/models/location';
import { FeatureFlag } from '@/models/featureFlag';
import { logger } from '@/lib/logger';

/**
 * 大促モードサービス / 大促模式服务
 *
 * 繁忙期（大促・セール時期）の倉庫運営を支援する。
 * 支持繁忙期（大促/打折季）的仓库运营。
 *
 * 機能 / 功能:
 * 1. 倉庫容量監視（80%超過で警告）
 * 2. 非緊急入庫の一時凍結（入庫フリーズ）
 * 3. 大促モード ON/OFF スイッチ（FeatureFlag 利用）
 */

const PEAK_MODE_FLAG_KEY = 'peak_mode';
const INBOUND_FREEZE_FLAG_KEY = 'peak_mode_inbound_freeze';

// ─── 倉庫容量監視 / 仓库容量监控 ───

export interface CapacityStatus {
  totalLocations: number;
  occupiedLocations: number;
  occupancyRate: number;
  isWarning: boolean;  // 80%超過
  isCritical: boolean; // 95%超過
}

/**
 * 倉庫の容量利用率を計算する / 计算仓库容量利用率
 */
export async function getCapacityStatus(
  warehouseId?: string,
): Promise<CapacityStatus> {
  const locFilter: Record<string, unknown> = {
    type: { $in: ['bin', 'shelf'] },
    isActive: true,
  };
  if (warehouseId) locFilter.warehouseId = warehouseId;

  const totalLocations = await Location.countDocuments(locFilter);

  const occupiedAgg = await StockQuant.aggregate([
    { $match: { quantity: { $gt: 0 } } },
    { $group: { _id: '$locationId' } },
    { $count: 'count' },
  ]);
  const occupiedLocations = occupiedAgg[0]?.count || 0;

  const occupancyRate = totalLocations > 0 ? occupiedLocations / totalLocations : 0;

  return {
    totalLocations,
    occupiedLocations,
    occupancyRate,
    isWarning: occupancyRate >= 0.8,
    isCritical: occupancyRate >= 0.95,
  };
}

// ─── 大促モード制御 / 大促模式控制 ───

async function ensureFlag(key: string, name: string): Promise<void> {
  await FeatureFlag.findOneAndUpdate(
    { key },
    { $setOnInsert: { key, name, defaultEnabled: false, tenantOverrides: [] } },
    { upsert: true },
  );
}

/**
 * 大促モードを有効化 / 启用大促模式
 */
export async function enablePeakMode(
  tenantId: string,
  reason?: string,
): Promise<{ enabled: boolean; capacityStatus: CapacityStatus }> {
  await ensureFlag(PEAK_MODE_FLAG_KEY, '大促モード / 大促模式');
  await ensureFlag(INBOUND_FREEZE_FLAG_KEY, '入庫フリーズ / 入库冻结');

  // テナント単位で有効化 / 按租户启用
  for (const key of [PEAK_MODE_FLAG_KEY, INBOUND_FREEZE_FLAG_KEY]) {
    await FeatureFlag.findOneAndUpdate(
      { key, 'tenantOverrides.tenantId': tenantId },
      { $set: { 'tenantOverrides.$.enabled': true } },
    ).then(async (doc) => {
      if (!doc) {
        await FeatureFlag.findOneAndUpdate(
          { key },
          { $push: { tenantOverrides: { tenantId, enabled: true } } },
        );
      }
    });
  }

  const capacityStatus = await getCapacityStatus();

  logger.info(
    { tenantId, reason, occupancyRate: capacityStatus.occupancyRate },
    '大促モード有効化 / 大促模式已启用',
  );

  return { enabled: true, capacityStatus };
}

/**
 * 大促モードを無効化 / 禁用大促模式
 */
export async function disablePeakMode(
  tenantId: string,
): Promise<{ enabled: boolean }> {
  for (const key of [PEAK_MODE_FLAG_KEY, INBOUND_FREEZE_FLAG_KEY]) {
    await FeatureFlag.findOneAndUpdate(
      { key, 'tenantOverrides.tenantId': tenantId },
      { $set: { 'tenantOverrides.$.enabled': false } },
    );
  }

  logger.info({ tenantId }, '大促モード無効化 / 大促模式已禁用');
  return { enabled: false };
}

/**
 * 大促モード状態取得 / 获取大促模式状态
 */
export async function getPeakModeStatus(
  tenantId: string,
): Promise<{
  enabled: boolean;
  inboundFreezeActive: boolean;
  capacityStatus: CapacityStatus;
}> {
  const [peakFlag, freezeFlag] = await Promise.all([
    FeatureFlag.findOne({ key: PEAK_MODE_FLAG_KEY }).lean(),
    FeatureFlag.findOne({ key: INBOUND_FREEZE_FLAG_KEY }).lean(),
  ]);

  const isEnabled = (flag: typeof peakFlag) => {
    if (!flag) return false;
    const override = flag.tenantOverrides?.find((o) => o.tenantId === tenantId);
    return override ? override.enabled : flag.defaultEnabled;
  };

  const capacityStatus = await getCapacityStatus();

  return {
    enabled: isEnabled(peakFlag),
    inboundFreezeActive: isEnabled(freezeFlag),
    capacityStatus,
  };
}

/**
 * 入庫フリーズ状態チェック / 检查入库冻结状态
 */
export async function isInboundFrozen(tenantId: string): Promise<boolean> {
  const status = await getPeakModeStatus(tenantId);
  return status.enabled && status.inboundFreezeActive;
}
