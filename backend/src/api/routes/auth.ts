/**
 * 认证路由 / 認証ルート
 *
 * 登录、注册、当前用户取得、パスワード変更のエンドポイントを定義する。
 * ログイン・登録・現在ユーザー取得・パスワード変更のエンドポイントを定義する。
 */
import { Router } from 'express'
import { login, register, me, changePassword } from '@/api/controllers/authController'
import { requireAuth } from '@/api/middleware/auth'
import { authLimiter } from '@/api/middleware/rateLimit'

export const authRouter = Router()

// 認証エンドポイントに厳格なレートリミット / 认证端点严格速率限制
authRouter.use(authLimiter)

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: ログイン / Login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: ログイン成功 / Login successful
 *       401:
 *         description: 認証失敗 / Authentication failed
 */
authRouter.post('/login', login)

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: ユーザー登録 / Register
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: 登録成功 / Registration successful
 *       400:
 *         description: バリデーションエラー / Validation error
 */
authRouter.post('/register', register)

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: 現在ユーザー取得 / Get current user
 *     responses:
 *       200:
 *         description: ユーザー情報 / User info
 *       401:
 *         description: 未認証 / Unauthorized
 */
// 认证必须路由 / 認証必須ルート
authRouter.get('/me', requireAuth, me)

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: パスワード変更 / Change password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: 変更成功 / Password changed
 *       401:
 *         description: 未認証 / Unauthorized
 */
authRouter.post('/change-password', requireAuth, changePassword)
