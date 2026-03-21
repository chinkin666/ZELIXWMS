// Amazon FBA連携モジュール / Amazon FBA集成模块
import { Module } from '@nestjs/common';
import { FbaController } from './fba.controller.js';
import { FbaService } from './fba.service.js';

@Module({
  controllers: [FbaController],
  providers: [FbaService],
  exports: [FbaService],
})
export class FbaModule {}
