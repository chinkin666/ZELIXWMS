/**
 * Express 类型扩展 / Express 型拡張
 *
 * 为 Express Request 对象添加自定义属性。
 * Express Request オブジェクトにカスタムプロパティを追加する。
 */

import type { UserRole } from '@/models/user'

/**
 * JWT 令牌解码后的用户信息 / JWT トークンからデコードされたユーザー情報
 */
export interface AuthUser {
  /** 用户 ID / ユーザー ID */
  id: string
  /** 用户邮箱 / ユーザーメールアドレス */
  email: string
  /** 租户 ID / テナント ID */
  tenantId: string
  /** 用户角色 / ユーザーロール */
  role: UserRole
  /** 显示名 / 表示名 */
  displayName: string
  /** 仓库 ID 列表 / 倉庫 ID 一覧 */
  warehouseIds?: string[]
  /** 荷主 ID / 荷主 ID */
  clientId?: string
  /** JWT 签发时间 / JWT 発行日時 */
  iat?: number
  /** JWT 过期时间 / JWT 有効期限 */
  exp?: number
}

declare global {
  namespace Express {
    interface Request {
      /** 认证用户（由 auth 中间件注入） / 認証ユーザー（auth ミドルウェアが注入） */
      user?: AuthUser
    }
  }
}
