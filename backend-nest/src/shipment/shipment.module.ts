// 出荷注文モジュール / 出货订单模块
import { Module } from '@nestjs/common';
import { ShipmentController } from './shipment.controller.js';
import { ShipmentService } from './shipment.service.js';

@Module({
  controllers: [ShipmentController],
  providers: [ShipmentService],
  exports: [ShipmentService],
})
export class ShipmentModule {}
