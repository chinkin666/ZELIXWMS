// キューサービスのテスト / 队列服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';

describe('QueueService', () => {
  let service: QueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueueService],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should be defined / サービスが定義されていること / 服务应被定义', () => {
    expect(service).toBeDefined();
  });

  // === getQueueStatus テスト / getQueueStatus 测试 ===
  describe('getQueueStatus', () => {
    // 未設定のキューステータスを返す / 返回未配置的队列状态
    it('should return unavailable status / 利用不可のステータスを返す / 返回不可用状态', () => {
      const result = service.getQueueStatus();

      expect(result.available).toBe(false);
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
    });

    // available が false であること / available 应为 false
    it('should have available as false / availableがfalseであること / available应为false', () => {
      const result = service.getQueueStatus();

      expect(result).toEqual({
        available: false,
        message: 'Queue not configured in NestJS yet',
      });
    });
  });
});
