/**
 * inventory-alert 插件测试 / 在庫アラートプラグインテスト
 */

import { describe, it, expect } from 'vitest';
import { createMockContext, createMockHookContext, HOOK_EVENTS } from '@zelix/plugin-sdk';
import plugin from '../index';

describe('inventory-alert plugin', () => {
  it('should install without errors / エラーなくインストールできること', async () => {
    const ctx = createMockContext();
    await plugin.install(ctx);
    expect(ctx.registeredHooks.length).toBe(2);
    expect(ctx.registeredRouters.length).toBe(1);
  });

  it('should register hooks for inventory.changed and stock.released', async () => {
    const ctx = createMockContext();
    await plugin.install(ctx);

    const events = ctx.registeredHooks.map((h) => h.event);
    expect(events).toContain('inventory.changed');
    expect(events).toContain('stock.released');
  });

  it('should warn when stock below threshold / 閾値以下で警告すること', async () => {
    const ctx = createMockContext({ config: { threshold: 10, enabled: true } });
    await plugin.install(ctx);

    const hookCtx = createMockHookContext(HOOK_EVENTS.INVENTORY_CHANGED, {
      currentStock: 3,
      sku: 'SKU-LOW',
    });
    await ctx.invokeHook(HOOK_EVENTS.INVENTORY_CHANGED, hookCtx);

    const warns = ctx.logger.calls.warn;
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0].obj).toHaveProperty('sku', 'SKU-LOW');
  });

  it('should not warn when stock above threshold / 閾値以上では警告しないこと', async () => {
    const ctx = createMockContext({ config: { threshold: 5, enabled: true } });
    await plugin.install(ctx);

    const hookCtx = createMockHookContext(HOOK_EVENTS.INVENTORY_CHANGED, {
      currentStock: 20,
      sku: 'SKU-OK',
    });
    await ctx.invokeHook(HOOK_EVENTS.INVENTORY_CHANGED, hookCtx);

    expect(ctx.logger.calls.warn).toHaveLength(0);
  });

  it('should skip when disabled / 無効時はスキップすること', async () => {
    const ctx = createMockContext({ config: { threshold: 5, enabled: false } });
    await plugin.install(ctx);

    const hookCtx = createMockHookContext(HOOK_EVENTS.INVENTORY_CHANGED, {
      currentStock: 1,
      sku: 'SKU-SKIP',
    });
    await ctx.invokeHook(HOOK_EVENTS.INVENTORY_CHANGED, hookCtx);

    expect(ctx.logger.calls.warn).toHaveLength(0);
  });

  it('should check stock.released too / stock.released も検知すること', async () => {
    const ctx = createMockContext({ config: { threshold: 10, enabled: true } });
    await plugin.install(ctx);

    const hookCtx = createMockHookContext(HOOK_EVENTS.STOCK_RELEASED, {
      remainingStock: 2,
      sku: 'SKU-RELEASED',
    });
    await ctx.invokeHook(HOOK_EVENTS.STOCK_RELEASED, hookCtx);

    expect(ctx.logger.calls.warn.length).toBeGreaterThanOrEqual(1);
  });

  it('should pass health check / ヘルスチェックに合格すること', async () => {
    const result = await plugin.healthCheck!();
    expect(result.healthy).toBe(true);
  });
});
