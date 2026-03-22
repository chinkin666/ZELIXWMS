// ギフト設定モジュール / 礼品设置管理模块
import { Module } from '@nestjs/common';
import { GiftOptionsController } from './gift-options.controller.js';
import { GiftOptionsService } from './gift-options.service.js';

@Module({
  controllers: [GiftOptionsController],
  providers: [GiftOptionsService],
  exports: [GiftOptionsService],
})
export class GiftOptionsModule {}
