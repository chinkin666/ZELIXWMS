// 入庫モジュール / 入库模块
import { Module } from '@nestjs/common';
import { InboundController } from './inbound.controller.js';
import { InboundService } from './inbound.service.js';

@Module({
  controllers: [InboundController],
  providers: [InboundService],
  exports: [InboundService],
})
export class InboundModule {}
