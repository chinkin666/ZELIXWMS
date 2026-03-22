// 西濃運輸連携モジュール / 西浓运输集成模块
import { Module } from '@nestjs/common';
import { SeinoController } from './seino.controller.js';
import { SeinoService } from './seino.service.js';

@Module({
  controllers: [SeinoController],
  providers: [SeinoService],
  exports: [SeinoService],
})
export class SeinoModule {}
