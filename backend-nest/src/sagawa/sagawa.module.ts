// 佐川急便連携モジュール / 佐川急便集成模块
import { Module } from '@nestjs/common';
import { SagawaController } from './sagawa.controller.js';
import { SagawaService } from './sagawa.service.js';

@Module({
  controllers: [SagawaController],
  providers: [SagawaService],
  exports: [SagawaService],
})
export class SagawaModule {}
