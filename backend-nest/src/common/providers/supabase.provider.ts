// Supabaseクライアントプロバイダー / Supabase客户端提供者
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

// Supabase DI トークン / Supabase DI令牌
export const SUPABASE = Symbol('SUPABASE');

// Supabase Service Role クライアント（管理者権限）/ Supabase Service Role客户端（管理员权限）
export const supabaseProvider = {
  provide: SUPABASE,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const url = config.get<string>('SUPABASE_URL');
    const serviceKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) {
      // 開発環境ではSupabase未設定でも起動可能（auth機能は無効化）
      // 开发环境下未配置Supabase也可启动（auth功能将不可用）
      console.warn(
        '[SUPABASE] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — Supabase auth disabled / ' +
        'Supabase認証無効 / Supabase认证已禁用',
      );
      return null;
    }
    return createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  },
};
