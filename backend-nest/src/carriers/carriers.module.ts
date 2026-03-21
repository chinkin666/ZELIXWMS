// 配送業者モジュール / 配送业者模块
import { Module } from '@nestjs/common';
import { CarriersController } from './carriers.controller.js';
import { CarriersService } from './carriers.service.js';

@Module({
  controllers: [CarriersController],
  providers: [CarriersService],
  exports: [CarriersService],
})
export class CarriersModule {}
