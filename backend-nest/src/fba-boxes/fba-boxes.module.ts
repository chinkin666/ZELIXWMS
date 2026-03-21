// FBAボックスモジュール / FBA箱子模块
import { Module } from '@nestjs/common';
import { FbaBoxesController } from './fba-boxes.controller.js';
import { FbaBoxesService } from './fba-boxes.service.js';

@Module({
  controllers: [FbaBoxesController],
  providers: [FbaBoxesService],
  exports: [FbaBoxesService],
})
export class FbaBoxesModule {}
