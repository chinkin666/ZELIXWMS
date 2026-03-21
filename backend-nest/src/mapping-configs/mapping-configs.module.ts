// マッピング設定モジュール / 映射配置模块
import { Module } from '@nestjs/common';
import { MappingConfigsController } from './mapping-configs.controller.js';
import { MappingConfigsService } from './mapping-configs.service.js';

@Module({
  controllers: [MappingConfigsController],
  providers: [MappingConfigsService],
  exports: [MappingConfigsService],
})
export class MappingConfigsModule {}
