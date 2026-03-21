// 異常報告モジュール / 异常报告模块
import { Module } from '@nestjs/common';
import { ExceptionsController } from './exceptions.controller.js';
import { ExceptionsService } from './exceptions.service.js';

@Module({
  controllers: [ExceptionsController],
  providers: [ExceptionsService],
  exports: [ExceptionsService],
})
export class ExceptionsModule {}
