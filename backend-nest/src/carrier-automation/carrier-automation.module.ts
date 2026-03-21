// 配送業者自動化モジュール / 配送业者自动化模块
import { Module } from '@nestjs/common';
import { CarrierAutomationController } from './carrier-automation.controller.js';
import { CarrierAutomationService } from './carrier-automation.service.js';

@Module({
  controllers: [CarrierAutomationController],
  providers: [CarrierAutomationService],
  exports: [CarrierAutomationService],
})
export class CarrierAutomationModule {}
