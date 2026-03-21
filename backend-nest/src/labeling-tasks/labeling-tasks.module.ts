// ラベリングタスクモジュール / 贴标任务模块
import { Module } from '@nestjs/common';
import { LabelingTasksController } from './labeling-tasks.controller.js';
import { LabelingTasksService } from './labeling-tasks.service.js';

@Module({
  controllers: [LabelingTasksController],
  providers: [LabelingTasksService],
  exports: [LabelingTasksService],
})
export class LabelingTasksModule {}
