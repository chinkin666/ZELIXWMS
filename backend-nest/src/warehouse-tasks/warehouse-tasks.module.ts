// 倉庫タスクモジュール / 仓库任务模块
import { Module } from '@nestjs/common';
import { WarehouseTasksController } from './warehouse-tasks.controller.js';
import { WarehouseTasksService } from './warehouse-tasks.service.js';

@Module({
  controllers: [WarehouseTasksController],
  providers: [WarehouseTasksService],
  exports: [WarehouseTasksService],
})
export class WarehouseTasksModule {}
