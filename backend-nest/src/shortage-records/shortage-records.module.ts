// 欠品管理モジュール / 缺货记录管理模块
import { Module } from '@nestjs/common';
import { ShortageRecordsController } from './shortage-records.controller.js';
import { ShortageRecordsService } from './shortage-records.service.js';

@Module({
  controllers: [ShortageRecordsController],
  providers: [ShortageRecordsService],
  exports: [ShortageRecordsService],
})
export class ShortageRecordsModule {}
