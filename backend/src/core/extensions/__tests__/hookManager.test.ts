/**
 * HookManager 单元测试 / HookManager ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HookManager } from '../hookManager';
import type { HookEventName, HookContext } from '../types';

describe('HookManager', () => {
  let hm: HookManager;

  beforeEach(() => {
    hm = new HookManager();
  });

  describe('register / 登録', () => {
    it('should register a handler / ハンドラを登録できること', () => {
      hm.register('order.created' as HookEventName, 'test', async () => {});
      expect(hm.getRegisteredEvents()).toContain('order.created');
      expect(hm.getHandlers('order.created')).toHaveLength(1);
    });

    it('should register multiple handlers for same event / 同一イベントに複数ハンドラ登録', () => {
      hm.register('order.created' as HookEventName, 'h1', async () => {});
      hm.register('order.created' as HookEventName, 'h2', async () => {});
      expect(hm.getHandlers('order.created')).toHaveLength(2);
    });

    it('should sort by priority / 優先度でソートすること', () => {
      hm.register('order.created' as HookEventName, 'low', async () => {}, { priority: 90 });
      hm.register('order.created' as HookEventName, 'high', async () => {}, { priority: 10 });
      hm.register('order.created' as HookEventName, 'mid', async () => {}, { priority: 50 });

      const handlers = hm.getHandlers('order.created');
      expect(handlers.map((h) => h.name)).toEqual(['high', 'mid', 'low']);
    });
  });

  describe('emit / 発行', () => {
    it('should call all handlers for event / イベントの全ハンドラを呼ぶこと', async () => {
      const calls: string[] = [];
      hm.register('order.created' as HookEventName, 'h1', async () => { calls.push('h1'); }, { async: false });
      hm.register('order.created' as HookEventName, 'h2', async () => { calls.push('h2'); }, { async: false });

      const count = await hm.emit('order.created' as HookEventName, {});
      expect(count).toBe(2);
      expect(calls).toEqual(['h1', 'h2']);
    });

    it('should return 0 for unregistered events / 未登録イベントは0を返すこと', async () => {
      const count = await hm.emit('order.shipped' as HookEventName, {});
      expect(count).toBe(0);
    });

    it('should not stop on handler error / ハンドラエラーで停止しないこと', async () => {
      const calls: string[] = [];
      hm.register('order.created' as HookEventName, 'fail', async () => { throw new Error('boom'); }, { async: false });
      hm.register('order.created' as HookEventName, 'ok', async () => { calls.push('ok'); }, { async: false });

      const count = await hm.emit('order.created' as HookEventName, {});
      // fail は error catch されるが count は加算される（try 内で processed++ してからエラー）
      // ok は正常実行
      expect(calls).toContain('ok');
    });

    it('should pass context to handlers / ハンドラにコンテキストを渡すこと', async () => {
      let receivedCtx: HookContext | null = null;
      hm.register('order.created' as HookEventName, 'h1', async (ctx) => {
        receivedCtx = ctx;
      }, { async: false });

      await hm.emit('order.created' as HookEventName, { orderId: '123' }, 'tenant-a');

      expect(receivedCtx).not.toBeNull();
      expect(receivedCtx!.event).toBe('order.created');
      expect(receivedCtx!.payload).toEqual({ orderId: '123' });
      expect(receivedCtx!.tenantId).toBe('tenant-a');
      expect(receivedCtx!.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('unregister / 登録解除', () => {
    it('should unregister by name / 名前で登録解除すること', () => {
      hm.register('order.created' as HookEventName, 'h1', async () => {});
      hm.register('order.created' as HookEventName, 'h2', async () => {});

      hm.unregister('order.created' as HookEventName, 'h1');
      expect(hm.getHandlers('order.created')).toHaveLength(1);
      expect(hm.getHandlers('order.created')[0].name).toBe('h2');
    });

    it('should unregister by plugin / プラグイン名で一括登録解除すること', () => {
      hm.register('order.created' as HookEventName, 'h1', async () => {}, { pluginName: 'pluginA' });
      hm.register('order.created' as HookEventName, 'h2', async () => {}, { pluginName: 'pluginB' });
      hm.register('order.shipped' as HookEventName, 'h3', async () => {}, { pluginName: 'pluginA' });

      hm.unregisterByPlugin('pluginA');
      expect(hm.getHandlers('order.created')).toHaveLength(1);
      expect(hm.getHandlers('order.shipped')).toHaveLength(0);
    });
  });

  describe('getSummary / サマリ', () => {
    it('should return event summary / イベントサマリを返すこと', () => {
      hm.register('order.created' as HookEventName, 'h1', async () => {});
      hm.register('order.created' as HookEventName, 'h2', async () => {});
      hm.register('order.shipped' as HookEventName, 'h3', async () => {});

      const summary = hm.getSummary();
      expect(summary).toHaveLength(2);
      expect(summary.find((s) => s.event === 'order.created')?.handlerCount).toBe(2);
      expect(summary.find((s) => s.event === 'order.shipped')?.handlerCount).toBe(1);
    });
  });
});
