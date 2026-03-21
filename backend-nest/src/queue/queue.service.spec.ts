// キューサービスのテスト / 队列服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QUEUE_NAMES } from './queue.constants';

// モックキュー / 模拟队列
const createMockQueue = () => ({
  getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0 }),
  add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
  clean: jest.fn().mockResolvedValue([]),
});

describe('QueueService', () => {
  let service: QueueService;
  const mockQueues: Record<string, ReturnType<typeof createMockQueue>> = {};

  beforeEach(async () => {
    // 全キューのモック作成 / 创建所有队列的模拟
    for (const name of Object.values(QUEUE_NAMES)) {
      mockQueues[name] = createMockQueue();
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        ...Object.values(QUEUE_NAMES).map((name) => ({
          provide: getQueueToken(name),
          useValue: mockQueues[name],
        })),
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should be defined / サービスが定義されていること / 服务应被定义', () => {
    expect(service).toBeDefined();
  });

  // === getQueueStatus テスト / getQueueStatus 测试 ===
  describe('getQueueStatus', () => {
    // キューステータスを返す / 返回队列状态
    it('should return available status with queue counts / 利用可能なステータスを返す / 返回可用状态', async () => {
      const result = await service.getQueueStatus();

      expect(result.available).toBe(true);
      expect(result.queues).toHaveLength(Object.values(QUEUE_NAMES).length);
      expect(result.queues[0]).toHaveProperty('name');
    });

    // 接続エラー時のハンドリング / 连接错误时的处理
    it('should handle connection errors gracefully / 接続エラーを適切に処理する / 优雅处理连接错误', async () => {
      mockQueues[QUEUE_NAMES.WEBHOOK].getJobCounts.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.getQueueStatus();

      expect(result.available).toBe(true);
      const webhookStatus = result.queues.find((q: any) => q.name === QUEUE_NAMES.WEBHOOK);
      expect(webhookStatus).toHaveProperty('error', 'Unable to connect');
    });
  });

  // === addJob テスト / addJob 测试 ===
  describe('addJob', () => {
    it('should add a job to the specified queue / 指定キューにジョブを追加する / 向指定队列添加任务', async () => {
      const result = await service.addJob(QUEUE_NAMES.WEBHOOK, 'test-job', { url: 'http://example.com' });

      expect(result).toEqual({ id: 'test-job-id' });
      expect(mockQueues[QUEUE_NAMES.WEBHOOK].add).toHaveBeenCalledWith('test-job', { url: 'http://example.com' }, undefined);
    });

    it('should throw for unknown queue / 不明なキューでエラーを投げる / 未知队列时抛出错误', async () => {
      await expect(service.addJob('nonexistent', 'test', {})).rejects.toThrow('Queue nonexistent not found');
    });
  });

  // === cleanQueue テスト / cleanQueue 测试 ===
  describe('cleanQueue', () => {
    it('should clean completed and failed jobs / 完了・失敗ジョブをクリーンする / 清理已完成和失败的任务', async () => {
      const result = await service.cleanQueue(QUEUE_NAMES.AUDIT);

      expect(result).toEqual({ cleaned: true });
      expect(mockQueues[QUEUE_NAMES.AUDIT].clean).toHaveBeenCalledTimes(2);
    });
  });
});
