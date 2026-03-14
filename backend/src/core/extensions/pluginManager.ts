/**
 * PluginManager — 插件管理器 / プラグインマネージャー
 *
 * 负责从文件系统加载插件，管理插件生命周期。
 * ファイルシステムからプラグインを読み込み、プラグインのライフサイクルを管理する。
 *
 * 特性 / 特徴:
 * - 启动时自动加载 extensions/plugins/ 下的插件
 *   起動時に extensions/plugins/ 配下のプラグインを自動ロード
 * - 插件可注册 Hook handler + 自定义 API
 *   プラグインは Hook handler + カスタム API を登録可能
 * - 插件可启用/禁用，状态持久化到数据库
 *   プラグインの有効/無効を切替可能、状態は DB に永続化
 * - 插件配置按租户隔离
 *   プラグイン設定はテナントごとに分離
 */

import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { logger } from '@/lib/logger';
import { Plugin } from '@/models/plugin';
import { PluginConfig } from '@/models/pluginConfig';
import type { HookManager } from './hookManager';
import type { HookEventName, HookHandlerFn, HookHandlerOptions } from './types';

// ─── 插件清单 / プラグインマニフェスト ───

export interface PluginManifest {
  /** 插件唯一名称 / プラグイン一意名称 */
  name: string;
  /** 版本号 / バージョン */
  version: string;
  /** 描述 / 説明 */
  description: string;
  /** 作者 / 作者 */
  author: string;
  /** 订阅的 Hook 事件 / サブスクライブする Hook イベント */
  hooks: string[];
  /** 所需权限 / 必要な権限 */
  permissions: string[];
  /** 可配置项定义 / 設定項目定義 */
  config?: Record<string, {
    type: string;
    default?: unknown;
    description?: string;
  }>;
}

// ─── 插件定义 / プラグイン定義 ───

export interface PluginContext {
  /** Hook 注册快捷方法 / Hook 登録ショートカット */
  registerHook: (
    event: HookEventName,
    handler: HookHandlerFn,
    options?: HookHandlerOptions,
  ) => void;
  /** API 路由注册 / API ルート登録 */
  registerAPI: (router: Router) => void;
  /** 获取租户配置 / テナント設定を取得 */
  getConfig: (tenantId?: string) => Promise<Record<string, unknown>>;
  /** 插件日志 / プラグインロガー */
  logger: typeof logger;
}

export interface PluginDefinition {
  manifest: PluginManifest;
  install: (ctx: PluginContext) => Promise<void>;
  uninstall?: () => Promise<void>;
}

// ─── 内部插件实例 / 内部プラグインインスタンス ───

interface PluginInstance {
  manifest: PluginManifest;
  definition: PluginDefinition;
  status: 'enabled' | 'disabled' | 'error';
  pluginPath: string;
}

// ─── 插件信息（对外暴露）/ プラグイン情報（外部公開用）───

export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  status: string;
  hooks: string[];
  permissions: string[];
  config?: PluginManifest['config'];
  errorMessage?: string;
  installedAt?: Date;
  enabledAt?: Date;
}

export class PluginManager {
  private plugins: Map<string, PluginInstance> = new Map();
  private hookManager: HookManager;
  private pluginRouter: Router = Router();

  constructor(hookManager: HookManager) {
    this.hookManager = hookManager;
  }

  /**
   * 启动时加载所有插件 / 起動時にすべてのプラグインをロード
   */
  async loadPlugins(): Promise<void> {
    const pluginDir = path.resolve(process.cwd(), '../extensions/plugins');

    if (!fs.existsSync(pluginDir)) {
      logger.info('No plugins directory found, skipping / plugins ディレクトリが見つかりません、スキップ');
      return;
    }

    const dirs = fs.readdirSync(pluginDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const dir of dirs) {
      try {
        await this.loadPlugin(path.join(pluginDir, dir.name));
      } catch (error) {
        logger.error(
          { pluginName: dir.name, err: error },
          'Failed to load plugin / プラグインロード失敗',
        );
      }
    }

    logger.info(
      { count: this.plugins.size },
      'Plugins loaded / プラグインロード完了',
    );
  }

  /**
   * 加载单个插件 / 単一プラグインをロード
   */
  private async loadPlugin(pluginPath: string): Promise<void> {
    // 1. 读取 manifest / manifest を読み込む
    const manifestPath = path.join(pluginPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`manifest.json not found in ${pluginPath}`);
    }

    const manifest: PluginManifest = JSON.parse(
      fs.readFileSync(manifestPath, 'utf-8'),
    );

    // 2. 校验 manifest / manifest を検証
    this.validateManifest(manifest);

    // 3. 检查数据库中的状态 / DB のステータスを確認
    const dbPlugin = await Plugin.findOne({ name: manifest.name });
    if (dbPlugin?.status === 'disabled') {
      logger.info(
        { pluginName: manifest.name },
        'Plugin is disabled, skipping / プラグインは無効、スキップ',
      );

      this.plugins.set(manifest.name, {
        manifest,
        definition: { manifest, install: async () => {} },
        status: 'disabled',
        pluginPath,
      });
      return;
    }

    // 4. 加载入口文件 / エントリファイルをロード
    const entryPath = path.join(pluginPath, 'index');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pluginModule = require(entryPath);
    const pluginDef: PluginDefinition = pluginModule.default || pluginModule;

    // 5. 创建插件上下文 / プラグインコンテキストを作成
    const ctx: PluginContext = {
      registerHook: (event, handler, options = {}) => {
        this.hookManager.register(
          event,
          `${manifest.name}:${event}`,
          handler,
          {
            ...options,
            pluginName: manifest.name,
          },
        );
      },
      registerAPI: (router) => {
        this.pluginRouter.use(`/${manifest.name}`, router);
      },
      getConfig: (tenantId) => this.getPluginConfig(manifest.name, tenantId || '_default'),
      logger: logger.child({ plugin: manifest.name }),
    };

    // 6. 执行安装 / インストール実行
    try {
      await pluginDef.install(ctx);
    } catch (err) {
      // 安装失败，标记错误状态 / インストール失敗、エラー状態に設定
      await Plugin.findOneAndUpdate(
        { name: manifest.name },
        {
          name: manifest.name,
          version: manifest.version,
          description: manifest.description,
          author: manifest.author,
          status: 'error',
          hooks: manifest.hooks,
          permissions: manifest.permissions,
          errorMessage: (err as Error).message,
        },
        { upsert: true },
      );

      this.plugins.set(manifest.name, {
        manifest,
        definition: pluginDef,
        status: 'error',
        pluginPath,
      });

      throw err;
    }

    // 7. 注册到内存 / メモリに登録
    this.plugins.set(manifest.name, {
      manifest,
      definition: pluginDef,
      status: 'enabled',
      pluginPath,
    });

    // 8. 更新数据库 / DB を更新
    await Plugin.findOneAndUpdate(
      { name: manifest.name },
      {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        status: 'enabled',
        hooks: manifest.hooks,
        permissions: manifest.permissions,
        enabledAt: new Date(),
        errorMessage: undefined,
      },
      { upsert: true },
    );

    logger.info(
      { pluginName: manifest.name, version: manifest.version },
      'Plugin loaded / プラグインロード完了',
    );
  }

  /**
   * 禁用插件 / プラグインを無効化
   */
  async disable(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) throw new Error(`Plugin ${name} not found / プラグイン ${name} が見つかりません`);

    // 注销所有 Hook / すべての Hook を登録解除
    this.hookManager.unregisterByPlugin(name);

    // 执行卸载回调 / アンインストールコールバック実行
    if (plugin.definition.uninstall) {
      try {
        await plugin.definition.uninstall();
      } catch (err) {
        logger.error({ pluginName: name, err }, 'Plugin uninstall error / プラグインアンインストールエラー');
      }
    }

    plugin.status = 'disabled';
    await Plugin.updateOne({ name }, { status: 'disabled' });

    logger.info({ pluginName: name }, 'Plugin disabled / プラグイン無効化');
  }

  /**
   * 启用插件（需要重新加载）/ プラグインを有効化（再ロードが必要）
   */
  async enable(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) throw new Error(`Plugin ${name} not found / プラグイン ${name} が見つかりません`);

    if (plugin.status === 'enabled') return;

    // 重新加载插件 / プラグインを再ロード
    await this.loadPlugin(plugin.pluginPath);

    logger.info({ pluginName: name }, 'Plugin enabled / プラグイン有効化');
  }

  /**
   * 获取插件路由器 / プラグインルーターを取得
   */
  getRouter(): Router {
    return this.pluginRouter;
  }

  /**
   * 获取已安装插件列表 / インストール済みプラグイン一覧を取得
   */
  getInstalledPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map((p) => ({
      name: p.manifest.name,
      version: p.manifest.version,
      description: p.manifest.description,
      author: p.manifest.author,
      status: p.status,
      hooks: p.manifest.hooks,
      permissions: p.manifest.permissions,
      config: p.manifest.config,
    }));
  }

  /**
   * 获取单个插件信息 / 単一プラグイン情報を取得
   */
  getPlugin(name: string): PluginInfo | undefined {
    const plugin = this.plugins.get(name);
    if (!plugin) return undefined;
    return {
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      description: plugin.manifest.description,
      author: plugin.manifest.author,
      status: plugin.status,
      hooks: plugin.manifest.hooks,
      permissions: plugin.manifest.permissions,
      config: plugin.manifest.config,
    };
  }

  /**
   * 获取插件配置 / プラグイン設定を取得
   */
  private async getPluginConfig(name: string, tenantId: string): Promise<Record<string, unknown>> {
    const config = await PluginConfig.findOne({ pluginName: name, tenantId });
    if (config) return config.config;

    // 返回默认配置 / デフォルト設定を返す
    const plugin = this.plugins.get(name);
    if (!plugin?.manifest.config) return {};

    const defaults: Record<string, unknown> = {};
    for (const [key, def] of Object.entries(plugin.manifest.config)) {
      if (def.default !== undefined) {
        defaults[key] = def.default;
      }
    }
    return defaults;
  }

  /**
   * 更新插件配置 / プラグイン設定を更新
   */
  async updatePluginConfig(
    name: string,
    tenantId: string,
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const plugin = this.plugins.get(name);
    if (!plugin) throw new Error(`Plugin ${name} not found / プラグイン ${name} が見つかりません`);

    const result = await PluginConfig.findOneAndUpdate(
      { pluginName: name, tenantId },
      { config },
      { upsert: true, new: true },
    );

    return result.config;
  }

  /**
   * 获取插件配置（公开方法）/ プラグイン設定を取得（公開メソッド）
   */
  async getConfig(name: string, tenantId?: string): Promise<Record<string, unknown>> {
    return this.getPluginConfig(name, tenantId || '_default');
  }

  /**
   * 校验 manifest / manifest を検証
   */
  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.name) throw new Error('Plugin manifest missing "name"');
    if (!manifest.version) throw new Error('Plugin manifest missing "version"');
    if (!manifest.hooks || !Array.isArray(manifest.hooks)) {
      throw new Error('Plugin manifest missing "hooks" array');
    }
  }
}
