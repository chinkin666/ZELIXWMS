/**
 * inventory-alert 插件 / 在庫アラートプラグイン
 *
 * 监听 inventory.changed / stock.released 事件，当库存低于阈值时记录警告日志。
 * inventory.changed / stock.released イベントを監視し、在庫が閾値を下回ったら警告ログを記録する。
 *
 * 这是一个示例插件，演示插件开发规范。
 * これはサンプルプラグインで、プラグイン開発規範を示す。
 */

import { Router } from 'express';

// 插件由后端 PluginManager 通过 require() 加载
// プラグインはバックエンドの PluginManager により require() でロードされる
// PluginDefinition / PluginContext 类型在运行时由宿主提供
// PluginDefinition / PluginContext 型はランタイムでホストから提供される

// eslint-disable-next-line @typescript-eslint/no-var-requires
const manifest = require('./manifest.json');

const plugin = {
  manifest,

  async install(ctx: any) {
    // 注册 Hook: inventory.changed / Hook を登録: inventory.changed
    ctx.registerHook(
      'inventory.changed',
      async (hookCtx: any) => {
        const config = await ctx.getConfig(hookCtx.tenantId);
        const threshold = (config.threshold as number) ?? 5;
        const enabled = config.enabled !== false;

        if (!enabled) return;

        const payload = hookCtx.payload;
        const currentStock = payload.currentStock as number | undefined;
        const sku = payload.sku as string | undefined;

        if (currentStock !== undefined && currentStock < threshold) {
          ctx.logger.warn(
            { sku, currentStock, threshold },
            `[inventory-alert] Low stock detected / 低在庫検出: ${sku} = ${currentStock} (threshold: ${threshold})`,
          );
        }
      },
      { priority: 80, async: true },
    );

    // 注册 Hook: stock.released / Hook を登録: stock.released
    // 库存释放时检查剩余库存 / 在庫リリース時に残り在庫をチェック
    ctx.registerHook(
      'stock.released',
      async (hookCtx: any) => {
        const config = await ctx.getConfig(hookCtx.tenantId);
        const threshold = (config.threshold as number) ?? 5;
        const enabled = config.enabled !== false;

        if (!enabled) return;

        const payload = hookCtx.payload;
        const remainingStock = (payload.remainingStock ?? payload.currentStock) as number | undefined;
        const sku = payload.sku as string | undefined;

        if (remainingStock !== undefined && remainingStock < threshold) {
          ctx.logger.warn(
            { sku, remainingStock, threshold },
            `[inventory-alert] Low stock after release / リリース後低在庫検出: ${sku} = ${remainingStock} (threshold: ${threshold})`,
          );
        }
      },
      { priority: 80, async: true },
    );

    // 注册自定义 API / カスタム API を登録
    const router = Router();

    // GET /api/plugins/inventory-alert/status
    router.get('/status', (_req: any, res: any) => {
      res.json({
        plugin: 'inventory-alert',
        version: manifest.version,
        status: 'running',
      });
    });

    ctx.registerAPI(router);

    ctx.logger.info('inventory-alert plugin installed / 在庫アラートプラグインインストール完了');
  },

  async uninstall() {
    // 清理资源 / リソースクリーンアップ
  },
};

module.exports = plugin;
