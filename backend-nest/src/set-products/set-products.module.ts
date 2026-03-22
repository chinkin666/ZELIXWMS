// セット商品モジュール / 组合商品模块
import { Module } from '@nestjs/common';
import { SetProductsController } from './set-products.controller.js';
import { SetProductsService } from './set-products.service.js';
import { SetOrdersModule } from '../set-orders/set-orders.module.js';

@Module({
  imports: [SetOrdersModule],
  controllers: [SetProductsController],
  providers: [SetProductsService],
  exports: [SetProductsService],
})
export class SetProductsModule {}
