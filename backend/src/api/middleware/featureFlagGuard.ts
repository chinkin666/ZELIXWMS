/**
 * 功能开关路由中间件 / フィーチャーフラグルートミドルウェア
 *
 * 根据功能开关控制路由访问。
 * フィーチャーフラグに基づいてルートアクセスを制御。
 */

import type { Request, Response, NextFunction } from 'express';
import { extensionManager } from '@/core/extensions';

/**
 * 创建功能开关守卫中间件 / フィーチャーフラグガードミドルウェアを作成
 *
 * @param flagKey 功能标识 / 機能識別子
 * @param message 拒绝时的提示信息 / 拒否時のメッセージ
 */
export function requireFeatureFlag(flagKey: string, message?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as unknown as Record<string, unknown>).tenantId as string | undefined;
      const service = extensionManager.getFeatureFlagService();
      const enabled = await service.isEnabled(flagKey, tenantId);

      if (!enabled) {
        return res.status(403).json({
          error: message || `この機能は現在無効です（${flagKey}）`,
          featureFlag: flagKey,
        });
      }

      next();
    } catch {
      // 功能开关检查失败时放行，不阻塞核心功能
      // フラグチェック失敗時は通過させ、コア機能をブロックしない
      next();
    }
  };
}
