// クライアントポータルモジュール / 客户门户模块
import { Module } from '@nestjs/common';
import { ClientPortalController } from './client-portal.controller.js';
import { ClientPortalService } from './client-portal.service.js';

@Module({
  controllers: [ClientPortalController],
  providers: [ClientPortalService],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}
