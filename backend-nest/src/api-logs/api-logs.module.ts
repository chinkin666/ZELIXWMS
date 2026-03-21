// APIログモジュール / API日志模块
import { Module } from '@nestjs/common';
import { ApiLogsController } from './api-logs.controller.js';
import { ApiLogsService } from './api-logs.service.js';

@Module({
  controllers: [ApiLogsController],
  providers: [ApiLogsService],
  exports: [ApiLogsService],
})
export class ApiLogsModule {}
