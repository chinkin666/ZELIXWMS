/**
 * @zelix/plugin-sdk — ZELIX WMS 插件开发工具包 / プラグイン開発キット
 *
 * 提供类型安全的插件定义、事件处理和测试支持。
 * 型安全なプラグイン定義・イベント処理・テストサポートを提供。
 *
 * @example
 * ```ts
 * import { definePlugin, HOOK_EVENTS } from '@zelix/plugin-sdk';
 * import type { PluginContext, OrderPayload } from '@zelix/plugin-sdk';
 *
 * export default definePlugin({
 *   manifest: require('./manifest.json'),
 *   async install(ctx) {
 *     ctx.registerHook(HOOK_EVENTS.ORDER_SHIPPED, async (hookCtx) => {
 *       ctx.logger.info({ order: hookCtx.payload.order }, 'Shipped!');
 *     });
 *   },
 * });
 * ```
 *
 * @packageDocumentation
 */

// 核心工厂 / コアファクトリ
export { definePlugin } from './definePlugin';

// 辅助函数 / ヘルパー関数
export { forCarrier, withConfig, guardEnabled, loadManifest } from './helpers';

// 类型 + 常量 / 型 + 定数
export { HOOK_EVENTS } from './types';
export type {
  // 核心类型 / コア型
  HookEventName,
  HookContext,
  HookHandlerFn,
  HookHandlerOptions,
  PluginManifest,
  PluginDefinition,
  PluginContext,
  PluginInfo,
  PluginLogger,
  ModelProxy,
  ConfigFieldType,
  ConfigFieldDefinition,

  // 事件载荷类型 / イベントペイロード型
  HookEventPayloadMap,
  OrderPayload,
  InventoryPayload,
  StockReservedPayload,
  StockReleasedPayload,
  WavePayload,
  TaskPayload,
  InboundPayload,
  ReturnPayload,
  StocktakingPayload,
} from './types';

// 测试工具（单独导入路径：@zelix/plugin-sdk/testing）
// テストツール（個別インポートパス：@zelix/plugin-sdk/testing）
// 也从主入口重新导出，方便使用
// メインエントリからも再エクスポート、利便性のため
export {
  createMockContext,
  createMockHookContext,
  type MockPluginContext,
  type MockContextOptions,
  type MockLogger,
  type MockLoggerCalls,
  type RegisteredHook,
} from './testing';
