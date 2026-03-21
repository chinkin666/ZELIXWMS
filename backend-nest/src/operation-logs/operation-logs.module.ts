// 操作ログモジュール / 操作日志模块
import { Module } from '@nestjs/common';
import { OperationLogsController } from './operation-logs.controller.js';
import { OperationLogsService } from './operation-logs.service.js';

@Module({
  controllers: [OperationLogsController],
  providers: [OperationLogsService],
  exports: [OperationLogsService],
})
export class OperationLogsModule {}
