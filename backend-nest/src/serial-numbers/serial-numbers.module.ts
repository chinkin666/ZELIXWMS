// シリアル番号モジュール / 序列号模块
import { Module } from '@nestjs/common';
import { SerialNumbersController } from './serial-numbers.controller.js';
import { SerialNumbersService } from './serial-numbers.service.js';

@Module({
  controllers: [SerialNumbersController],
  providers: [SerialNumbersService],
  exports: [SerialNumbersService],
})
export class SerialNumbersModule {}
