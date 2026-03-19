/**
 * 测试工具单元测试 / テストユーティリティのユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
  createMockContext,
  createMockHookContext,
  HOOK_EVENTS,
  definePlugin,
} from '../src/index';

describe('createMockContext', () => {
  it('should create context with empty defaults / デフォルト空のコンテキストを作成すること', () => {
    const ctx = createMockContext();
    expect(ctx.registeredHooks).toHaveLength(0);
    expect(ctx.registeredRouters).toHaveLength(0);
    expect(ctx.sdkVersion).toBe('1.0.0');
  });

  it('should register hooks / Hook を登録できること', () => {
    const ctx = createMockContext();
    ctx.registerHook(HOOK_EVENTS.ORDER_CREATED, async () => {});
    ctx.registerHook(HOOK_EVENTS.ORDER_SHIPPED, async () => {}, { priority: 10 });

    expect(ctx.registeredHooks).toHaveLength(2);
    expect(ctx.registeredHooks[1].options?.priority).toBe(10);
  });

  it('should return config / 設定を返すこと', async () => {
    const ctx = createMockContext({ config: { threshold: 10 } });
    const config = await ctx.getConfig();
    expect(config).toEqual({ threshold: 10 });
  });

  it('should return tenant-specific config / テナント別設定を返すこと', async () => {
    const ctx = createMockContext({
      config: { threshold: 5 },
      tenantConfigs: {
        'tenant-a': { threshold: 20 },
      },
    });

    expect(await ctx.getConfig()).toEqual({ threshold: 5 });
    expect(await ctx.getConfig('tenant-a')).toEqual({ threshold: 20 });
    expect(await ctx.getConfig('tenant-b')).toEqual({ threshold: 5 });
  });

  it('should invoke hooks by event / イベントで Hook を呼び出すこと', async () => {
    const ctx = createMockContext();
    const calls: string[] = [];

    ctx.registerHook(HOOK_EVENTS.ORDER_CREATED, async () => { calls.push('a'); }, { priority: 50 });
    ctx.registerHook(HOOK_EVENTS.ORDER_CREATED, async () => { calls.push('b'); }, { priority: 10 });
    ctx.registerHook(HOOK_EVENTS.ORDER_SHIPPED, async () => { calls.push('c'); });

    const hookCtx = createMockHookContext(HOOK_EVENTS.ORDER_CREATED, { orderId: '1' });
    await ctx.invokeHook(HOOK_EVENTS.ORDER_CREATED, hookCtx);

    // 按优先级排序：b(10) 先于 a(50) / 優先度順: b(10) が a(50) より先
    expect(calls).toEqual(['b', 'a']);
  });

  it('should getHandlersForEvent / イベントの handler を取得すること', () => {
    const ctx = createMockContext();
    ctx.registerHook(HOOK_EVENTS.ORDER_CREATED, async () => {});
    ctx.registerHook(HOOK_EVENTS.ORDER_SHIPPED, async () => {});
    ctx.registerHook(HOOK_EVENTS.ORDER_CREATED, async () => {});

    expect(ctx.getHandlersForEvent(HOOK_EVENTS.ORDER_CREATED)).toHaveLength(2);
    expect(ctx.getHandlersForEvent(HOOK_EVENTS.ORDER_SHIPPED)).toHaveLength(1);
  });

  it('should track logger calls / ロガー呼び出しを追跡すること', () => {
    const ctx = createMockContext();
    ctx.logger.info({ key: 'val' }, 'test message');
    ctx.logger.warn({ w: 1 });
    ctx.logger.error({ e: 2 }, 'error');

    expect(ctx.logger.calls.info).toHaveLength(1);
    expect(ctx.logger.calls.info[0]).toEqual({ obj: { key: 'val' }, msg: 'test message' });
    expect(ctx.logger.calls.warn).toHaveLength(1);
    expect(ctx.logger.calls.error).toHaveLength(1);

    ctx.logger.reset();
    expect(ctx.logger.calls.info).toHaveLength(0);
  });

  it('should work with mock models / モックモデルが動作すること', () => {
    const mockShipmentOrder = { find: () => [] };
    const ctx = createMockContext({ models: { ShipmentOrder: mockShipmentOrder } });

    expect(ctx.models.getModel('ShipmentOrder')).toBe(mockShipmentOrder);
    expect(ctx.models.getAvailableModels()).toEqual(['ShipmentOrder']);
  });

  it('should throw for unregistered models / 未登録モデルでエラーになること', () => {
    const ctx = createMockContext();
    expect(() => ctx.models.getModel('Unknown')).toThrow('not registered');
  });
});

describe('createMockHookContext', () => {
  it('should create hook context / Hook コンテキストを作成すること', () => {
    const ctx = createMockHookContext(HOOK_EVENTS.ORDER_SHIPPED, {
      orderId: '123',
      order: { _id: '123', orderNumber: 'SH-001', status: 'shipped' },
    });

    expect(ctx.event).toBe('order.shipped');
    expect(ctx.payload.orderId).toBe('123');
    expect(ctx.timestamp).toBeInstanceOf(Date);
    expect(ctx.tenantId).toBeUndefined();
  });

  it('should accept tenantId / tenantId を受け付けること', () => {
    const ctx = createMockHookContext(HOOK_EVENTS.ORDER_CREATED, {}, 'tenant-x');
    expect(ctx.tenantId).toBe('tenant-x');
  });
});

describe('integration: definePlugin + mockContext', () => {
  it('should install a plugin and invoke hooks / プラグインをインストールし Hook を呼び出すこと', async () => {
    const plugin = definePlugin({
      manifest: {
        name: 'test-integration',
        version: '1.0.0',
        description: 'Test',
        author: 'Test',
        hooks: [HOOK_EVENTS.ORDER_CREATED],
        permissions: [],
      },
      async install(ctx) {
        ctx.registerHook(HOOK_EVENTS.ORDER_CREATED, async (hookCtx) => {
          ctx.logger.info(
            { orderId: (hookCtx.payload as any).orderId },
            'Order created',
          );
        });
      },
    });

    const ctx = createMockContext();
    await plugin.install(ctx);

    expect(ctx.registeredHooks).toHaveLength(1);

    const hookCtx = createMockHookContext(HOOK_EVENTS.ORDER_CREATED, { orderId: 'order-1' });
    await ctx.invokeHook(HOOK_EVENTS.ORDER_CREATED, hookCtx);

    expect(ctx.logger.calls.info).toHaveLength(1);
    expect(ctx.logger.calls.info[0].obj).toEqual({ orderId: 'order-1' });
  });
});
