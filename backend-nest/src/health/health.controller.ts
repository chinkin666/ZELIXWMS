// ヘルスチェック / 健康检查
import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { HealthService } from './health.service.js';

@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  check() {
    return this.healthService.getFullHealth();
  }

  @Public()
  @Get('liveness')
  liveness() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('readiness')
  readiness() {
    return this.healthService.getReadiness();
  }
}
