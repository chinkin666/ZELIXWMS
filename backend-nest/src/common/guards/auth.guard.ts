// Supabase JWT 認証ガード / Supabase JWT认证守卫
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 公開ルートはスキップ / 公开路由跳过认证
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    // 開発環境: トークンなし or dev-token でdev userを注入
    // 开发环境: 无token 或 dev-token 时注入dev用户
    const isDev = this.configService.get('NODE_ENV') === 'development';
    if (isDev && (!token || token.startsWith('dev-token-'))) {
      request.user = {
        id: '00000000-0000-0000-0000-000000000099',
        email: 'dev@zelix.local',
        tenantId: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
      };
      return true;
    }

    if (!token) throw new UnauthorizedException('Token required');

    try {
      const supabase = createClient(
        this.configService.get('SUPABASE_URL')!,
        this.configService.get('SUPABASE_ANON_KEY')!,
      );
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) throw new UnauthorizedException('Invalid token');

      request.user = {
        id: data.user.id,
        email: data.user.email,
        tenantId: data.user.user_metadata?.tenant_id || 'default',
        role: data.user.user_metadata?.role || 'viewer',
      };
      return true;
    } catch {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractToken(request: any): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
