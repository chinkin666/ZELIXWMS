/**
 * Plugin 管理 API 控制器 / プラグイン管理 API コントローラ
 *
 * 插件列表 + 启用/禁用 + 配置管理
 * プラグイン一覧 + 有効/無効 + 設定管理
 */

import type { Request, Response } from 'express';
import { extensionManager } from '@/core/extensions';
import { Plugin } from '@/models/plugin';

/**
 * GET /api/extensions/plugins
 * 列出所有插件（内存 + 数据库合并）
 * すべてのプラグインを一覧（メモリ + DB マージ）
 */
export async function listPlugins(_req: Request, res: Response) {
  try {
    const pluginManager = extensionManager.getPluginManager();
    const memoryPlugins = pluginManager.getInstalledPlugins();

    // 从数据库获取额外信息 / DB から追加情報を取得
    const dbPlugins = await Plugin.find().lean();
    const dbMap = new Map(dbPlugins.map((p) => [p.name, p]));

    const merged = memoryPlugins.map((p) => {
      const db = dbMap.get(p.name);
      return {
        ...p,
        installedAt: db?.installedAt,
        enabledAt: db?.enabledAt,
        errorMessage: db?.errorMessage,
      };
    });

    res.json({ data: merged });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /api/extensions/plugins/:name
 * 获取单个插件详情 / 単一プラグイン詳細を取得
 */
export async function getPlugin(req: Request, res: Response) {
  try {
    const pluginManager = extensionManager.getPluginManager();
    const plugin = pluginManager.getPlugin(req.params.name);

    if (!plugin) {
      res.status(404).json({ error: 'Plugin not found / プラグインが見つかりません' });
      return;
    }

    // 从数据库补充信息 / DB から情報を補足
    const dbPlugin = await Plugin.findOne({ name: req.params.name }).lean();

    res.json({
      ...plugin,
      installedAt: dbPlugin?.installedAt,
      enabledAt: dbPlugin?.enabledAt,
      errorMessage: dbPlugin?.errorMessage,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * POST /api/extensions/plugins/:name/enable
 * 启用插件 / プラグインを有効化
 */
export async function enablePlugin(req: Request, res: Response) {
  try {
    const pluginManager = extensionManager.getPluginManager();
    await pluginManager.enable(req.params.name);
    res.json({ message: `Plugin ${req.params.name} enabled / プラグイン ${req.params.name} 有効化` });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * POST /api/extensions/plugins/:name/disable
 * 禁用插件 / プラグインを無効化
 */
export async function disablePlugin(req: Request, res: Response) {
  try {
    const pluginManager = extensionManager.getPluginManager();
    await pluginManager.disable(req.params.name);
    res.json({ message: `Plugin ${req.params.name} disabled / プラグイン ${req.params.name} 無効化` });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /api/extensions/plugins/:name/config
 * 获取插件配置 / プラグイン設定を取得
 */
export async function getPluginConfig(req: Request, res: Response) {
  try {
    const tenantId = (req.query.tenantId as string) || '_default';
    const pluginManager = extensionManager.getPluginManager();
    const config = await pluginManager.getConfig(req.params.name, tenantId);
    res.json({ data: config });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * PUT /api/extensions/plugins/:name/config
 * 更新插件配置 / プラグイン設定を更新
 */
export async function updatePluginConfig(req: Request, res: Response) {
  try {
    const tenantId = (req.query.tenantId as string) || '_default';
    const { config } = req.body;

    if (!config || typeof config !== 'object') {
      res.status(400).json({ error: 'config object is required / config オブジェクトは必須です' });
      return;
    }

    const pluginManager = extensionManager.getPluginManager();
    const updated = await pluginManager.updatePluginConfig(req.params.name, tenantId, config);
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
