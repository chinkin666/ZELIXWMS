// 在庫区分モジュール / 库存分类模块
import { Module } from '@nestjs/common';
import { InventoryCategoriesController } from './inventory-categories.controller.js';
import { InventoryCategoriesService } from './inventory-categories.service.js';

@Module({
  controllers: [InventoryCategoriesController],
  providers: [InventoryCategoriesService],
  exports: [InventoryCategoriesService],
})
export class InventoryCategoriesModule {}
