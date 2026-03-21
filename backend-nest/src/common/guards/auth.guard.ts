// Supabase JWT 認証ガード / Supabase JWT认证守卫
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    // 開発環境: トークンなしでもdev userを注入 / 开发环境: 无token时注入dev用户
    if (!token && this.configService.get('NODE_ENV') === 'development') {
      request.user = {
        id: 'dev-admin',
        email: 'dev@zelix.local',
        tenantId: 'default',
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
