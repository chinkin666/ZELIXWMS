// 取扱注意ラベルタイプコントローラ / 处理注意标签类型控制器
import { Controller, Get } from '@nestjs/common';
import { HandlingLabelTypesService } from './handling-label-types.service.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('api/handling-label-types')
@Public()
export class HandlingLabelTypesController {
  constructor(private readonly handlingLabelTypesService: HandlingLabelTypesService) {}

  // 取扱注意ラベルタイプ一覧取得 / 获取全部处理注意标签类型
  @Public()
  @Get()
  findAll() {
    return this.handlingLabelTypesService.findAll();
  }
}
