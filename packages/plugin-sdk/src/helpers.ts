/**
 * 插件开发辅助函数 / プラグイン開発ヘルパー関数
 *
 * 常用工具函数，简化插件开发。
 * よく使うユーティリティ関数、プラグイン開発を簡素化。
 */

import type { HookContext, HookEventName, HookEventPayloadMap } from './types';

/**
 * 创建按承运商过滤的 Hook handler / キャリアでフィルタリングされた Hook handler を作成
 *
 * 许多物流插件只处理特定承运商的订单。
 * 多くの物流プラグインは特定キャリアの注文のみ処理する。
 *
 * @example
 * ```ts
 * ctx.registerHook(
 *   HOOK_EVENTS.ORDER_SHIPPED,
 *   forCarrier('sagawa', async (hookCtx) => {
 *     // 只有佐川的订单会到这里 / 佐川の注文のみここに到達
 *     ctx.logger.info({ order: hookCtx.payload.order }, 'Sagawa shipped');
 *   }),
 * );
 * ```
 */
export function forCarrier<E extends HookEventName>(
  carrierMatch: string | string[] | RegExp,
  handler: (ctx: HookContext<E extends keyof HookEventPayloadMap ? HookEventPayloadMap[E] : Record<string, unknown>>) => Promise<void>,
): (ctx: HookContext) => Promise<void> {
  const matches = (carrierId: string): boolean => {
    if (typeof carrierMatch === 'string') {
      return carrierId === carrierMatch || carrierId.includes(carrierMatch);
    }
    if (Array.isArray(carrierMatch)) {
      return carrierMatch.some((m) => carrierId === m || carrierId.includes(m));
    }
    return carrierMatch.test(carrierId);
  };

  return async (ctx: HookContext) => {
    const order = (ctx.payload as Record<string, unknown>).order as Record<string, unknown> | undefined;
    const carrierId = (order?.carrierId as string) || '';
    if (!carrierId || !matches(carrierId)) return;
    await (handler as (ctx: HookContext) => Promise<void>)(ctx);
  };
}

/**
 * 创建带配置注入的 Hook handler / 設定注入付き Hook handler を作成
 *
 * 自动获取配置并注入到 handler 中，避免每个 handler 都手动调用 getConfig。
 * 自動で設定を取得して handler に注入、各 handler で手動 getConfig を回避。
 *
 * @example
 * ```ts
 * ctx.registerHook(
 *   HOOK_EVENTS.INVENTORY_CHANGED,
 *   withConfig(ctx, async (hookCtx, config) => {
 *     const threshold = config.threshold ?? 5;
 *     if (hookCtx.payload.currentStock < threshold) {
 *       ctx.logger.warn({}, 'Low stock!');
 *     }
 *   }),
 * );
 * ```
 */
export function withConfig<TConfig = Record<string, unknown>>(
  pluginCtx: { getConfig: (tenantId?: string) => Promise<TConfig> },
  handler: (hookCtx: HookContext, config: TConfig) => Promise<void>,
): (hookCtx: HookContext) => Promise<void> {
  return async (hookCtx: HookContext) => {
    const config = await pluginCtx.getConfig(hookCtx.tenantId);
    await handler(hookCtx, config);
  };
}

/**
 * 创建带启用/禁用检查的 Hook handler / 有効/無効チェック付き Hook handler を作成
 *
 * 如果配置中 enabled === false，则跳过执行。
 * 設定の enabled === false の場合、実行をスキップ。
 *
 * @example
 * ```ts
 * ctx.registerHook(
 *   HOOK_EVENTS.ORDER_CREATED,
 *   guardEnabled(ctx, async (hookCtx, config) => {
 *     // 只在启用时执行 / 有効時のみ実行
 *   }),
 * );
 * ```
 */
export function guardEnabled<TConfig extends { enabled?: boolean } = { enabled?: boolean }>(
  pluginCtx: { getConfig: (tenantId?: string) => Promise<TConfig> },
  handler: (hookCtx: HookContext, config: TConfig) => Promise<void>,
): (hookCtx: HookContext) => Promise<void> {
  return async (hookCtx: HookContext) => {
    const config = await pluginCtx.getConfig(hookCtx.tenantId);
    if (config.enabled === false) return;
    await handler(hookCtx, config);
  };
}

/**
 * 读取 manifest.json / manifest.json を読み込む
 *
 * 插件入口文件中的通用 manifest 加载方式。
 * プラグインエントリファイルでの汎用 manifest ロード方法。
 *
 * @param dir 插件目录 (使用 __dirname) / プラグインディレクトリ (__dirname を使用)
 */
export function loadManifest(dir: string): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(`${dir}/manifest.json`);
}
