// 楽天RSL連携モジュール / 乐天RSL集成模块
import { Module } from '@nestjs/common';
import { RslController } from './rsl.controller.js';
import { RslService } from './rsl.service.js';

@Module({
  controllers: [RslController],
  providers: [RslService],
  exports: [RslService],
})
export class RslModule {}
