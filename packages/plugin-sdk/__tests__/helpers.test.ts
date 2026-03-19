/**
 * 辅助函数单元测试 / ヘルパー関数ユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
  forCarrier,
  withConfig,
  guardEnabled,
  createMockHookContext,
  HOOK_EVENTS,
} from '../src/index';

describe('forCarrier', () => {
  it('should pass through matching carrier (string) / 一致するキャリア文字列を通すこと', async () => {
    const calls: string[] = [];
    const handler = forCarrier('sagawa', async (ctx) => {
      calls.push((ctx.payload as any).order?.orderNumber);
    });

    const hookCtx = createMockHookContext(HOOK_EVENTS.ORDER_SHIPPED, {
      order: { _id: '1', orderNumber: 'SH-001', status: 'shipped', carrierId: '__builtin_sagawa__' },
    });
    await handler(hookCtx);
    expect(calls).toEqual(['SH-001']);
  });

  it('should skip non-matching carrier / 一致しないキャリアをスキップすること', async () => {
    const calls: string[] = [];
    const handler = forCarrier('sagawa', async () => { calls.push('called'); });

    const hookCtx = createMockHookContext(HOOK_EVENTS.ORDER_SHIPPED, {
      order: { _id: '1', orderNumber: 'SH-001', status: 'shipped', carrierId: 'yamato' },
    });
    await handler(hookCtx);
    expect(calls).toHaveLength(0);
  });

  it('should match carrier array / キャリア配列でマッチすること', async () => {
    const calls: string[] = [];
    const handler = forCarrier(['sagawa', 'yamato'], async () => { calls.push('called'); });

    const hookCtx = createMockHookContext(HOOK_EVENTS.ORDER_SHIPPED, {
      order: { _id: '1', orderNumber: 'SH-001', status: 'shipped', carrierId: 'yamato-b2' },
    });
    await handler(hookCtx);
    expect(calls).toEqual(['called']);
  });

  it('should match carrier regex / キャリア正規表現でマッチすること', async () => {
    const calls: string[] = [];
    const handler = forCarrier(/sagawa|佐川/, async () => { calls.push('called'); });

    const hookCtx = createMockHookContext(HOOK_EVENTS.ORDER_SHIPPED, {
      order: { _id: '1', orderNumber: 'SH-001', status: 'shipped', carrierId: '佐川急便' },
    });
    await handler(hookCtx);
    expect(calls).toEqual(['called']);
  });

  it('should skip if no order or carrierId / order または carrierId がない場合スキップすること', async () => {
    const calls: string[] = [];
    const handler = forCarrier('sagawa', async () => { calls.push('called'); });

    await handler(createMockHookContext(HOOK_EVENTS.ORDER_SHIPPED, {}));
    await handler(createMockHookContext(HOOK_EVENTS.ORDER_SHIPPED, {
      order: { _id: '1', orderNumber: 'SH-001', status: 'shipped' },
    }));
    expect(calls).toHaveLength(0);
  });
});

describe('withConfig', () => {
  it('should inject config into handler / handler に設定を注入すること', async () => {
    const mockCtx = {
      getConfig: async () => ({ threshold: 10, prefix: 'test' }),
    };

    let receivedConfig: any = null;
    const handler = withConfig(mockCtx, async (_hookCtx, config) => {
      receivedConfig = config;
    });

    await handler(createMockHookContext(HOOK_EVENTS.INVENTORY_CHANGED, {}));
    expect(receivedConfig).toEqual({ threshold: 10, prefix: 'test' });
  });

  it('should pass tenantId to getConfig / tenantId を getConfig に渡すこと', async () => {
    let receivedTenantId: string | undefined;
    const mockCtx = {
      getConfig: async (tenantId?: string) => {
        receivedTenantId = tenantId;
        return {};
      },
    };

    const handler = withConfig(mockCtx, async () => {});
    await handler(createMockHookContext(HOOK_EVENTS.ORDER_CREATED, {}, 'tenant-abc'));
    expect(receivedTenantId).toBe('tenant-abc');
  });
});

describe('guardEnabled', () => {
  it('should execute when enabled / 有効時に実行すること', async () => {
    const calls: string[] = [];
    const mockCtx = { getConfig: async () => ({ enabled: true }) };

    const handler = guardEnabled(mockCtx, async () => { calls.push('executed'); });
    await handler(createMockHookContext(HOOK_EVENTS.ORDER_CREATED, {}));
    expect(calls).toEqual(['executed']);
  });

  it('should skip when disabled / 無効時にスキップすること', async () => {
    const calls: string[] = [];
    const mockCtx = { getConfig: async () => ({ enabled: false }) };

    const handler = guardEnabled(mockCtx, async () => { calls.push('executed'); });
    await handler(createMockHookContext(HOOK_EVENTS.ORDER_CREATED, {}));
    expect(calls).toHaveLength(0);
  });

  it('should execute when enabled is undefined (default true) / enabled 未定義時は実行すること', async () => {
    const calls: string[] = [];
    const mockCtx = { getConfig: async () => ({}) };

    const handler = guardEnabled(mockCtx, async () => { calls.push('executed'); });
    await handler(createMockHookContext(HOOK_EVENTS.ORDER_CREATED, {}));
    expect(calls).toEqual(['executed']);
  });

  it('should inject config into handler / handler に設定を注入すること', async () => {
    let receivedConfig: any = null;
    const mockCtx = { getConfig: async () => ({ enabled: true, apiKey: 'secret' }) };

    const handler = guardEnabled(mockCtx, async (_hookCtx, config) => {
      receivedConfig = config;
    });
    await handler(createMockHookContext(HOOK_EVENTS.ORDER_CREATED, {}));
    expect(receivedConfig).toEqual({ enabled: true, apiKey: 'secret' });
  });
});
