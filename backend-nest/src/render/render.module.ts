// レンダリングモジュール / 渲染模块
import { Module } from '@nestjs/common';
import { RenderController } from './render.controller.js';
import { RenderService } from './render.service.js';

@Module({
  controllers: [RenderController],
  providers: [RenderService],
  exports: [RenderService],
})
export class RenderModule {}
