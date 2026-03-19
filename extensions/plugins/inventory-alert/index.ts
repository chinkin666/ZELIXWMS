/**
 * inventory-alert 插件 / 在庫アラートプラグイン
 *
 * 监听 inventory.changed / stock.released 事件，当库存低于阈值时记录警告日志。
 * inventory.changed / stock.released イベントを監視し、在庫が閾値を下回ったら警告ログを記録する。
 *
 * 使用 @zelix/plugin-sdk 重构，提供类型安全。
 * @zelix/plugin-sdk でリファクタリング、型安全を提供。
 */

import { definePlugin, HOOK_EVENTS, guardEnabled } from '@zelix/plugin-sdk';
import type { InventoryPayload, StockReleasedPayload } from '@zelix/plugin-sdk';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const manifest = require('./manifest.json');

/** 插件配置类型 / プラグイン設定型 */
interface AlertConfig {
  threshold: number;
  enabled: boolean;
}

export default definePlugin<AlertConfig>({
  manifest,

  async install(ctx) {
    // 注册 Hook: inventory.changed / Hook を登録: inventory.changed
    ctx.registerHook(
      HOOK_EVENTS.INVENTORY_CHANGED,
      guardEnabled<AlertConfig>(ctx, async (hookCtx, config) => {
        const threshold = config.threshold ?? 5;
        const payload = hookCtx.payload as unknown as InventoryPayload;
        const currentStock = payload.currentStock;
        const sku = payload.sku;

        if (currentStock !== undefined && currentStock < threshold) {
          ctx.logger.warn(
            { sku, currentStock, threshold },
            `[inventory-alert] Low stock detected / 低在庫検出: ${sku} = ${currentStock} (threshold: ${threshold})`,
          );
        }
      }),
      { priority: 80, async: true },
    );

    // 注册 Hook: stock.released / Hook を登録: stock.released
    ctx.registerHook(
      HOOK_EVENTS.STOCK_RELEASED,
      guardEnabled<AlertConfig>(ctx, async (hookCtx, config) => {
        const threshold = config.threshold ?? 5;
        const payload = hookCtx.payload as unknown as StockReleasedPayload;
        const remainingStock = payload.remainingStock;
        const sku = payload.sku;

        if (remainingStock !== undefined && remainingStock < threshold) {
          ctx.logger.warn(
            { sku, remainingStock, threshold },
            `[inventory-alert] Low stock after release / リリース後低在庫検出: ${sku} = ${remainingStock} (threshold: ${threshold})`,
          );
        }
      }),
      { priority: 80, async: true },
    );

    // 注册自定义 API / カスタム API を登録
    const { Router } = await import('express');
    const router = Router();

    // GET /api/plugins/inventory-alert/status
    router.get('/status', (_req, res) => {
      res.json({
        plugin: manifest.name,
        version: manifest.version,
        status: 'running',
      });
    });

    ctx.registerAPI(router);

    ctx.logger.info({}, 'inventory-alert plugin installed / 在庫アラートプラグインインストール完了');
  },

  async uninstall() {
    // 清理资源 / リソースクリーンアップ
  },

  async healthCheck() {
    return { healthy: true };
  },
});
