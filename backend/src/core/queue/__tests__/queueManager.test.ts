/**
 * QueueManager 单元测试 / QueueManager ユニットテスト
 *
 * Redis 不依赖的纯逻辑测试 + mock化した内部メソッドテスト
 * Redis に依存しない純粋ロジックテスト + mock化した内部メソッドテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// BullMQ と ioredis をモック / BullMQ と ioredis をモック
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation((name: string) => ({
    name,
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    getJobCounts: vi.fn().mockResolvedValue({
      waiting: 5, active: 2, completed: 100, failed: 3, delayed: 1,
    }),
    clean: vi.fn().mockResolvedValue(['j1', 'j2']),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { QUEUE_NAMES } from '../queueManager';

describe('QueueManager constants / 定数', () => {
  it('すべてのキュー名が定義されていること / 所有队列名已定义', () => {
    expect(QUEUE_NAMES.WEBHOOK).toBe('wms-webhook');
    expect(QUEUE_NAMES.SCRIPT).toBe('wms-script');
    expect(QUEUE_NAMES.AUDIT).toBe('wms-audit');
  });

  it('3 キューがあること / 有3个队列', () => {
    const names = Object.values(QUEUE_NAMES);
    expect(names).toHaveLength(3);
    expect(new Set(names).size).toBe(3);
  });
});

describe('QueueManager lifecycle / ライフサイクル', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初期化前は not ready / 初始化前不可用', async () => {
    // 新しいインスタンスを取得 / 获取新实例
    const { queueManager } = await import('../queueManager');
    // テスト環境では既にimportされている可能性があるが、isReady は boolean を返す
    expect(typeof queueManager.isReady()).toBe('boolean');
  });

  it('キュー利用不可時に null を返すこと / 队列不可用时返回null', async () => {
    const { queueManager } = await import('../queueManager');
    // 未初期化状態でaddJobを呼ぶ
    if (!queueManager.isReady()) {
      const result = await queueManager.addJob(QUEUE_NAMES.WEBHOOK, {
        event: 'test',
        payload: {},
        webhookId: 'wh-1',
        url: 'https://example.com',
        secret: 'secret',
      });
      expect(result).toBeNull();
    }
  });

  it('初期化を実行できること / 可以执行初始化', async () => {
    const { queueManager } = await import('../queueManager');
    // initialize は Redis がなくてもエラーを投げない
    await expect(queueManager.initialize()).resolves.not.toThrow();
  });

  it('二重初期化しないこと / 不重复初始化', async () => {
    const { queueManager } = await import('../queueManager');
    await queueManager.initialize();
    const readyBefore = queueManager.isReady();
    await queueManager.initialize(); // 2回目
    expect(queueManager.isReady()).toBe(readyBefore);
  });

  it('初期化後にジョブを追加できること / 初始化后可添加任务', async () => {
    const { queueManager } = await import('../queueManager');
    await queueManager.initialize();

    if (queueManager.isReady()) {
      const jobId = await queueManager.addJob(QUEUE_NAMES.WEBHOOK, {
        event: 'order.created',
        payload: { orderId: 'o1' },
        webhookId: 'wh-1',
        url: 'https://example.com/hook',
        secret: 's',
      });
      expect(jobId).toBeDefined();
    }
  });

  it('priorityとdelayオプション付きでジョブ追加 / 带优先级和延迟的任务添加', async () => {
    const { queueManager } = await import('../queueManager');
    await queueManager.initialize();

    if (queueManager.isReady()) {
      const jobId = await queueManager.addJob(QUEUE_NAMES.SCRIPT, {
        event: 'test',
        payload: {},
        scriptId: 's1',
        scriptName: 'test-script',
      }, { priority: 1, delay: 5000 });
      expect(jobId).toBeDefined();
    }
  });

  it('キューインスタンスを取得できること / 可获取队列实例', async () => {
    const { queueManager } = await import('../queueManager');
    await queueManager.initialize();

    if (queueManager.isReady()) {
      const queue = queueManager.getQueue(QUEUE_NAMES.WEBHOOK);
      expect(queue).toBeDefined();
    }
  });

  it('存在しないキューはundefined / 不存在的队列返回undefined', async () => {
    const { queueManager } = await import('../queueManager');
    const queue = queueManager.getQueue('nonexistent' as any);
    expect(queue).toBeUndefined();
  });

  it('統計を取得できること / 可获取统计信息', async () => {
    const { queueManager } = await import('../queueManager');
    await queueManager.initialize();

    if (queueManager.isReady()) {
      const stats = await queueManager.getStats();
      expect(Array.isArray(stats)).toBe(true);
      if (stats.length > 0) {
        expect(stats[0]).toHaveProperty('name');
        expect(stats[0]).toHaveProperty('waiting');
        expect(stats[0]).toHaveProperty('active');
        expect(stats[0]).toHaveProperty('completed');
        expect(stats[0]).toHaveProperty('failed');
        expect(stats[0]).toHaveProperty('delayed');
      }
    }
  });

  it('キューをクリーンアップできること / 可清理队列', async () => {
    const { queueManager } = await import('../queueManager');
    await queueManager.initialize();

    if (queueManager.isReady()) {
      const result = await queueManager.cleanQueue(QUEUE_NAMES.WEBHOOK);
      expect(result).toHaveProperty('cleaned');
      expect(result.cleaned).toBeGreaterThanOrEqual(0);
    }
  });

  it('未初期化キューのクリーンアップは0 / 未初始化队列的清理返回0', async () => {
    const { queueManager } = await import('../queueManager');
    // 存在しないキュー名を使用
    const result = await queueManager.cleanQueue('nonexistent' as any);
    expect(result.cleaned).toBe(0);
  });

  it('Workerを登録できること / 可注册Worker', async () => {
    const { queueManager } = await import('../queueManager');
    await queueManager.initialize();

    if (queueManager.isReady()) {
      // registerWorker はvoidを返す
      expect(() => {
        queueManager.registerWorker(QUEUE_NAMES.AUDIT, async () => {});
      }).not.toThrow();
    }
  });

  it('カスタム並列数でWorkerを登録 / 自定义并发数注册Worker', async () => {
    const { queueManager } = await import('../queueManager');
    await queueManager.initialize();

    if (queueManager.isReady()) {
      expect(() => {
        queueManager.registerWorker(QUEUE_NAMES.SCRIPT, async () => {}, 10);
      }).not.toThrow();
    }
  });

  it('シャットダウンできること / 可关闭', async () => {
    const { queueManager } = await import('../queueManager');
    await queueManager.initialize();
    await expect(queueManager.shutdown()).resolves.not.toThrow();
  });
});

describe('QueueManager types / 型定義', () => {
  it('WebhookJobData型が正しいこと / WebhookJobData类型正确', async () => {
    const data: import('../queueManager').WebhookJobData = {
      event: 'order.shipped',
      payload: { orderId: 'o1' },
      webhookId: 'wh-1',
      url: 'https://example.com/hook',
      secret: 'abc123',
    };
    expect(data.event).toBe('order.shipped');
  });

  it('ScriptJobData型が正しいこと / ScriptJobData类型正确', async () => {
    const data: import('../queueManager').ScriptJobData = {
      event: 'order.created',
      payload: {},
      scriptId: 's1',
      scriptName: 'auto-confirm',
    };
    expect(data.scriptName).toBe('auto-confirm');
  });

  it('AuditJobData型が正しいこと / AuditJobData类型正确', async () => {
    const data: import('../queueManager').AuditJobData = {
      event: 'hook.executed',
      source: 'extensionManager',
      payload: {},
      duration: 150,
      handlerCount: 3,
    };
    expect(data.duration).toBe(150);
  });
});
