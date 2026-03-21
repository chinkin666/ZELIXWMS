// キューサービス / 队列服务
import { Injectable } from '@nestjs/common';

@Injectable()
export class QueueService {
  // キュー状態取得 / 获取队列状态
  getQueueStatus() {
    return {
      available: false,
      message: 'Queue not configured in NestJS yet',
    };
  }
}
