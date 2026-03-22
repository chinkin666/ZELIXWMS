// セット組み作業モジュール / 组装作业管理模块
import { Module } from '@nestjs/common';
import { AssemblyOrdersController } from './assembly-orders.controller.js';
import { AssemblyOrdersService } from './assembly-orders.service.js';

@Module({
  controllers: [AssemblyOrdersController],
  providers: [AssemblyOrdersService],
  exports: [AssemblyOrdersService],
})
export class AssemblyOrdersModule {}
