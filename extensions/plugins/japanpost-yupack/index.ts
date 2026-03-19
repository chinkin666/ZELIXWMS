/**
 * 日本郵便ゆうパック插件入口 / 日本郵便ゆうパックプラグインエントリポイント
 *
 * ゆうプリR CSV 出力・追跡番号取込・Hook イベント連携。
 * ゆうプリR CSV 导出、追踪号导入、Hook 事件连携。
 *
 * @zelix/plugin-sdk v1.0.0 使用。
 */

import { definePlugin, HOOK_EVENTS, forCarrier } from '@zelix/plugin-sdk';
import type { OrderPayload } from '@zelix/plugin-sdk';
import { createRouter } from './routes';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const manifest = require('./manifest.json');

/** 插件配置类型 / プラグイン設定型 */
interface YupackConfig {
  enabled: boolean;
  customerCode: string;
  defaultSize: string;
  defaultDeliveryType: string;
  senderName: string;
  senderPostalCode: string;
  senderAddress: string;
  senderPhone: string;
}

export default definePlugin<YupackConfig>({
  manifest,

  async install(ctx) {
    // 注册 Hook: order.shipped（日本郵便専用フィルタ）
    // Hook 登録: order.shipped（日本邮政专用过滤）
    ctx.registerHook(
      HOOK_EVENTS.ORDER_SHIPPED,
      forCarrier(['__builtin_japanpost__', 'japanpost', 'yupack', '日本郵便'], async (hookCtx) => {
        const payload = hookCtx.payload as unknown as OrderPayload;
        const order = payload.order;
        if (!order) return;

        ctx.logger.info(
          { orderNumber: order.orderNumber, trackingId: order.trackingId },
          '[japanpost-yupack] Order shipped / 出荷完了',
        );
      }),
      { priority: 50, async: true },
    );

    // 注册 Hook: order.confirmed（日本郵便専用フィルタ）
    // Hook 登録: order.confirmed（日本邮政专用过滤）
    ctx.registerHook(
      HOOK_EVENTS.ORDER_CONFIRMED,
      forCarrier(['__builtin_japanpost__', 'japanpost', 'yupack', '日本郵便'], async (hookCtx) => {
        const payload = hookCtx.payload as unknown as OrderPayload;
        const order = payload.order;
        if (!order) return;

        ctx.logger.info(
          { orderNumber: order.orderNumber },
          '[japanpost-yupack] Order confirmed / 注文確認',
        );
      }),
      { priority: 50, async: true },
    );

    // 注册 API 路由（ModelProxy 使用）
    // API ルート登録（ModelProxy 使用）
    const router = createRouter(
      (tenantId: string) => ctx.getConfig(tenantId),
      ctx.logger,
      ctx.models,
    );
    ctx.registerAPI(router);

    ctx.logger.info({}, 'japanpost-yupack plugin installed / 日本郵便ゆうパックプラグインインストール完了');
  },

  async uninstall() {
    // 清理资源 / リソースクリーンアップ
  },

  async healthCheck() {
    return { healthy: true };
  },
});
