// セットオーダーモジュール / 套装订单模块
import { Module } from '@nestjs/common';
import { SetOrdersController } from './set-orders.controller.js';
import { SetOrdersService } from './set-orders.service.js';

@Module({
  controllers: [SetOrdersController],
  providers: [SetOrdersService],
  exports: [SetOrdersService],
})
export class SetOrdersModule {}
