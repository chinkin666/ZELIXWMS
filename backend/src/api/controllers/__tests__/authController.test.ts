/**
 * authController 统合テスト / Auth Controller Integration Tests
 *
 * 認証フロー（ログイン・登録・パスワード変更）の HTTP フローを検証する。
 * Verifies HTTP flow for authentication operations through the model layer.
 *
 * モック方針 / Mock strategy:
 * - User, Tenant モデルをすべてモック（DB不要）
 *   Mock all models (User, Tenant) to eliminate DB dependency
 * - generateToken もモック
 *   Mock generateToken for deterministic token generation
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/user', () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateOne: vi.fn(),
    hashPassword: vi.fn((pw: string) => `hashed_${pw}`),
    verifyPassword: vi.fn(),
  },
}))

vi.mock('@/models/tenant', () => ({
  Tenant: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('@/api/middleware/auth', () => ({
  generateToken: vi.fn(() => 'mock-jwt-token'),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { User } from '@/models/user'
import { Tenant } from '@/models/tenant'
import { login, register, me, changePassword } from '../authController'

// ─── テストユーティリティ / Test utilities ──────────────────────────

function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    body: {},
    params: {},
    query: {},
    user: undefined,
    ...overrides,
  }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

// ─── テストケース / Test cases ───────────────────────────────────

describe('authController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── login ──────────────────────────────────────────────────

  describe('login', () => {
    it('メールとパスワードが空の場合400を返す / returns 400 when email or password is missing', async () => {
      const req = mockReq({ body: { email: '', password: '' } })
      const res = mockRes()

      await login(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('存在しないユーザーの場合401を返す / returns 401 for non-existent user', async () => {
      vi.mocked(User.findOne).mockResolvedValue(null)
      const req = mockReq({ body: { email: 'test@test.com', password: 'pass1234' } })
      const res = mockRes()

      await login(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('無効化されたユーザーの場合403を返す / returns 403 for deactivated user', async () => {
      vi.mocked(User.findOne).mockResolvedValue({
        _id: { toString: () => 'user-1' },
        email: 'test@test.com',
        isActive: false,
        tenantId: 'default',
        role: 'admin',
      } as any)
      const req = mockReq({ body: { email: 'test@test.com', password: 'pass1234' } })
      const res = mockRes()

      await login(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('パスワードが間違っている場合401を返す / returns 401 for wrong password', async () => {
      vi.mocked(User.findOne).mockResolvedValue({
        _id: { toString: () => 'user-1' },
        email: 'test@test.com',
        isActive: true,
        passwordHash: 'hashed',
        tenantId: 'default',
        role: 'admin',
      } as any)
      vi.mocked(User.verifyPassword).mockReturnValue(false)
      const req = mockReq({ body: { email: 'test@test.com', password: 'wrong' } })
      const res = mockRes()

      await login(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('正常にログインしトークンを返す / returns token on successful login', async () => {
      const mockUser = {
        _id: { toString: () => 'user-1' },
        email: 'test@test.com',
        isActive: true,
        passwordHash: 'hashed',
        tenantId: 'default',
        role: 'admin',
        displayName: 'Test User',
        warehouseIds: [],
      }
      vi.mocked(User.findOne).mockResolvedValue(mockUser as any)
      vi.mocked(User.verifyPassword).mockReturnValue(true)
      vi.mocked(User.updateOne).mockResolvedValue({} as any)
      const req = mockReq({ body: { email: 'test@test.com', password: 'pass1234' } })
      const res = mockRes()

      await login(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'mock-jwt-token',
          user: expect.objectContaining({ email: 'test@test.com' }),
        }),
      )
    })

    it('DB例外の場合500を返す / returns 500 on DB exception', async () => {
      vi.mocked(User.findOne).mockRejectedValue(new Error('DB error'))
      const req = mockReq({ body: { email: 'test@test.com', password: 'pass1234' } })
      const res = mockRes()

      await login(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ─── register ───────────────────────────────────────────────

  describe('register', () => {
    it('必須項目が足りない場合400を返す / returns 400 when required fields are missing', async () => {
      const req = mockReq({ body: { tenantCode: 'TC1' } })
      const res = mockRes()

      await register(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('パスワードが短い場合400を返す / returns 400 for short password', async () => {
      const req = mockReq({
        body: {
          tenantCode: 'TC1',
          tenantName: 'Test Tenant',
          email: 'admin@test.com',
          password: 'short',
          displayName: 'Admin',
        },
      })
      const res = mockRes()

      await register(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('テナントコード重複の場合409を返す / returns 409 for duplicate tenant code', async () => {
      vi.mocked(Tenant.findOne).mockResolvedValue({ tenantCode: 'TC1' } as any)
      const req = mockReq({
        body: {
          tenantCode: 'TC1',
          tenantName: 'Test',
          email: 'admin@test.com',
          password: 'password123',
          displayName: 'Admin',
        },
      })
      const res = mockRes()

      await register(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('メールアドレス重複の場合409を返す / returns 409 for duplicate email', async () => {
      vi.mocked(Tenant.findOne).mockResolvedValue(null)
      vi.mocked(User.findOne).mockResolvedValue({ email: 'admin@test.com' } as any)
      const req = mockReq({
        body: {
          tenantCode: 'TC1',
          tenantName: 'Test',
          email: 'admin@test.com',
          password: 'password123',
          displayName: 'Admin',
        },
      })
      const res = mockRes()

      await register(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('正常に登録完了 / successful registration returns 201 with token', async () => {
      vi.mocked(Tenant.findOne).mockResolvedValue(null)
      vi.mocked(User.findOne).mockResolvedValue(null)
      vi.mocked(Tenant.create).mockResolvedValue({ tenantCode: 'TC1' } as any)
      vi.mocked(User.create).mockResolvedValue({
        _id: { toString: () => 'user-1' },
        email: 'admin@test.com',
        displayName: 'Admin',
        role: 'admin',
        tenantId: 'TC1',
        isActive: true,
        warehouseIds: [],
      } as any)
      const req = mockReq({
        body: {
          tenantCode: 'TC1',
          tenantName: 'Test Tenant',
          email: 'admin@test.com',
          password: 'password123',
          displayName: 'Admin',
        },
      })
      const res = mockRes()

      await register(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'mock-jwt-token',
        }),
      )
    })
  })

  // ─── me ─────────────────────────────────────────────────────

  describe('me', () => {
    it('未認証の場合401を返す / returns 401 when not authenticated', async () => {
      const req = mockReq()
      const res = mockRes()

      await me(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('ユーザーが見つからない場合404を返す / returns 404 when user not found', async () => {
      const selectMock = vi.fn().mockResolvedValue(null)
      vi.mocked(User.findById).mockReturnValue({ select: selectMock } as any)
      const req = mockReq({ user: { id: 'user-1' } })
      const res = mockRes()

      await me(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常にユーザー情報を返す / returns user info successfully', async () => {
      const mockUser = {
        _id: { toString: () => 'user-1' },
        email: 'test@test.com',
        displayName: 'Test User',
        role: 'admin',
        tenantId: 'default',
        isActive: true,
        warehouseIds: [],
      }
      const selectMock = vi.fn().mockResolvedValue(mockUser)
      vi.mocked(User.findById).mockReturnValue({ select: selectMock } as any)
      const req = mockReq({ user: { id: 'user-1' } })
      const res = mockRes()

      await me(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ email: 'test@test.com' }),
        }),
      )
    })
  })

  // ─── changePassword ────────────────────────────────────────

  describe('changePassword', () => {
    it('未認証の場合401を返す / returns 401 when not authenticated', async () => {
      const req = mockReq({ body: { currentPassword: 'old', newPassword: 'new12345' } })
      const res = mockRes()

      await changePassword(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('パスワードが空の場合400を返す / returns 400 when passwords are missing', async () => {
      const req = mockReq({ user: { id: 'user-1' }, body: {} })
      const res = mockRes()

      await changePassword(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('新パスワードが短い場合400を返す / returns 400 for short new password', async () => {
      const req = mockReq({
        user: { id: 'user-1' },
        body: { currentPassword: 'oldpass12', newPassword: 'short' },
      })
      const res = mockRes()

      await changePassword(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('現在のパスワードが間違っている場合401を返す / returns 401 for wrong current password', async () => {
      vi.mocked(User.findById).mockResolvedValue({
        _id: { toString: () => 'user-1' },
        passwordHash: 'hashed',
      } as any)
      vi.mocked(User.verifyPassword).mockReturnValue(false)
      const req = mockReq({
        user: { id: 'user-1' },
        body: { currentPassword: 'wrong', newPassword: 'newpass123' },
      })
      const res = mockRes()

      await changePassword(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('正常にパスワードを変更 / changes password successfully', async () => {
      vi.mocked(User.findById).mockResolvedValue({
        _id: { toString: () => 'user-1' },
        passwordHash: 'hashed',
      } as any)
      vi.mocked(User.verifyPassword).mockReturnValue(true)
      vi.mocked(User.updateOne).mockResolvedValue({} as any)
      const req = mockReq({
        user: { id: 'user-1' },
        body: { currentPassword: 'oldpass12', newPassword: 'newpass123' },
      })
      const res = mockRes()

      await changePassword(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('パスワード') }),
      )
    })
  })
})
