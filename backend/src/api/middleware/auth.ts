/**
 * 认证与授权中间件 / 認証・認可ミドルウェア
 *
 * 提供 JWT 令牌验证、角色检查等安全中间件。
 * JWT トークン検証、ロールチェックなどのセキュリティミドルウェアを提供する。
 *
 * NOTE / 注意:
 *   `jsonwebtoken` 包尚未安装，需要执行:
 *   `jsonwebtoken` パッケージは未インストール。以下を実行してください:
 *     npm install jsonwebtoken
 *     npm install -D @types/jsonwebtoken
 */
import type { NextFunction, Request, Response } from 'express'
import type { AuthUser } from '@/types/express'
import { AppError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// TODO: jsonwebtoken 安装后取消以下注释 / インストール後に以下のコメントを解除
// import jwt from 'jsonwebtoken'

/**
 * JWT 密钥（从环境变量读取） / JWT シークレット（環境変数から取得）
 * 生产环境必须设置 JWT_SECRET / 本番環境では JWT_SECRET の設定が必須
 */
const JWT_SECRET = process.env.JWT_SECRET || ''

/**
 * 从 Authorization 头提取 Bearer 令牌 / Authorization ヘッダーから Bearer トークンを抽出
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * 验证 JWT 令牌并返回解码后的用户信息 / JWT トークンを検証しデコードしたユーザー情報を返す
 *
 * TODO: jsonwebtoken 安装后实现真正的验证逻辑
 * TODO: jsonwebtoken インストール後に実際の検証ロジックを実装
 */
function verifyToken(token: string): AuthUser {
  // TODO: jsonwebtoken 安装后替换为以下实现 / インストール後に以下の実装に置き換え:
  //
  // if (!JWT_SECRET) {
  //   throw new AppError('JWT_SECRET is not configured', 500, 'CONFIG_ERROR')
  // }
  // try {
  //   const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
  //   return decoded
  // } catch (err) {
  //   if (err instanceof jwt.TokenExpiredError) {
  //     throw new UnauthorizedError('Token expired / トークンの有効期限切れ')
  //   }
  //   if (err instanceof jwt.JsonWebTokenError) {
  //     throw new UnauthorizedError('Invalid token / 無効なトークン')
  //   }
  //   throw new UnauthorizedError('Token verification failed / トークン検証に失敗')
  // }

  // 临时占位：始终拒绝（安全默认值） / 一時的プレースホルダー：常に拒否（安全なデフォルト）
  void token
  void JWT_SECRET
  throw new AppError(
    'Auth not configured: install jsonwebtoken / 認証未設定: jsonwebtoken をインストールしてください',
    501,
    'NOT_IMPLEMENTED',
  )
}

/**
 * 必须认证中间件 / 認証必須ミドルウェア
 *
 * 检查 Authorization: Bearer <token> 头，验证 JWT 后将用户信息注入 req.user。
 * Authorization: Bearer <token> ヘッダーを検証し、ユーザー情報を req.user に注入する。
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req)

  if (!token) {
    next(new UnauthorizedError('Missing authentication token / 認証トークンが不足しています'))
    return
  }

  try {
    const user = verifyToken(token)
    req.user = user
    next()
  } catch (err) {
    if (err instanceof AppError) {
      next(err)
      return
    }
    next(new UnauthorizedError('Authentication failed / 認証に失敗しました'))
  }
}

/**
 * 角色检查中间件工厂 / ロールチェックミドルウェアファクトリ
 *
 * 必须在 requireAuth 之后使用。检查 req.user 是否拥有指定角色之一。
 * requireAuth の後に使用すること。req.user が指定ロールのいずれかを持つか検査する。
 *
 * @param roles - 允许的角色列表 / 許可されるロール一覧
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user

    if (!user) {
      next(new UnauthorizedError('Authentication required / 認証が必要です'))
      return
    }

    const hasRole = user.roles.some((r) => roles.includes(r))
    if (!hasRole) {
      logger.warn(
        { userId: user.id, required: roles, actual: user.roles },
        'Insufficient role / ロール不足',
      )
      next(new ForbiddenError('Insufficient permissions / 権限が不足しています'))
      return
    }

    next()
  }
}

/**
 * 可选认证中间件 / オプション認証ミドルウェア
 *
 * 不会拒绝未认证请求，但如果提供了有效令牌则注入用户信息。
 * 未認証リクエストを拒否しないが、有効なトークンがあればユーザー情報を注入する。
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req)

  if (!token) {
    next()
    return
  }

  try {
    const user = verifyToken(token)
    req.user = user
  } catch (err) {
    // 可选认证：令牌无效时不阻止请求 / オプション認証：トークン無効でもリクエストを阻止しない
    logger.debug({ err }, 'Optional auth: token verification failed / トークン検証失敗')
  }

  next()
}
