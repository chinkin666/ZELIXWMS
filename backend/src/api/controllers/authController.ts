/**
 * 认证控制器 / 認証コントローラー
 *
 * 提供登录、注册、获取当前用户、修改密码等功能。
 * ログイン、登録、現在ユーザー取得、パスワード変更機能を提供する。
 */
import type { Request, Response } from 'express'
import { User } from '@/models/user'
import { Tenant } from '@/models/tenant'
import { generateToken } from '@/api/middleware/auth'
import { logger } from '@/lib/logger'

/**
 * 从用户文档构建 JWT 载荷 / ユーザードキュメントから JWT ペイロードを構築
 */
function buildTokenPayload(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
    displayName: user.displayName,
    warehouseIds: user.warehouseIds?.map((id) => id.toString()),
    clientId: user.clientId?.toString(),
  }
}

/**
 * 从用户文档构建响应对象 / ユーザードキュメントからレスポンスオブジェクトを構築
 */
function buildUserResponse(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    tenantId: user.tenantId,
    warehouseIds: user.warehouseIds?.map((id) => id.toString()),
    clientId: user.clientId?.toString(),
    clientName: user.clientName,
    language: user.language,
    avatar: user.avatar,
    isActive: user.isActive,
  }
}

/**
 * POST /api/auth/login
 * 用户登录 / ユーザーログイン
 *
 * @body email - 邮箱 / メールアドレス
 * @body password - 密码 / パスワード
 * @body tenantId - 租户ID（可选，默认 'default'） / テナントID（省略可、デフォルト 'default'）
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, tenantId = 'default' } = req.body

    if (!email || !password) {
      res.status(400).json({
        message: 'メールアドレスとパスワードは必須です / Email and password are required',
      })
      return
    }

    // 查找用户 / ユーザーを検索
    const user = await User.findOne({ email: email.toLowerCase().trim(), tenantId })

    if (!user) {
      res.status(401).json({
        message: 'メールアドレスまたはパスワードが正しくありません / Invalid email or password',
      })
      return
    }

    // 检查用户是否有效 / ユーザーが有効か確認
    if (!user.isActive) {
      res.status(403).json({
        message: 'アカウントが無効化されています / Account is deactivated',
      })
      return
    }

    // 验证密码 / パスワードを検証
    const isValid = User.verifyPassword(password, user.passwordHash)
    if (!isValid) {
      res.status(401).json({
        message: 'メールアドレスまたはパスワードが正しくありません / Invalid email or password',
      })
      return
    }

    // 更新登录信息 / ログイン情報を更新
    await User.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() }, $inc: { loginCount: 1 } },
    )

    // 生成令牌 / トークンを生成
    const payload = buildTokenPayload(user)
    const token = generateToken(payload)

    logger.info({ userId: user._id, email: user.email }, 'User logged in / ユーザーがログインしました')

    res.json({
      token,
      user: buildUserResponse(user),
    })
  } catch (err) {
    logger.error({ err }, 'Login failed / ログインに失敗しました')
    res.status(500).json({ message: 'Internal server error / サーバー内部エラー' })
  }
}

/**
 * POST /api/auth/register
 * 新规租户注册 / 新規テナント登録（SaaS サインアップ用）
 *
 * @body tenantCode - 租户代码 / テナントコード
 * @body tenantName - 租户名称 / テナント名
 * @body email - 管理员邮箱 / 管理者メールアドレス
 * @body password - 管理员密码 / 管理者パスワード
 * @body displayName - 管理员显示名 / 管理者表示名
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { tenantCode, tenantName, email, password, displayName } = req.body

    if (!tenantCode || !tenantName || !email || !password || !displayName) {
      res.status(400).json({
        message: '全ての項目は必須です / All fields are required',
      })
      return
    }

    // 检查密码长度 / パスワード長チェック
    if (password.length < 8) {
      res.status(400).json({
        message: 'パスワードは8文字以上必要です / Password must be at least 8 characters',
      })
      return
    }

    // 检查租户代码是否已存在 / テナントコードの重複チェック
    const existingTenant = await Tenant.findOne({ tenantCode: tenantCode.trim() })
    if (existingTenant) {
      res.status(409).json({
        message: 'テナントコードは既に使用されています / Tenant code already exists',
      })
      return
    }

    // 检查邮箱是否已存在 / メールアドレスの重複チェック
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
      tenantId: tenantCode.trim(),
    })
    if (existingUser) {
      res.status(409).json({
        message: 'このメールアドレスは既に使用されています / Email already exists',
      })
      return
    }

    // 创建租户 / テナントを作成
    const tenant = await Tenant.create({
      tenantCode: tenantCode.trim(),
      name: tenantName.trim(),
      plan: 'free',
      status: 'trial',
    })

    // 创建管理员用户 / 管理者ユーザーを作成
    const passwordHash = User.hashPassword(password)
    const user = await User.create({
      tenantId: tenant.tenantCode,
      email: email.toLowerCase().trim(),
      passwordHash,
      displayName: displayName.trim(),
      role: 'admin',
    })

    // 生成令牌 / トークンを生成
    const payload = buildTokenPayload(user)
    const token = generateToken(payload)

    logger.info(
      { tenantCode: tenant.tenantCode, userId: user._id },
      'New tenant registered / 新しいテナントが登録されました',
    )

    res.status(201).json({
      token,
      user: buildUserResponse(user),
    })
  } catch (err) {
    logger.error({ err }, 'Registration failed / 登録に失敗しました')
    res.status(500).json({ message: 'Internal server error / サーバー内部エラー' })
  }
}

/**
 * GET /api/auth/me
 * 获取当前用户信息 / 現在のユーザー情報を取得
 */
export async function me(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: '認証が必要です / Authentication required' })
      return
    }

    const user = await User.findById(req.user.id).select('-passwordHash')
    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません / User not found' })
      return
    }

    res.json({ user: buildUserResponse(user) })
  } catch (err) {
    logger.error({ err }, 'Get current user failed / 現在ユーザー取得に失敗しました')
    res.status(500).json({ message: 'Internal server error / サーバー内部エラー' })
  }
}

/**
 * POST /api/auth/change-password
 * 修改密码 / パスワード変更
 *
 * @body currentPassword - 当前密码 / 現在のパスワード
 * @body newPassword - 新密码 / 新しいパスワード
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: '認証が必要です / Authentication required' })
      return
    }

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        message: '現在のパスワードと新しいパスワードは必須です / Current and new passwords are required',
      })
      return
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        message: 'パスワードは8文字以上必要です / Password must be at least 8 characters',
      })
      return
    }

    const user = await User.findById(req.user.id)
    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません / User not found' })
      return
    }

    // 验证当前密码 / 現在のパスワードを検証
    const isValid = User.verifyPassword(currentPassword, user.passwordHash)
    if (!isValid) {
      res.status(401).json({
        message: '現在のパスワードが正しくありません / Current password is incorrect',
      })
      return
    }

    // 更新密码 / パスワードを更新
    const newHash = User.hashPassword(newPassword)
    await User.updateOne({ _id: user._id }, { $set: { passwordHash: newHash } })

    logger.info({ userId: user._id }, 'Password changed / パスワードが変更されました')

    res.json({ message: 'パスワードが変更されました / Password changed successfully' })
  } catch (err) {
    logger.error({ err }, 'Change password failed / パスワード変更に失敗しました')
    res.status(500).json({ message: 'Internal server error / サーバー内部エラー' })
  }
}
