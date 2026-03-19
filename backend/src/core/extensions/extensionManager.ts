/**
 * ExtensionManager — 统一扩展管理入口 / 統一拡張管理エントリ
 *
 * Phase 1: HookManager
 * Phase 2: WebhookDispatcher
 * Phase 3: PluginManager
 * Phase 4: ScriptRunner
 * Phase 5: CustomFields, FeatureFlags
 * Phase 9: BullMQ 队列化（Webhook/Script/Audit 走队列，Redis 不可用时降级为 fire-and-forget）
 *
 * 所有 Engine 操作完成后通过此类发射事件。
 * すべての Engine 操作完了後、このクラスを通じてイベントを発行する。
 */

import { logger } from '@/lib/logger';
import { HookManager } from './hookManager';
import { PluginManager } from './pluginManager';
import { ScriptRunner } from './scriptRunner';
import { WebhookDispatcher } from './webhookDispatcher';
import { CustomFieldService } from './customFieldService';
import { FeatureFlagService } from './featureFlagService';
import { EventLog } from '@/models/eventLog';
import { queueManager, QUEUE_NAMES } from '@/core/queue';
import type { WebhookJobData, ScriptJobData, AuditJobData } from '@/core/queue';
import type { HookEventName, EmitOptions } from './types';

class ExtensionManager {
  private hookManager: HookManager;
  private pluginManager: PluginManager;
  private scriptRunner: ScriptRunner;
  private webhookDispatcher: WebhookDispatcher;
  private customFieldService: CustomFieldService;
  private featureFlagService: FeatureFlagService;
  private initialized = false;

  constructor() {
    this.hookManager = new HookManager();
    this.pluginManager = new PluginManager(this.hookManager);
    this.scriptRunner = new ScriptRunner();
    this.webhookDispatcher = new WebhookDispatcher();
    this.customFieldService = new CustomFieldService();
    this.featureFlagService = new FeatureFlagService();
  }

  /**
   * 初始化扩展系统（服务启动时调用）
   * 拡張システムの初期化（サーバー起動時に呼び出す）
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 加载插件 / プラグインをロード
    await this.pluginManager.loadPlugins();

    this.initialized = true;
    logger.info('Extension system initialized / 拡張システム初期化完了');
  }

  /**
   * 统一事件分发入口 / 統一イベント配信エントリ
   *
   * 所有核心 Engine 操作完成后调用此方法。
   * すべてのコア Engine 操作完了後にこのメソッドを呼び出す。
   *
   * 处理流程 / 処理フロー:
   * 1. HookManager → 同步执行注册的 Hook 处理函数
   * 2. ScriptRunner → 队列化执行（Redis 不可用时降级为 fire-and-forget）
   * 3. WebhookDispatcher → 队列化投递（Redis 不可用时降级为 fire-and-forget）
   * 4. EventLog → 队列化写入（Redis 不可用时降级为直接写入）
   */
  async emit(
    event: HookEventName,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ): Promise<void> {
    const startTime = Date.now();
    const tenantId = options?.tenantId;
    const useQueue = queueManager.isReady();

    try {
      // 1. Hook handlers（插件 + 内置处理）— 始终同步执行
      // 1. Hook handlers（プラグイン + 組み込み処理）— 常に同期実行
      const handlerCount = await this.hookManager.emit(event, payload, tenantId);

      // 1.5 通知系统 — 异步分发（不阻塞核心流程）
      // 1.5 通知システム — 非同期配信（コアフローをブロックしない）
      import('@/services/notificationService').then(({ sendNotificationsForEvent }) => {
        sendNotificationsForEvent(event, payload, tenantId).catch((err) => {
          logger.error({ event, err }, 'Notification dispatch error / 通知配信エラー');
        });
      }).catch(() => {});

      // 2. ScriptRunner — 队列化 or fire-and-forget
      // 2. ScriptRunner — キュー化 or fire-and-forget
      if (useQueue) {
        queueManager.addJob<ScriptJobData>(QUEUE_NAMES.SCRIPT, {
          event,
          payload,
          scriptId: '',
          scriptName: '',
        }).catch((err) => {
          logger.error({ event, err }, 'Failed to enqueue script job / スクリプトジョブのキュー追加失敗');
        });
      } else {
        this.scriptRunner.executeForEvent(event, payload).catch((err) => {
          logger.error({ event, err }, 'Script execution error / スクリプト実行エラー');
        });
      }

      // 3. Webhook 投递 — 队列化 or fire-and-forget
      // 3. Webhook 配信 — キュー化 or fire-and-forget
      if (useQueue) {
        queueManager.addJob<WebhookJobData>(QUEUE_NAMES.WEBHOOK, {
          event,
          payload,
          webhookId: '',
          url: '',
          secret: '',
        }).catch((err) => {
          logger.error({ event, err }, 'Failed to enqueue webhook job / Webhook ジョブのキュー追加失敗');
        });
      } else {
        this.webhookDispatcher.dispatch(event, payload).catch((err) => {
          logger.error({ event, err }, 'Webhook dispatch error / Webhook 配信エラー');
        });
      }

      const duration = Date.now() - startTime;

      // 4. 审计日志 — 队列化 or 直接写入
      // 4. 監査ログ — キュー化 or 直接書き込み
      if (useQueue) {
        queueManager.addJob<AuditJobData>(QUEUE_NAMES.AUDIT, {
          event,
          source: 'engine',
          payload: this.summarizePayload(payload),
          tenantId,
          duration,
          handlerCount,
        }).catch((err) => {
          logger.error({ err }, 'Failed to enqueue audit job / 監査ジョブのキュー追加失敗');
        });
      } else {
        this.logEvent(event, 'engine', payload, duration, tenantId, handlerCount).catch((err) => {
          logger.error({ err }, 'Failed to write event log / イベントログ書き込み失敗');
        });
      }

      if (handlerCount > 0) {
        logger.debug(
          { event, handlerCount, duration, queued: useQueue },
          'Event emitted / イベント発行',
        );
      }
    } catch (err) {
      // 扩展层错误不影响核心 / 拡張レイヤーのエラーはコアに影響しない
      const duration = Date.now() - startTime;
      logger.error({ event, err }, 'Extension emit error / 拡張 emit エラー');

      if (useQueue) {
        queueManager.addJob<AuditJobData>(QUEUE_NAMES.AUDIT, {
          event,
          source: 'engine',
          payload: this.summarizePayload(payload),
          tenantId,
          duration,
          handlerCount: 0,
          error: (err as Error).message,
        }).catch(() => {});
      } else {
        this.logEvent(event, 'engine', payload, duration, tenantId, 0, err as Error).catch(() => {});
      }
    }
  }

  /**
   * 获取 HookManager 实例 / HookManager インスタンスを取得
   */
  getHookManager(): HookManager {
    return this.hookManager;
  }

  /**
   * 获取 WebhookDispatcher 实例 / WebhookDispatcher インスタンスを取得
   */
  getWebhookDispatcher(): WebhookDispatcher {
    return this.webhookDispatcher;
  }

  /**
   * 获取 PluginManager 实例 / PluginManager インスタンスを取得
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  /**
   * 获取 ScriptRunner 实例 / ScriptRunner インスタンスを取得
   */
  getScriptRunner(): ScriptRunner {
    return this.scriptRunner;
  }

  /**
   * 获取 CustomFieldService 实例 / CustomFieldService インスタンスを取得
   */
  getCustomFieldService(): CustomFieldService {
    return this.customFieldService;
  }

  /**
   * 获取 FeatureFlagService 实例 / FeatureFlagService インスタンスを取得
   */
  getFeatureFlagService(): FeatureFlagService {
    return this.featureFlagService;
  }

  /**
   * 写入事件日志（降级直接写入）/ イベントログを書き込む（降級直接書き込み）
   */
  private async logEvent(
    event: string,
    source: string,
    payload: Record<string, unknown>,
    duration: number,
    tenantId?: string,
    handlerCount?: number,
    error?: Error,
  ): Promise<void> {
    await EventLog.create({
      event,
      source,
      tenantId,
      status: error ? 'error' : 'processed',
      error: error?.message,
      duration,
      handlerCount: handlerCount ?? 0,
      // payload 可能很大，只存摘要 / payload は大きい可能性があるため要約のみ保存
      payload: this.summarizePayload(payload),
    });
  }

  /**
   * 压缩 payload，避免存储过大数据
   * payload を圧縮し、過大データの保存を避ける
   */
  private summarizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const summary: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value && typeof value === 'object' && '_id' in (value as Record<string, unknown>)) {
        // 对象有 _id 时只保留 _id / _id を持つオブジェクトは _id のみ保持
        const obj = value as Record<string, unknown>;
        summary[key] = {
          _id: obj._id,
          ...(obj.orderNumber ? { orderNumber: obj.orderNumber } : {}),
          ...(obj.sku ? { sku: obj.sku } : {}),
        };
      } else if (Array.isArray(value)) {
        summary[key] = `[Array(${value.length})]`;
      } else {
        summary[key] = value;
      }
    }
    return summary;
  }
}

// 单例导出 / シングルトンエクスポート
export const extensionManager = new ExtensionManager();
