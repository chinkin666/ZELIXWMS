// 梱包ルールモジュール / 包装规则模块
import { Module } from '@nestjs/common';
import { PackingRulesController } from './packing-rules.controller.js';
import { PackingRulesService } from './packing-rules.service.js';

@Module({
  controllers: [PackingRulesController],
  providers: [PackingRulesService],
  exports: [PackingRulesService],
})
export class PackingRulesModule {}
