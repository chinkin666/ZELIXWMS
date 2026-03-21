// ヘルスサービステスト / 健康服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service.js';
import { DRIZZLE } from '../database/database.module.js';

describe('HealthService', () => {
  let service: HealthService;
  let mockDb: { execute: jest.Mock };

  beforeEach(async () => {
    mockDb = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  describe('getFullHealth', () => {
    // DB接続成功時 / 数据库连接成功时
    it('should return ok status when database is connected', async () => {
      mockDb.execute.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.getFullHealth();

      expect(result.status).toBe('ok');
      expect(result.services.database.connected).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.memory.heapUsed).toBeGreaterThan(0);
      expect(result.memory.heapTotal).toBeGreaterThan(0);
      expect(result.memory.rss).toBeGreaterThan(0);
    });

    // DB接続失敗時 / 数据库连接失败时
    it('should return unhealthy status when database fails', async () => {
      mockDb.execute.mockRejectedValue(new Error('Connection refused'));

      const result = await service.getFullHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database.connected).toBe(false);
      expect(result.services.database.message).toBe('Database connection failed');
    });

    // Redis未設定 / Redis未配置
    it('should report redis as not configured', async () => {
      mockDb.execute.mockResolvedValue([]);

      const result = await service.getFullHealth();

      expect(result.services.redis.connected).toBe(false);
      expect(result.services.redis.message).toBe('Not configured');
    });
  });

  describe('getLiveness', () => {
    // 常にokを返す / 始终返回ok
    it('should always return ok status', () => {
      const result = service.getLiveness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getReadiness', () => {
    // DB接続成功時 / 数据库连接成功时
    it('should return ok when database is connected', async () => {
      mockDb.execute.mockResolvedValue([]);

      const result = await service.getReadiness();

      expect(result.status).toBe('ok');
      expect(result.services.database.connected).toBe(true);
    });

    // DB接続失敗時 / 数据库连接失败时
    it('should return unhealthy when database fails', async () => {
      mockDb.execute.mockRejectedValue(new Error('Timeout'));

      const result = await service.getReadiness();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database.connected).toBe(false);
    });
  });
});
