/**
 * 认证路由 / 認証ルート
 *
 * 登录、注册、当前用户取得、パスワード変更のエンドポイントを定義する。
 * ログイン・登録・現在ユーザー取得・パスワード変更のエンドポイントを定義する。
 */
import { Router } from 'express'
import { login, register, me, changePassword } from '@/api/controllers/authController'
import { requireAuth } from '@/api/middleware/auth'

export const authRouter = Router()

// 公开路由（无需认证） / 公開ルート（認証不要）
authRouter.post('/login', login)
authRouter.post('/register', register)

// 认证必须路由 / 認証必須ルート
authRouter.get('/me', requireAuth, me)
authRouter.post('/change-password', requireAuth, changePassword)
