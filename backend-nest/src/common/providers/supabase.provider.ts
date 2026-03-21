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
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required / ' +
        'SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY は必須です / ' +
        'SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 是必需的',
      );
    }
    return createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  },
};
