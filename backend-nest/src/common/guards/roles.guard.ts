// ロールベースアクセス制御ガード / 基于角色的访问控制守卫
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/require-role.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // メタデータから必要なロールを取得 / 从元数据获取所需角色
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // ロール指定なしの場合はアクセス許可 / 未指定角色时允许访问
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // リクエストからユーザー情報を取得（AuthGuardで設定済み）/ 从请求获取用户信息（由AuthGuard设置）
    const { user } = context.switchToHttp().getRequest();
    if (!user?.role) {
      throw new ForbiddenException('Role required / ロールが必要です / 需要角色');
    }

    // ユーザーのロールが必要なロールに含まれているか確認 / 确认用户角色是否在所需角色中
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Role '${user.role}' is not authorized. Required: ${requiredRoles.join(', ')} / ` +
        `ロール '${user.role}' は権限がありません。必要: ${requiredRoles.join(', ')} / ` +
        `角色 '${user.role}' 无权限。需要: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
