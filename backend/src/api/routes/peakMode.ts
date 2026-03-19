/**
 * ピークモード管理ルート / 高峰模式管理路由
 */

import { Router } from 'express';

export const peakModeRouter = Router();

/**
 * GET /api/peak-mode/status
 * ピークモードの現在状態を取得 / 获取高峰模式当前状态
 */
peakModeRouter.get('/status', async (req, res) => {
  try {
    const { getPeakModeStatus } = await import('@/services/peakModeService');
    const tenantId = 'default';

    const status = await getPeakModeStatus(tenantId);

    res.json({
      peakModeEnabled: status.enabled,
      inboundFrozen: status.inboundFreezeActive,
      capacityPercent: Math.round(status.capacityStatus.occupancyRate * 100),
      isWarning: status.capacityStatus.isWarning,
      isCritical: status.capacityStatus.isCritical,
      usedLocations: status.capacityStatus.occupiedLocations,
      totalLocations: status.capacityStatus.totalLocations,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'ピークモード状態の取得に失敗しました' });
  }
});

/**
 * POST /api/peak-mode/enable
 * ピークモードを有効化 / 启用高峰模式
 */
peakModeRouter.post('/enable', async (req, res) => {
  try {
    const { enablePeakMode } = await import('@/services/peakModeService');
    const tenantId = 'default';
    const { reason } = req.body || {};

    const result = await enablePeakMode(tenantId, reason);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'ピークモードの有効化に失敗しました' });
  }
});

/**
 * POST /api/peak-mode/disable
 * ピークモードを無効化 / 禁用高峰模式
 */
peakModeRouter.post('/disable', async (req, res) => {
  try {
    const { disablePeakMode } = await import('@/services/peakModeService');
    const tenantId = 'default';

    const result = await disablePeakMode(tenantId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'ピークモードの無効化に失敗しました' });
  }
});
