/**
 * HookManager — Hook 注册与事件分发 / Hook 登録・イベント配信
 *
 * 扩展系统的核心事件总线。
 * 拡張システムのコアイベントバス。
 *
 * 设计原则 / 設計原則:
 * - 单个 handler 失败不阻止其他 handler / 個別 handler の失敗は他を阻止しない
 * - 按 priority 排序执行 / priority 順に実行
 * - async handler: fire-and-forget / sync handler: await 結果
 */

import { logger } from '@/lib/logger';
import type {
  HookEventName,
  HookHandler,
  HookHandlerFn,
  HookHandlerOptions,
  HookContext,
} from './types';

export class HookManager {
  /**
   * 事件 → 处理器列表（按 priority 排序）
   * イベント → ハンドラリスト（priority 順）
   */
  private handlers: Map<string, HookHandler[]> = new Map();

  /**
   * 注册 Hook 处理器 / Hook ハンドラを登録
   */
  register(
    event: HookEventName,
    name: string,
    handler: HookHandlerFn,
    options: HookHandlerOptions & { pluginName?: string } = {},
  ): void {
    const entry: HookHandler = {
      name,
      pluginName: options.pluginName,
      priority: options.priority ?? 50,
      async: options.async ?? true,
      handler,
    };

    const list = this.handlers.get(event);
    if (list) {
      list.push(entry);
      // 按 priority 升序排序 / priority 昇順ソート
      list.sort((a, b) => a.priority - b.priority);
    } else {
      this.handlers.set(event, [entry]);
    }

    logger.debug(
      { event, handlerName: name, priority: entry.priority },
      'Hook handler registered / Hook ハンドラ登録',
    );
  }

  /**
   * 按插件名批量注销 / プラグイン名で一括登録解除
   */
  unregisterByPlugin(pluginName: string): void {
    for (const [event, list] of this.handlers) {
      const filtered = list.filter((h) => h.pluginName !== pluginName);
      if (filtered.length > 0) {
        this.handlers.set(event, filtered);
      } else {
        this.handlers.delete(event);
      }
    }
    logger.debug({ pluginName }, 'Hooks unregistered for plugin / プラグインの Hook 登録解除');
  }

  /**
   * 按名称注销单个 handler / 名前で個別 handler を登録解除
   */
  unregister(event: HookEventName, name: string): void {
    const list = this.handlers.get(event);
    if (!list) return;

    const filtered = list.filter((h) => h.name !== name);
    if (filtered.length > 0) {
      this.handlers.set(event, filtered);
    } else {
      this.handlers.delete(event);
    }
  }

  /**
   * 发射事件，执行所有注册的 handlers
   * イベントを発行し、登録済みの全 handler を実行
   *
   * @returns 处理的 handler 数量 / 処理した handler 数
   */
  async emit(event: HookEventName, payload: Record<string, unknown>, tenantId?: string): Promise<number> {
    const list = this.handlers.get(event);
    if (!list || list.length === 0) return 0;

    const ctx: HookContext = {
      event,
      payload,
      tenantId,
      timestamp: new Date(),
    };

    let processed = 0;

    for (const h of list) {
      try {
        if (h.async) {
          // 异步处理，不等待结果 / 非同期処理、結果を待たない
          h.handler(ctx).catch((err) => {
            logger.error(
              { event, handlerName: h.name, err },
              'Async hook handler error / 非同期 Hook ハンドラエラー',
            );
          });
        } else {
          // 同步处理，等待结果 / 同期処理、結果を待つ
          await h.handler(ctx);
        }
        processed++;
      } catch (err) {
        // 单个 handler 失败不阻止其他 handler
        // 個別 handler の失敗は他を阻止しない
        logger.error(
          { event, handlerName: h.name, err },
          'Hook handler error / Hook ハンドラエラー',
        );
      }
    }

    return processed;
  }

  /**
   * 获取已注册的事件列表 / 登録済みイベント一覧を取得
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 获取某事件的所有 handlers 信息 / あるイベントの全 handler 情報を取得
   */
  getHandlers(event: string): Array<{
    name: string;
    pluginName?: string;
    priority: number;
    async: boolean;
  }> {
    const list = this.handlers.get(event);
    if (!list) return [];
    return list.map((h) => ({
      name: h.name,
      pluginName: h.pluginName,
      priority: h.priority,
      async: h.async,
    }));
  }

  /**
   * 获取所有已注册事件及其 handler 数量概要
   * 全登録済みイベントと handler 数のサマリを取得
   */
  getSummary(): Array<{ event: string; handlerCount: number }> {
    const result: Array<{ event: string; handlerCount: number }> = [];
    for (const [event, list] of this.handlers) {
      result.push({ event, handlerCount: list.length });
    }
    return result;
  }
}
