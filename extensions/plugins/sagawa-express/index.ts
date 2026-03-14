/**
 * 佐川急便插件入口 / 佐川急便プラグインエントリポイント
 *
 * 提供 e飛伝 CSV 导出、追踪号导入、Hook 事件连携。
 * e飛伝 CSV 出力・追跡番号取込・Hook イベント連携を提供。
 */

import { createRouter } from './routes';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const manifest = require('./manifest.json');

const plugin = {
  manifest,

  async install(ctx: any) {
    // 注册 Hook: order.shipped / Hook 登録: order.shipped
    // 佐川向け出荷完了時のログ記録（将来は API 連携の拡張点）
    ctx.registerHook(
      'order.shipped',
      async (hookCtx: any) => {
        const order = hookCtx.payload?.order;
        if (!order) return;

        // 只处理佐川的订单 / 佐川の注文のみ処理
        const carrierId = order.carrierId || '';
        if (carrierId !== '__builtin_sagawa__' && !carrierId.includes('sagawa')) return;

        ctx.logger.info(
          { orderNumber: order.orderNumber, trackingId: order.trackingId },
          '[sagawa-express] Order shipped / 出荷完了',
        );
      },
      { priority: 50, async: true },
    );

    // 注册 Hook: order.confirmed / Hook 登録: order.confirmed
    ctx.registerHook(
      'order.confirmed',
      async (hookCtx: any) => {
        const order = hookCtx.payload?.order;
        if (!order) return;

        const carrierId = order.carrierId || '';
        if (carrierId !== '__builtin_sagawa__' && !carrierId.includes('sagawa')) return;

        ctx.logger.info(
          { orderNumber: order.orderNumber },
          '[sagawa-express] Order confirmed / 注文確認',
        );
      },
      { priority: 50, async: true },
    );

    // 注册 API 路由 / API ルートを登録
    const router = createRouter(ctx.getConfig, ctx.logger);
    ctx.registerAPI(router);

    ctx.logger.info('sagawa-express plugin installed / 佐川急便プラグインインストール完了');
  },

  async uninstall() {
    // 清理资源 / リソースクリーンアップ
  },
};

module.exports = plugin;
