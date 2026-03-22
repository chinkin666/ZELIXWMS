// 日本郵便連携モジュール / 日本邮便集成模块
import { Module } from '@nestjs/common';
import { JapanPostController } from './japan-post.controller.js';
import { JapanPostService } from './japan-post.service.js';

@Module({
  controllers: [JapanPostController],
  providers: [JapanPostService],
  exports: [JapanPostService],
})
export class JapanPostModule {}
