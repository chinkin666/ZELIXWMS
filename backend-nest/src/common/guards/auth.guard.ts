// JWT 認証ガード（ローカル検証 + Supabaseフォールバック）
// JWT认证守卫（本地验证 + Supabase回退）
import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { verify, type JwtPayload } from 'jsonwebtoken';

// Supabase JWTペイロードの型定義 / Supabase JWT载荷类型定义
interface SupabaseJwtPayload extends JwtPayload {
  sub: string;
  email?: string;
  user_metadata?: {
    tenant_id?: string;
    role?: string;
    client_id?: string;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

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
      // ポータルパスはclientロール、それ以外はadmin / 门户路径用client角色，其他用admin
      const isPortalPath = request.url?.startsWith('/api/portal');
      request.user = {
        id: '00000000-0000-0000-0000-000000000099',
        email: isPortalPath ? 'dev-client@zelix.local' : 'dev@zelix.local',
        tenantId: '00000000-0000-0000-0000-000000000001',
        role: isPortalPath ? 'client' : 'admin',
        clientId: isPortalPath ? '00000000-0000-0000-0000-000000000010' : null,
      };
      return true;
    }

    if (!token) throw new UnauthorizedException('Token required');

    // ローカルJWT検証を優先、失敗時はSupabase APIにフォールバック
    // 优先本地JWT验证，失败时回退到Supabase API
    const jwtSecret = this.configService.get<string>('SUPABASE_JWT_SECRET');

    if (jwtSecret) {
      try {
        const decoded = verify(token, jwtSecret) as SupabaseJwtPayload;

        const tenantId = decoded.user_metadata?.tenant_id;
        if (!tenantId) {
          throw new UnauthorizedException('Tenant ID missing from JWT claims / JWTにテナントIDがありません / JWT中缺少租户ID');
        }

        request.user = {
          id: decoded.sub,
          email: decoded.email,
          tenantId,
          role: decoded.user_metadata?.role || 'viewer',
          clientId: decoded.user_metadata?.client_id || null,
        };
        return true;
      } catch (err) {
        // JWT検証失敗 → Supabase APIフォールバック / JWT验证失败 → 回退到Supabase API
        this.logger.warn('Local JWT verification failed, falling back to Supabase API / ローカルJWT検証失敗、Supabase APIにフォールバック / 本地JWT验证失败，回退到Supabase API');
      }
    }

    // Supabase APIフォールバック / Supabase API回退
    try {
      const supabase = createClient(
        this.configService.get('SUPABASE_URL')!,
        this.configService.get('SUPABASE_ANON_KEY')!,
      );
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) throw new UnauthorizedException('Invalid token');

      // テナントIDが未設定の場合は認証拒否（回退値なし）
      // 租户ID未设置时拒绝认证（无回退值）
      const tenantId = data.user.user_metadata?.tenant_id;
      if (!tenantId) {
        throw new UnauthorizedException('Tenant ID missing from JWT claims / JWTにテナントIDがありません / JWT中缺少租户ID');
      }

      request.user = {
        id: data.user.id,
        email: data.user.email,
        tenantId,
        role: data.user.user_metadata?.role || 'viewer',
        clientId: data.user.user_metadata?.client_id || null,
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
