// 印刷テンプレートモジュール / 打印模板模块
import { Module } from '@nestjs/common';
import { PrintTemplatesController } from './print-templates.controller.js';
import { PrintTemplatesService } from './print-templates.service.js';

@Module({
  controllers: [PrintTemplatesController],
  providers: [PrintTemplatesService],
  exports: [PrintTemplatesService],
})
export class PrintTemplatesModule {}
