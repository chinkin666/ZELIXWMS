/**
 * 佐川急便插件入口 / 佐川急便プラグインエントリポイント
 *
 * 提供 e飛伝Ⅲ CSV 导出、追踪号导入、Hook 事件连携。
 * e飛伝Ⅲ CSV 出力・追跡番号取込・Hook イベント連携を提供。
 *
 * 使用 @zelix/plugin-sdk 重构，提供类型安全 + ModelProxy。
 * @zelix/plugin-sdk でリファクタリング、型安全 + ModelProxy を提供。
 */

import { definePlugin, HOOK_EVENTS, forCarrier } from '@zelix/plugin-sdk';
import type { OrderPayload } from '@zelix/plugin-sdk';
import { createRouter } from './routes';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const manifest = require('./manifest.json');

/** 插件配置类型 / プラグイン設定型 */
interface SagawaConfig {
  billingCode: string;
  defaultInvoiceType: string;
  defaultSize: string;
}

export default definePlugin<SagawaConfig>({
  manifest,

  async install(ctx) {
    // 注册 Hook: order.shipped（佐川专用过滤）
    // Hook 登録: order.shipped（佐川専用フィルタ）
    ctx.registerHook(
      HOOK_EVENTS.ORDER_SHIPPED,
      forCarrier(['__builtin_sagawa__', 'sagawa'], async (hookCtx) => {
        const payload = hookCtx.payload as unknown as OrderPayload;
        const order = payload.order;
        if (!order) return;

        ctx.logger.info(
          { orderNumber: order.orderNumber, trackingId: order.trackingId },
          '[sagawa-express] Order shipped / 出荷完了',
        );
      }),
      { priority: 50, async: true },
    );

    // 注册 Hook: order.confirmed（佐川专用过滤）
    // Hook 登録: order.confirmed（佐川専用フィルタ）
    ctx.registerHook(
      HOOK_EVENTS.ORDER_CONFIRMED,
      forCarrier(['__builtin_sagawa__', 'sagawa'], async (hookCtx) => {
        const payload = hookCtx.payload as unknown as OrderPayload;
        const order = payload.order;
        if (!order) return;

        ctx.logger.info(
          { orderNumber: order.orderNumber },
          '[sagawa-express] Order confirmed / 注文確認',
        );
      }),
      { priority: 50, async: true },
    );

    // 注册 API 路由（使用 ModelProxy 替代 require 直接引用）
    // API ルート登録（require 直接参照の代わりに ModelProxy を使用）
    const router = createRouter(
      (tenantId: string) => ctx.getConfig(tenantId),
      ctx.logger,
      ctx.models,
    );
    ctx.registerAPI(router);

    ctx.logger.info({}, 'sagawa-express plugin installed / 佐川急便プラグインインストール完了');
  },

  async uninstall() {
    // 清理资源 / リソースクリーンアップ
  },

  async healthCheck() {
    return { healthy: true };
  },
});
