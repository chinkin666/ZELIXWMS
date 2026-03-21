// オーダーグループモジュール / 订单分组模块
import { Module } from '@nestjs/common';
import { OrderGroupsController } from './order-groups.controller.js';
import { OrderGroupsService } from './order-groups.service.js';

@Module({
  controllers: [OrderGroupsController],
  providers: [OrderGroupsService],
  exports: [OrderGroupsService],
})
export class OrderGroupsModule {}
