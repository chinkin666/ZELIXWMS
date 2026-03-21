// フォームテンプレートモジュール / 表单模板模块
import { Module } from '@nestjs/common';
import { FormTemplatesController } from './form-templates.controller.js';
import { FormTemplatesService } from './form-templates.service.js';

@Module({
  controllers: [FormTemplatesController],
  providers: [FormTemplatesService],
  exports: [FormTemplatesService],
})
export class FormTemplatesModule {}
