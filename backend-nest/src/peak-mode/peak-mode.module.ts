// ピークモードモジュール / 高峰模式模块
import { Module } from '@nestjs/common';
import { PeakModeController } from './peak-mode.controller.js';
import { PeakModeService } from './peak-mode.service.js';

@Module({
  controllers: [PeakModeController],
  providers: [PeakModeService],
  exports: [PeakModeService],
})
export class PeakModeModule {}
