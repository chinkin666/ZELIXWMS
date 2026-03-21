/**
 * portalAuthController 单元测试 / portalAuthController ユニットテスト
 *
 * 客户门户认证（登录 + 邀请）
 * 顧客ポータル認証（ログイン + 招待）
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块mock声明 ─────────────────

vi.mock('@/models/user', () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
    updateOne: vi.fn(),
    hashPassword: vi.fn((pw: string) => `hashed:${pw}`),
    verifyPassword: vi.fn(),
  },
}))

vi.mock('@/models/client', () => ({
  Client: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}))

vi.mock('@/models/subClient', () => ({
  SubClient: {
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}))

vi.mock('@/api/middleware/auth', () => ({
  generateToken: vi.fn().mockReturnValue('mock-token'),
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn().mockReturnValue('T1'),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { User } from '@/models/user'
import { Client } from '@/models/client'
import { SubClient } from '@/models/subClient'
import { generateToken } from '@/api/middleware/auth'
import { portalLogin, invitePortalUser } from '@/api/controllers/portalAuthController'

// ─── テストユーティリティ / 测试工具函数 ───────────────────────────

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, headers: {}, user: { id: 'u1', tenantId: 'T1' }, ...overrides }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── テスト / 测试 ─────────────────────────────────────────────────

describe('portalAuthController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ログイン / 登录
  describe('portalLogin', () => {
    it('正常ログイン: トークンとユーザー情報を返す / 正常登录返回token和用户信息', async () => {
      const mockUser = {
        _id: { toString: () => 'uid1' },
        email: 'test@example.com',
        displayName: 'Test',
        role: 'client',
        isActive: true,
        passwordHash: 'hashed:pass',
        tenantId: 'default',
        clientId: { toString: () => 'cid1' },
        clientName: 'Client1',
        language: 'ja',
        parentUserId: null,
      }
      ;(User.findOne as any).mockResolvedValue(mockUser)
      ;(User.verifyPassword as any).mockReturnValue(true)
      ;(User.updateOne as any).mockResolvedValue({})
      ;(Client.findById as any).mockReturnValue({ lean: () => ({ name: 'Client1' }) })

      const res = mockRes()
      await portalLogin(mockReq({ body: { email: 'test@example.com', password: 'pass' } }), res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        token: 'mock-token',
        user: expect.objectContaining({ email: 'test@example.com', role: 'client' }),
      }))
    })

    it('メールとパスワード未入力で 400 / 邮箱密码为空返回400', async () => {
      const res = mockRes()
      await portalLogin(mockReq({ body: {} }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('ユーザーが見つからない場合 401 / 用户不存在返回401', async () => {
      ;(User.findOne as any).mockResolvedValue(null)
      const res = mockRes()
      await portalLogin(mockReq({ body: { email: 'x@x.com', password: 'p' } }), res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('非アクティブユーザーで 401 / 非活跃用户返回401', async () => {
      ;(User.findOne as any).mockResolvedValue({ isActive: false })
      const res = mockRes()
      await portalLogin(mockReq({ body: { email: 'x@x.com', password: 'p' } }), res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('パスワード不一致で 401 / 密码不匹配返回401', async () => {
      ;(User.findOne as any).mockResolvedValue({ _id: 'uid1', isActive: true, passwordHash: 'h' })
      ;(User.verifyPassword as any).mockReturnValue(false)
      const res = mockRes()
      await portalLogin(mockReq({ body: { email: 'x@x.com', password: 'wrong' } }), res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('子客户ユーザーの場合 SubClient を検索 / 子客户用户时查找SubClient', async () => {
      const mockUser = {
        _id: { toString: () => 'uid1' },
        email: 'sub@example.com',
        displayName: 'Sub',
        role: 'client',
        isActive: true,
        passwordHash: 'h',
        tenantId: 'default',
        clientId: { toString: () => 'cid1' },
        parentUserId: 'parent1',
        language: 'ja',
      }
      ;(User.findOne as any).mockResolvedValue(mockUser)
      ;(User.verifyPassword as any).mockReturnValue(true)
      ;(User.updateOne as any).mockResolvedValue({})
      ;(Client.findById as any).mockReturnValue({ lean: () => null })
      ;(SubClient.findOne as any).mockReturnValue({ lean: () => ({ _id: { toString: () => 'sc1' } }) })

      const res = mockRes()
      await portalLogin(mockReq({ body: { email: 'sub@example.com', password: 'p' } }), res)

      expect(SubClient.findOne).toHaveBeenCalledWith({ portalUserId: mockUser._id })
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({ subClientId: 'sc1' }),
      }))
    })
  })

  // 招待 / 招待
  describe('invitePortalUser', () => {
    it('正常招待: 201 を返す / 正常邀请返回201', async () => {
      ;(Client.findById as any).mockReturnValue({ lean: () => ({ _id: 'cid1', name: 'C1', portalLanguage: 'ja' }) })
      ;(User.findOne as any).mockResolvedValue(null)
      ;(User.create as any).mockResolvedValue({
        _id: { toString: () => 'newu' },
        email: 'new@example.com',
        displayName: 'New',
        clientId: { toString: () => 'cid1' },
      })
      ;(Client.findByIdAndUpdate as any).mockResolvedValue({})

      const res = mockRes()
      await invitePortalUser(
        mockReq({ body: { email: 'new@example.com', password: 'pass', clientId: 'cid1' } }),
        res,
      )

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }))
    })

    it('必須フィールド不足で 400 / 缺少必填字段返回400', async () => {
      const res = mockRes()
      await invitePortalUser(mockReq({ body: { email: 'x@x.com' } }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('顧客が見つからない場合 404 / 客户不存在返回404', async () => {
      ;(Client.findById as any).mockReturnValue({ lean: () => null })
      const res = mockRes()
      await invitePortalUser(mockReq({ body: { email: 'x@x.com', password: 'p', clientId: 'cid1' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('メール重複で 409 / 邮箱重复返回409', async () => {
      ;(Client.findById as any).mockReturnValue({ lean: () => ({ _id: 'cid1', name: 'C1' }) })
      ;(User.findOne as any).mockResolvedValue({ _id: 'existing' })
      const res = mockRes()
      await invitePortalUser(mockReq({ body: { email: 'x@x.com', password: 'p', clientId: 'cid1' } }), res)
      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('subClientId 指定時に SubClient を更新 / 指定subClientId时更新SubClient', async () => {
      ;(Client.findById as any).mockReturnValue({ lean: () => ({ _id: 'cid1', name: 'C1' }) })
      ;(User.findOne as any).mockResolvedValue(null)
      ;(User.create as any).mockResolvedValue({
        _id: { toString: () => 'newu' },
        email: 'new@example.com',
        displayName: 'New',
        clientId: { toString: () => 'cid1' },
      })
      ;(SubClient.findByIdAndUpdate as any).mockResolvedValue({})
      ;(Client.findByIdAndUpdate as any).mockResolvedValue({})

      const res = mockRes()
      await invitePortalUser(
        mockReq({ body: { email: 'new@example.com', password: 'p', clientId: 'cid1', subClientId: 'sc1' } }),
        res,
      )

      expect(SubClient.findByIdAndUpdate).toHaveBeenCalledWith('sc1', expect.objectContaining({ portalEnabled: true }))
    })
  })
})
