// 認証モジュール / 认证模块
import { Module } from '@nestjs/common';
import { AuthController, PortalAuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  controllers: [AuthController, PortalAuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
