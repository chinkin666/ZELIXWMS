// セット商品モジュール / 组合商品模块
import { Module } from '@nestjs/common';
import { SetProductsController } from './set-products.controller.js';
import { SetProductsService } from './set-products.service.js';

@Module({
  controllers: [SetProductsController],
  providers: [SetProductsService],
  exports: [SetProductsService],
})
export class SetProductsModule {}
