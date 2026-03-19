/**
 * sagawa-express 插件测试 / sagawa-express プラグインテスト
 */

import { describe, it, expect, vi } from 'vitest';
import { createMockContext, createMockHookContext, HOOK_EVENTS } from '@zelix/plugin-sdk';

// Mock sagawaCsvService（依赖 productNameFormatter，测试环境下路径不同）
// sagawaCsvService をモック（productNameFormatter に依存、テスト環境ではパスが異なる）
vi.mock('../services/sagawaCsvService', () => ({
  generateCsvRows: vi.fn(() => []),
  generateCsvString: vi.fn(() => ''),
}));

import plugin from '../index';

describe('sagawa-express plugin', () => {
  it('should install without errors / エラーなくインストールできること', async () => {
    const ctx = createMockContext({
      models: { ShipmentOrder: {} },
    });
    await plugin.install(ctx);
    expect(ctx.registeredHooks.length).toBeGreaterThan(0);
    expect(ctx.registeredRouters.length).toBe(1);
  });

  it('should register hooks for order.shipped and order.confirmed', async () => {
    const ctx = createMockContext({
      models: { ShipmentOrder: {} },
    });
    await plugin.install(ctx);

    const events = ctx.registeredHooks.map((h) => h.event);
    expect(events).toContain('order.shipped');
    expect(events).toContain('order.confirmed');
  });

  it('should only handle sagawa carriers / 佐川のキャリアのみ処理すること', async () => {
    const ctx = createMockContext({
      models: { ShipmentOrder: {} },
    });
    await plugin.install(ctx);

    // 佐川 → 処理される
    const sagawaCtx = createMockHookContext(HOOK_EVENTS.ORDER_SHIPPED, {
      order: { _id: '1', orderNumber: 'SH-001', status: 'shipped', carrierId: '__builtin_sagawa__' },
    });
    await ctx.invokeHook(HOOK_EVENTS.ORDER_SHIPPED, sagawaCtx);
    expect(ctx.logger.calls.info.length).toBeGreaterThanOrEqual(1);

    ctx.logger.reset();

    // 日本郵便 → スキップ
    const jpCtx = createMockHookContext(HOOK_EVENTS.ORDER_SHIPPED, {
      order: { _id: '2', orderNumber: 'SH-002', status: 'shipped', carrierId: 'japanpost' },
    });
    await ctx.invokeHook(HOOK_EVENTS.ORDER_SHIPPED, jpCtx);
    expect(ctx.logger.calls.info).toHaveLength(0);
  });

  it('should pass health check / ヘルスチェックに合格すること', async () => {
    const result = await plugin.healthCheck!();
    expect(result.healthy).toBe(true);
  });
});
