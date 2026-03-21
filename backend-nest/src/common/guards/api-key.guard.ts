// API キー認証ガード / API密钥认证守卫
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    const validApiKeys = (this.configService.get<string>('API_KEYS') || '').split(',').filter(Boolean);
    if (validApiKeys.length === 0 || !validApiKeys.includes(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    // API key ユーザーコンテキスト / API密钥用户上下文
    request.user = {
      id: 'api-key-user',
      email: 'api@system',
      tenantId: request.headers['x-tenant-id'] || 'default',
      role: 'operator',
      isApiKey: true,
    };

    return true;
  }
}
