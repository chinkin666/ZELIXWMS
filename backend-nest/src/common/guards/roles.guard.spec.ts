// ロールガードテスト / 角色守卫测试
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard / ロールガード / 角色守卫', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createContext = (role?: string) => ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  });

  // ロール未指定はデフォルト拒否 / 未指定角色时默认拒绝
  it('ロール指定なしでアクセスを拒否する / 无角色要求时拒绝访问（デフォルト拒否）', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(() => guard.canActivate(createContext('viewer') as any)).toThrow(ForbiddenException);
  });

  // 空配列もデフォルト拒否 / 空数组也默认拒绝
  it('空ロール配列でアクセスを拒否する / 空角色数组时拒绝访问', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    expect(() => guard.canActivate(createContext('viewer') as any)).toThrow(ForbiddenException);
  });

  // 正しいロールでアクセス許可 / 正确角色允许访问
  it('正しいロールでアクセスを許可する / 正确角色允许访问', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'manager']);
    expect(guard.canActivate(createContext('admin') as any)).toBe(true);
  });

  // 不正なロールで拒否 / 错误角色拒绝
  it('不正なロールでアクセスを拒否する / 错误角色拒绝访问', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(() => guard.canActivate(createContext('viewer') as any)).toThrow(ForbiddenException);
  });

  // ユーザーなしで拒否 / 无用户拒绝
  it('ユーザーがない場合アクセスを拒否する / 无用户时拒绝访问', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(() => guard.canActivate(createContext() as any)).toThrow(ForbiddenException);
  });
});
