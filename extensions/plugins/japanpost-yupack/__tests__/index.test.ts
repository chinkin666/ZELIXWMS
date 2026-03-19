/**
 * japanpost-yupack 插件测试 / japanpost-yupack プラグインテスト
 */

import { describe, it, expect } from 'vitest';
import { createMockContext, createMockHookContext, HOOK_EVENTS } from '@zelix/plugin-sdk';
import plugin from '../index';

describe('japanpost-yupack plugin', () => {
  it('should install without errors / エラーなくインストールできること', async () => {
    const ctx = createMockContext({
      models: { ShipmentOrder: {} },
    });
    await plugin.install(ctx);
    expect(ctx.registeredHooks.length).toBeGreaterThan(0);
    expect(ctx.registeredRouters.length).toBe(1);
  });

  it('should register hooks for order.shipped and order.confirmed / order.shipped と order.confirmed の Hook を登録すること', async () => {
    const ctx = createMockContext({
      models: { ShipmentOrder: {} },
    });
    await plugin.install(ctx);

    const events = ctx.registeredHooks.map((h) => h.event);
    expect(events).toContain('order.shipped');
    expect(events).toContain('order.confirmed');
  });

  it('should only handle japanpost carriers / 日本郵便のキャリアのみ処理すること', async () => {
    const ctx = createMockContext({
      models: { ShipmentOrder: {} },
    });
    await plugin.install(ctx);

    // 日本郵便のキャリアでは処理される / 日本邮政的运营商会被处理
    const jpHookCtx = createMockHookContext(HOOK_EVENTS.ORDER_SHIPPED, {
      order: { _id: '1', orderNumber: 'SH-001', status: 'shipped', carrierId: '__builtin_japanpost__' },
    });
    await ctx.invokeHook(HOOK_EVENTS.ORDER_SHIPPED, jpHookCtx);
    expect(ctx.logger.calls.info.length).toBeGreaterThanOrEqual(1);

    ctx.logger.reset();

    // ヤマトのキャリアではスキップ / 雅玛多的运营商会被跳过
    const yamatoHookCtx = createMockHookContext(HOOK_EVENTS.ORDER_SHIPPED, {
      order: { _id: '2', orderNumber: 'SH-002', status: 'shipped', carrierId: 'yamato' },
    });
    await ctx.invokeHook(HOOK_EVENTS.ORDER_SHIPPED, yamatoHookCtx);
    expect(ctx.logger.calls.info).toHaveLength(0);
  });

  it('should pass health check / ヘルスチェックに合格すること', async () => {
    const result = await plugin.healthCheck!();
    expect(result.healthy).toBe(true);
  });
});
