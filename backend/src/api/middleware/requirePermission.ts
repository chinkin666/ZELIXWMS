import type { Request, Response, NextFunction } from 'express';
import { Role } from '@/models/role';

/**
 * 権限チェックミドルウェア / 权限校验中间件
 *
 * ルートに必要な権限を指定し、ユーザーのロールから権限を検証する。
 * 在路由上指定所需权限，从用户角色验证权限。
 *
 * 使用例 / 使用例:
 *   router.post('/receive', requirePermission('inbound:receive'), controller.receive)
 *   router.get('/list', requirePermission('inbound:view'), controller.list)
 */

// 権限キャッシュ（ロール → 権限配列）/ 权限缓存（角色 → 权限数组）
// TTL 5分, プロセスメモリ / TTL 5分, 进程内存
const permissionCache: Map<string, { permissions: string[]; expiry: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分

/**
 * ロールIDリストから権限リストを取得 / 角色ID列表获取权限列表
 */
async function getPermissionsForRoles(roleIds: string[]): Promise<string[]> {
  const cacheKey = roleIds.sort().join(',');
  const cached = permissionCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.permissions;
  }

  const roles = await Role.find({ _id: { $in: roleIds }, isActive: true }).lean();
  const permissions = [...new Set(roles.flatMap((r) => r.permissions))];

  permissionCache.set(cacheKey, { permissions, expiry: Date.now() + CACHE_TTL });
  return permissions;
}

/**
 * 権限チェックミドルウェアファクトリ / 权限校验中间件工厂
 *
 * @param permission 必要な権限識別子 / 所需权限标识 (例: 'inbound:receive')
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ message: '認証が必要です / 需要认证' });
        return;
      }

      // 管理者は全権限 / admin は全権限
      if (user.role === 'admin') {
        next();
        return;
      }

      // ユーザーにロールIDがある場合、DBから権限を取得
      // 用户有角色ID时，从DB获取权限
      const roleIds: string[] = user.roleIds || [];
      if (roleIds.length === 0) {
        res.status(403).json({ message: `権限がありません: ${permission} / 无权限: ${permission}` });
        return;
      }

      const permissions = await getPermissionsForRoles(roleIds);
      if (!permissions.includes(permission)) {
        res.status(403).json({ message: `権限がありません: ${permission} / 无权限: ${permission}` });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({ message: '権限チェックに失敗しました / 权限校验失败', error: error.message });
    }
  };
}

/**
 * 複数権限チェック（いずれかを持っていればOK）/ 多权限校验（有其一即可）
 */
export function requireAnyPermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ message: '認証が必要です / 需要认证' });
        return;
      }

      if (user.role === 'admin') {
        next();
        return;
      }

      const roleIds: string[] = user.roleIds || [];
      if (roleIds.length === 0) {
        res.status(403).json({ message: '権限がありません / 无权限' });
        return;
      }

      const userPermissions = await getPermissionsForRoles(roleIds);
      const hasAny = permissions.some((p) => userPermissions.includes(p));
      if (!hasAny) {
        res.status(403).json({ message: `権限がありません: ${permissions.join(' | ')} / 无权限` });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({ message: '権限チェックに失敗しました / 权限校验失败', error: error.message });
    }
  };
}
