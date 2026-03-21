// 出庫依頼モジュール / 出库请求模块
import { Module } from '@nestjs/common';
import { OutboundRequestsController } from './outbound-requests.controller.js';
import { OutboundRequestsService } from './outbound-requests.service.js';

@Module({
  controllers: [OutboundRequestsController],
  providers: [OutboundRequestsService],
  exports: [OutboundRequestsService],
})
export class OutboundRequestsModule {}
