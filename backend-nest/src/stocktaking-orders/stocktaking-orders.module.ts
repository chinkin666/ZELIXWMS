// 棚卸オーダーモジュール / 盘点订单模块
import { Module } from '@nestjs/common';
import { StocktakingOrdersController } from './stocktaking-orders.controller.js';
import { StocktakingOrdersService } from './stocktaking-orders.service.js';

@Module({
  controllers: [StocktakingOrdersController],
  providers: [StocktakingOrdersService],
  exports: [StocktakingOrdersService],
})
export class StocktakingOrdersModule {}
