/**
 * 插件测试工具 / プラグインテストユーティリティ
 *
 * 提供模拟上下文和辅助函数，用于单元测试插件。
 * プラグインのユニットテスト用にモックコンテキストとヘルパー関数を提供する。
 *
 * @example
 * ```ts
 * import { createMockContext, createMockHookContext } from '@zelix/plugin-sdk/testing';
 * import plugin from '../index';
 *
 * describe('my-plugin', () => {
 *   it('should register hooks on install', async () => {
 *     const ctx = createMockContext();
 *     await plugin.install(ctx);
 *     expect(ctx.registeredHooks).toHaveLength(2);
 *   });
 *
 *   it('should handle order.shipped', async () => {
 *     const ctx = createMockContext({ config: { apiKey: 'test' } });
 *     await plugin.install(ctx);
 *
 *     const hookCtx = createMockHookContext('order.shipped', {
 *       orderId: '123',
 *       order: { _id: '123', orderNumber: 'SH-001', status: 'shipped' },
 *     });
 *
 *     await ctx.invokeHook('order.shipped', hookCtx);
 *     expect(ctx.logger.calls.info).toHaveLength(1);
 *   });
 * });
 * ```
 */

import { Router } from 'express';
import type {
  PluginContext,
  PluginLogger,
  HookEventName,
  HookHandlerFn,
  HookHandlerOptions,
  HookContext,
  ModelProxy,
} from './types';

// ─── Mock Logger / モックロガー ───

export interface MockLoggerCalls {
  info: Array<{ obj: Record<string, unknown>; msg?: string }>;
  warn: Array<{ obj: Record<string, unknown>; msg?: string }>;
  error: Array<{ obj: Record<string, unknown>; msg?: string }>;
  debug: Array<{ obj: Record<string, unknown>; msg?: string }>;
}

export interface MockLogger extends PluginLogger {
  /** 记录的所有日志调用 / 記録されたすべてのログ呼び出し */
  calls: MockLoggerCalls;
  /** 清除日志记录 / ログ記録をクリア */
  reset(): void;
}

function createMockLogger(): MockLogger {
  const calls: MockLoggerCalls = { info: [], warn: [], error: [], debug: [] };

  return {
    calls,
    info(obj, msg?) { calls.info.push({ obj, msg }); },
    warn(obj, msg?) { calls.warn.push({ obj, msg }); },
    error(obj, msg?) { calls.error.push({ obj, msg }); },
    debug(obj, msg?) { calls.debug.push({ obj, msg }); },
    reset() {
      calls.info = [];
      calls.warn = [];
      calls.error = [];
      calls.debug = [];
    },
  };
}

// ─── Mock Model Proxy / モックモデルプロキシ ───

function createMockModelProxy(models?: Record<string, unknown>): ModelProxy {
  const registry = models ?? {};
  return {
    getModel(name: string) {
      const model = registry[name];
      if (!model) {
        throw new Error(`[mock] Model "${name}" not registered / モデル "${name}" は登録されていません`);
      }
      return model;
    },
    getAvailableModels() {
      return Object.keys(registry);
    },
  };
}

// ─── Registered Hook 记录 / 登録済み Hook レコード ───

export interface RegisteredHook {
  event: HookEventName;
  handler: HookHandlerFn;
  options?: HookHandlerOptions;
}

// ─── Mock Context / モックコンテキスト ───

export interface MockContextOptions<TConfig = Record<string, unknown>> {
  /** 模拟配置 / モック設定 */
  config?: TConfig;
  /** 按租户的配置覆盖 / テナントごとの設定オーバーライド */
  tenantConfigs?: Record<string, TConfig>;
  /** 模拟模型 / モックモデル */
  models?: Record<string, unknown>;
}

export interface MockPluginContext<TConfig = Record<string, unknown>> extends PluginContext<TConfig> {
  /** 注册的所有 Hook / 登録されたすべての Hook */
  registeredHooks: RegisteredHook[];
  /** 注册的 API Router / 登録された API Router */
  registeredRouters: Router[];
  /** 类型安全的 Mock Logger / 型安全なモックロガー */
  logger: MockLogger;

  /**
   * 手动触发已注册的 Hook（测试用）
   * 登録済み Hook を手動トリガー（テスト用）
   */
  invokeHook(event: HookEventName, hookCtx: HookContext): Promise<void>;

  /**
   * 获取指定事件的所有已注册 handler / 指定イベントの登録済み handler をすべて取得
   */
  getHandlersForEvent(event: HookEventName): RegisteredHook[];
}

/**
 * 创建模拟插件上下文 / モックプラグインコンテキストを作成
 *
 * @param options 模拟选项 / モックオプション
 */
export function createMockContext<TConfig = Record<string, unknown>>(
  options: MockContextOptions<TConfig> = {},
): MockPluginContext<TConfig> {
  const registeredHooks: RegisteredHook[] = [];
  const registeredRouters: Router[] = [];
  const mockLogger = createMockLogger();
  const defaultConfig = (options.config ?? {}) as TConfig;
  const tenantConfigs = options.tenantConfigs ?? {};

  const ctx: MockPluginContext<TConfig> = {
    registeredHooks,
    registeredRouters,
    logger: mockLogger,
    models: createMockModelProxy(options.models),
    sdkVersion: '1.0.0',

    registerHook(event, handler, hookOptions?) {
      registeredHooks.push({ event, handler: handler as HookHandlerFn, options: hookOptions });
    },

    registerAPI(router) {
      registeredRouters.push(router);
    },

    async getConfig(tenantId?) {
      if (tenantId && tenantConfigs[tenantId]) {
        return tenantConfigs[tenantId];
      }
      return defaultConfig;
    },

    async invokeHook(event, hookCtx) {
      const handlers = registeredHooks.filter((h) => h.event === event);
      // 按优先级排序 / 優先度でソート
      handlers.sort((a, b) => (a.options?.priority ?? 50) - (b.options?.priority ?? 50));

      for (const h of handlers) {
        await h.handler(hookCtx);
      }
    },

    getHandlersForEvent(event) {
      return registeredHooks.filter((h) => h.event === event);
    },
  };

  return ctx;
}

// ─── Mock Hook Context / モック Hook コンテキスト ───

/**
 * 创建模拟 Hook 上下文 / モック Hook コンテキストを作成
 *
 * @param event 事件名 / イベント名
 * @param payload 载荷 / ペイロード
 * @param tenantId 租户ID / テナントID
 */
export function createMockHookContext<T = Record<string, unknown>>(
  event: HookEventName,
  payload: T,
  tenantId?: string,
): HookContext<T> {
  return {
    event,
    payload,
    tenantId,
    timestamp: new Date(),
  };
}
