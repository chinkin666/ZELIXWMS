// キューコントローラ / 队列控制器
import { Controller, Get } from '@nestjs/common';
import { QueueService } from './queue.service.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/queue')
@RequireRole('admin', 'manager', 'operator')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  // キュー状態取得 / 获取队列状态
  @Get('status')
  getStatus() {
    return this.queueService.getQueueStatus();
  }
}
