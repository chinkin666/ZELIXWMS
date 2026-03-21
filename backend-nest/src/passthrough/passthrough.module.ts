// パススルーモジュール / 直通模块
import { Module } from '@nestjs/common';
import { PassthroughController } from './passthrough.controller.js';
import { PassthroughService } from './passthrough.service.js';

@Module({
  controllers: [PassthroughController],
  providers: [PassthroughService],
  exports: [PassthroughService],
})
export class PassthroughModule {}
