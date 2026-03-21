// FBA出荷プランモジュール / FBA出货计划模块
import { Module } from '@nestjs/common';
import { FbaShipmentPlansController } from './fba-shipment-plans.controller.js';
import { FbaShipmentPlansService } from './fba-shipment-plans.service.js';

@Module({
  controllers: [FbaShipmentPlansController],
  providers: [FbaShipmentPlansService],
  exports: [FbaShipmentPlansService],
})
export class FbaShipmentPlansModule {}
