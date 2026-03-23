// APIキーガードテスト / API密钥守卫测试
import { ApiKeyGuard } from './api-key.guard.js';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = { get: jest.fn() };
    guard = new ApiKeyGuard(configService as unknown as ConfigService);
  });

  const createMockContext = (headers: Record<string, string> = {}) => {
    const request = { headers, user: undefined as any };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      request,
    } as any;
  };

  // 有効なAPIキー / 有效的API密钥
  it('should allow request with valid API key', () => {
    configService.get.mockReturnValue('key1,key2,key3');
    const ctx = createMockContext({ 'x-api-key': 'key2', 'x-tenant-id': 'tenant-abc' });

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  // APIキー未指定で401 / 未指定API密钥返回401
  it('should throw UnauthorizedException when API key is missing', () => {
    const ctx = createMockContext({});

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx)).toThrow('API key required');
  });

  // 無効なAPIキーで401 / 无效API密钥返回401
  it('should throw UnauthorizedException for invalid API key', () => {
    configService.get.mockReturnValue('key1,key2');
    const ctx = createMockContext({ 'x-api-key': 'invalid-key' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx)).toThrow('Invalid API key');
  });

  // API_KEYS未設定で401 / 未配置API_KEYS返回401
  it('should throw UnauthorizedException when no API keys configured', () => {
    configService.get.mockReturnValue('');
    const ctx = createMockContext({ 'x-api-key': 'any-key' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  // ユーザーコンテキスト設定 / 设置用户上下文
  it('should set user context on request', () => {
    configService.get.mockReturnValue('valid-key');
    const ctx = createMockContext({
      'x-api-key': 'valid-key',
      'x-tenant-id': 'tenant-123',
    });

    guard.canActivate(ctx);

    const request = ctx.switchToHttp().getRequest();
    expect(request.user).toEqual({
      id: 'api-key-user',
      email: 'api@system',
      tenantId: 'tenant-123',
      role: 'operator',
      isApiKey: true,
    });
  });

  // テナントID未指定で401 / 未指定租户ID返回401
  it('should throw UnauthorizedException when tenant ID not provided', () => {
    configService.get.mockReturnValue('valid-key');
    const ctx = createMockContext({ 'x-api-key': 'valid-key' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
