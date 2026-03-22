// 取扱注意ラベルタイプモジュール / 处理注意标签类型模块
import { Module } from '@nestjs/common';
import { HandlingLabelTypesController } from './handling-label-types.controller.js';
import { HandlingLabelTypesService } from './handling-label-types.service.js';

@Module({
  controllers: [HandlingLabelTypesController],
  providers: [HandlingLabelTypesService],
  exports: [HandlingLabelTypesService],
})
export class HandlingLabelTypesModule {}
