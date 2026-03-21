// ヘルスチェックコントローラ / 健康检查控制器
import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  // ヘルスチェック（認証不要）/ 健康检查（无需认证）
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      version: process.env.npm_package_version || '0.0.1',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}
