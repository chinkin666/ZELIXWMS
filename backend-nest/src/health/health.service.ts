import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module.js';
import { sql } from 'drizzle-orm';

@Injectable()
export class HealthService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 完全ヘルスチェック / 完整健康检查
  async getFullHealth() {
    const dbHealth = await this.checkDatabase();
    const memoryUsage = process.memoryUsage();

    return {
      status: dbHealth.connected ? 'ok' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbHealth,
        redis: { connected: false, message: 'Not configured' },
      },
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
    };
  }

  // 生存確認 / 存活确认
  getLiveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // 準備確認 / 就绪确认
  async getReadiness() {
    const dbHealth = await this.checkDatabase();
    return {
      status: dbHealth.connected ? 'ok' : 'unhealthy',
      services: { database: dbHealth },
    };
  }

  private async checkDatabase() {
    try {
      await this.db.execute(sql`SELECT 1`);
      return { connected: true };
    } catch {
      return { connected: false, message: 'Database connection failed' };
    }
  }
}
