/**
 * definePlugin — 插件工厂函数 / プラグインファクトリ関数
 *
 * 类型安全的插件定义快捷方法。
 * 型安全なプラグイン定義ショートカット。
 *
 * @example
 * ```ts
 * import { definePlugin, HOOK_EVENTS } from '@zelix/plugin-sdk';
 *
 * export default definePlugin({
 *   manifest: require('./manifest.json'),
 *   async install(ctx) {
 *     ctx.registerHook(HOOK_EVENTS.ORDER_SHIPPED, async (hookCtx) => {
 *       // hookCtx.payload is typed as OrderPayload
 *       const order = hookCtx.payload.order;
 *       ctx.logger.info({ orderNumber: order?.orderNumber }, 'Order shipped');
 *     });
 *   },
 * });
 * ```
 */

import type { PluginDefinition } from './types';

/**
 * 定义插件（类型推导 + 运行时校验）
 * プラグインを定義（型推論 + ランタイムバリデーション）
 *
 * @param definition 插件定义 / プラグイン定義
 * @returns 经过校验的插件定义 / バリデーション済みプラグイン定義
 */
export function definePlugin<TConfig = Record<string, unknown>>(
  definition: PluginDefinition<TConfig>,
): PluginDefinition<TConfig> {
  // 运行时校验 manifest / ランタイム manifest バリデーション
  const { manifest } = definition;

  if (!manifest) {
    throw new Error('[plugin-sdk] manifest is required / manifest は必須です');
  }
  if (!manifest.name || typeof manifest.name !== 'string') {
    throw new Error('[plugin-sdk] manifest.name is required / manifest.name は必須です');
  }
  if (!/^[a-z][a-z0-9-]*$/.test(manifest.name)) {
    throw new Error(
      `[plugin-sdk] manifest.name must be kebab-case: "${manifest.name}" / manifest.name は kebab-case であること`,
    );
  }
  if (!manifest.version || typeof manifest.version !== 'string') {
    throw new Error('[plugin-sdk] manifest.version is required / manifest.version は必須です');
  }
  if (!manifest.hooks || !Array.isArray(manifest.hooks)) {
    throw new Error('[plugin-sdk] manifest.hooks must be an array / manifest.hooks は配列であること');
  }
  if (!definition.install || typeof definition.install !== 'function') {
    throw new Error('[plugin-sdk] install function is required / install 関数は必須です');
  }

  return definition;
}
