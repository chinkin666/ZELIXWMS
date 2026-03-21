// ウェーブモジュール / 波次模块
import { Module } from '@nestjs/common';
import { WavesController } from './waves.controller.js';
import { WavesService } from './waves.service.js';

@Module({
  controllers: [WavesController],
  providers: [WavesService],
  exports: [WavesService],
})
export class WavesModule {}
