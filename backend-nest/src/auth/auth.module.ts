// 認証モジュール / 认证模块
import { Module } from '@nestjs/common';
import { AuthController, PortalAuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { supabaseProvider } from '../common/providers/supabase.provider.js';

@Module({
  controllers: [AuthController, PortalAuthController],
  providers: [supabaseProvider, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
