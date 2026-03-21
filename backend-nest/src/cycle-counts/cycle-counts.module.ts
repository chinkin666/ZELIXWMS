// 循環棚卸モジュール / 循环盘点模块
import { Module } from '@nestjs/common';
import { CycleCountsController } from './cycle-counts.controller.js';
import { CycleCountsService } from './cycle-counts.service.js';

@Module({
  controllers: [CycleCountsController],
  providers: [CycleCountsService],
  exports: [CycleCountsService],
})
export class CycleCountsModule {}
