/**
 * 功能开关管理 Controller / フィーチャーフラグ管理コントローラー
 */

import type { Request, Response } from 'express';
import { extensionManager } from '@/core/extensions';

/**
 * 获取所有功能开关 / 全フィーチャーフラグ取得
 * GET /api/extensions/feature-flags
 */
export async function listFlags(req: Request, res: Response) {
  try {
    const service = extensionManager.getFeatureFlagService();
    const flags = await service.getAllFlags();
    res.json({ data: flags });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * 获取租户的功能状态映射 / テナントの機能状態マップ取得
 * GET /api/extensions/feature-flags/status
 */
export async function getFlagStatus(req: Request, res: Response) {
  try {
    const tenantId = req.query.tenantId as string | undefined;
    const service = extensionManager.getFeatureFlagService();
    const flags = await service.getFlagsForTenant(tenantId);
    res.json({ data: flags });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * 创建功能开关 / フィーチャーフラグ作成
 * POST /api/extensions/feature-flags
 */
export async function createFlag(req: Request, res: Response) {
  try {
    const service = extensionManager.getFeatureFlagService();
    const flag = await service.createFlag(req.body);
    res.status(201).json(flag);
  } catch (err) {
    const message = (err as Error).message;
    const status = message.includes('duplicate key') ? 409 : 400;
    res.status(status).json({ error: message });
  }
}

/**
 * 更新功能开关 / フィーチャーフラグ更新
 * PUT /api/extensions/feature-flags/:id
 */
export async function updateFlag(req: Request, res: Response) {
  try {
    const service = extensionManager.getFeatureFlagService();
    const flag = await service.updateFlag(req.params.id, req.body);
    if (!flag) {
      return res.status(404).json({ error: 'フィーチャーフラグが見つかりません' });
    }
    res.json(flag);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

/**
 * 删除功能开关 / フィーチャーフラグ削除
 * DELETE /api/extensions/feature-flags/:id
 */
export async function deleteFlag(req: Request, res: Response) {
  try {
    const service = extensionManager.getFeatureFlagService();
    const deleted = await service.deleteFlag(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'フィーチャーフラグが見つかりません' });
    }
    res.json({ message: 'フィーチャーフラグを削除しました' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * 切换功能开关 / フィーチャーフラグトグル
 * POST /api/extensions/feature-flags/:id/toggle
 */
export async function toggleFlag(req: Request, res: Response) {
  try {
    const service = extensionManager.getFeatureFlagService();
    const flag = await service.toggleFlag(req.params.id);
    if (!flag) {
      return res.status(404).json({ error: 'フィーチャーフラグが見つかりません' });
    }
    res.json({ _id: flag._id, key: flag.key, defaultEnabled: flag.defaultEnabled });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * 设置租户覆盖 / テナントオーバーライド設定
 * POST /api/extensions/feature-flags/:id/tenant-override
 */
export async function setTenantOverride(req: Request, res: Response) {
  try {
    const { tenantId, enabled } = req.body;
    if (!tenantId || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'tenantId と enabled (boolean) が必須です' });
    }
    const service = extensionManager.getFeatureFlagService();
    const flag = await service.setTenantOverride(req.params.id, tenantId, enabled);
    if (!flag) {
      return res.status(404).json({ error: 'フィーチャーフラグが見つかりません' });
    }
    res.json(flag);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * 删除租户覆盖 / テナントオーバーライド削除
 * DELETE /api/extensions/feature-flags/:id/tenant-override/:tenantId
 */
export async function removeTenantOverride(req: Request, res: Response) {
  try {
    const service = extensionManager.getFeatureFlagService();
    const flag = await service.removeTenantOverride(req.params.id, req.params.tenantId);
    if (!flag) {
      return res.status(404).json({ error: 'フィーチャーフラグが見つかりません' });
    }
    res.json(flag);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
