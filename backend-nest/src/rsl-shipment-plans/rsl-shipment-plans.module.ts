// RSL出荷プランモジュール / RSL出货计划模块
import { Module } from '@nestjs/common';
import { RslShipmentPlansController } from './rsl-shipment-plans.controller.js';
import { RslShipmentPlansService } from './rsl-shipment-plans.service.js';

@Module({
  controllers: [RslShipmentPlansController],
  providers: [RslShipmentPlansService],
  exports: [RslShipmentPlansService],
})
export class RslShipmentPlansModule {}
