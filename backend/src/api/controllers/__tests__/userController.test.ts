/**
 * userController 统合テスト / User Controller Integration Tests
 *
 * User モデル層を通じたユーザー操作の HTTP フローを検証する。
 * Verifies HTTP flow for user operations through the User model layer.
 *
 * モック方針 / Mock strategy:
 * - User モデルをすべてモック（DB不要、パスワードハッシュも制御可能）
 *   Mock entire User model (no DB, controllable password hashing)
 * - getTenantId ヘルパーもモック（テナント ID 固定）
 *   Mock getTenantId helper (fixed tenant ID)
 * - passwordHash はレスポンスに含まれないことを確認
 *   Verify passwordHash is excluded from responses
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/user', () => ({
  User: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    hashPassword: vi.fn((pw: string) => `hashed:${pw}`),
    verifyPassword: vi.fn(),
  },
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn().mockReturnValue('T1'),
}))

import { User } from '@/models/user'
import { getTenantId } from '@/api/helpers/tenantHelper'
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
} from '@/api/controllers/userController'

// ─── テストユーティリティ / Test utilities ────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 * 最小限の Request オブジェクト / Minimal Request object
 */
const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'T1' },
    ...overrides,
  }) as any

/**
 * モックレスポンス生成 / Mock response factory
 * json() と status() をスパイとして持つオブジェクト
 * Object with json() and status() as spies
 */
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  // status().json() チェーンを可能にする / Enable status().json() chaining
  res.status.mockReturnValue(res)
  return res
}

// ─── listUsers ─────────────────────────────────────────────────

describe('listUsers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('テナント内のユーザー一覧をページネーションで返す / returns paginated users within tenant', async () => {
    // Arrange
    const fakeUsers = [{ _id: 'u1', email: 'user@example.com', displayName: 'テストユーザー' }]
    vi.mocked(User.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(fakeUsers) }),
          }),
        }),
      }),
    } as any)
    vi.mocked(User.countDocuments).mockResolvedValue(1 as any)

    const req = mockReq({ query: { page: '1', limit: '20' } })
    const res = mockRes()

    // Act
    await listUsers(req, res)

    // Assert: テナント ID でフィルタされ、data と total を返す / filtered by tenantId, returns data and total
    expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'T1' }))
    expect(res.json).toHaveBeenCalledWith({ data: fakeUsers, total: 1 })
  })

  it('search クエリで $or フィルタが設定される / sets $or filter for search query', async () => {
    // Arrange
    vi.mocked(User.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      }),
    } as any)
    vi.mocked(User.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { search: 'taro' } })
    const res = mockRes()

    // Act
    await listUsers(req, res)

    // Assert: email と displayName の $or フィルタ / $or filter on email and displayName
    expect(User.find).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) }),
    )
  })

  it('有効なロールのみフィルタに反映される / only valid roles are applied to filter', async () => {
    // Arrange
    vi.mocked(User.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      }),
    } as any)
    vi.mocked(User.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { role: 'admin' } })
    const res = mockRes()

    // Act
    await listUsers(req, res)

    // Assert: 有効なロール 'admin' がフィルタに含まれる / valid role 'admin' in filter
    expect(User.find).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' }),
    )
  })

  it('無効なロールはフィルタに反映されない / invalid roles are not applied to filter', async () => {
    // Arrange
    vi.mocked(User.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      }),
    } as any)
    vi.mocked(User.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { role: 'superadmin' } })
    const res = mockRes()

    // Act
    await listUsers(req, res)

    // Assert: 無効なロールはフィルタから除外 / invalid role excluded from filter
    const callArg = (vi.mocked(User.find).mock.calls[0] as any)?.[0] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('role')
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(User.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ lean: vi.fn().mockRejectedValue(new Error('DB down')) }),
          }),
        }),
      }),
    } as any)
    vi.mocked(User.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listUsers(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── getUser ───────────────────────────────────────────────────

describe('getUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存ユーザーを取得する / retrieves existing user', async () => {
    // Arrange
    // getUser は findOne({ _id, tenantId }) を使用 / getUser uses findOne({ _id, tenantId })
    const fakeUser = { _id: 'u1', email: 'user@example.com', displayName: 'テストユーザー' }
    vi.mocked(User.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(fakeUser) }),
    } as any)

    const req = mockReq({ params: { id: 'u1' } })
    const res = mockRes()

    // Act
    await getUser(req, res)

    // Assert: テナント分離 + passwordHash 除外 / tenant isolation + passwordHash excluded
    expect(User.findOne).toHaveBeenCalledWith({ _id: 'u1', tenantId: 'T1' })
    expect(res.json).toHaveBeenCalledWith(fakeUser)
  })

  it('ユーザーが存在しない場合 404 を返す / returns 404 when user not found', async () => {
    // Arrange
    vi.mocked(User.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getUser(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(User.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockRejectedValue(new Error('timeout')) }),
    } as any)

    const req = mockReq({ params: { id: 'u1' } })
    const res = mockRes()

    // Act
    await getUser(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createUser ────────────────────────────────────────────────

describe('createUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('必須フィールド揃いでユーザーを作成し 201 を返す / creates user and returns 201 with required fields', async () => {
    // Arrange: 重複なし / no duplicate
    vi.mocked(User.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    // パスワードは8文字以上必須 / Password must be 8+ chars
    const fakeCreated = {
      _id: 'u-new',
      email: 'new@example.com',
      displayName: '新ユーザー',
      passwordHash: 'hashed:pass1234',
      toObject: () => ({
        _id: 'u-new',
        email: 'new@example.com',
        displayName: '新ユーザー',
        passwordHash: 'hashed:pass1234',
      }),
    }
    vi.mocked(User.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({
      body: { email: 'new@example.com', password: 'pass1234', displayName: '新ユーザー' },
    })
    const res = mockRes()

    // Act
    await createUser(req, res)

    // Assert: 201 で passwordHash を除外した結果を返す
    // Returns 201 and result without passwordHash
    expect(res.status).toHaveBeenCalledWith(201)
    const returnedData = vi.mocked(res.json).mock.calls[0][0]
    expect(returnedData).not.toHaveProperty('passwordHash')
  })

  it('email が欠けている場合 400 を返す / returns 400 when email is missing', async () => {
    // Arrange
    const req = mockReq({ body: { password: 'pass123', displayName: '太郎' } })
    const res = mockRes()

    // Act
    await createUser(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('メールアドレス') }),
    )
  })

  it('パスワードが 6 文字未満の場合 400 を返す / returns 400 when password is less than 6 chars', async () => {
    // Arrange
    const req = mockReq({ body: { email: 'a@b.com', password: '123', displayName: '太郎' } })
    const res = mockRes()

    // Act
    await createUser(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('パスワード') }),
    )
  })

  it('displayName が欠けている場合 400 を返す / returns 400 when displayName is missing', async () => {
    // Arrange
    const req = mockReq({ body: { email: 'a@b.com', password: 'pass123' } })
    const res = mockRes()

    // Act
    await createUser(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('無効なロールが指定された場合 400 を返す / returns 400 for invalid role', async () => {
    // Arrange: パスワードは8文字以上（バリデーション順序: email→password→displayName→role）
    // Password must be 8+ chars (validation order: email→password→displayName→role)
    const req = mockReq({
      body: { email: 'a@b.com', password: 'pass1234', displayName: '太郎', role: 'superadmin' },
    })
    const res = mockRes()

    // Act
    await createUser(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('superadmin') }),
    )
  })

  it('メールアドレスが重複している場合 409 を返す / returns 409 when email already exists', async () => {
    // Arrange: 既存ユーザーあり / existing user found
    // パスワードは8文字以上（バリデーションを通過させるため）/ Password must be 8+ chars to pass validation
    vi.mocked(User.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'existing', email: 'dup@example.com' }),
    } as any)

    const req = mockReq({
      body: { email: 'dup@example.com', password: 'pass1234', displayName: '太郎' },
    })
    const res = mockRes()

    // Act
    await createUser(req, res)

    // Assert: メール重複 409 / email duplicate 409
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ duplicateField: 'email' }),
    )
  })

  it('hashPassword が呼ばれてパスワードがハッシュ化される / hashPassword is called to hash the password', async () => {
    // Arrange
    vi.mocked(User.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const fakeCreated = {
      _id: 'u-new',
      email: 'new@example.com',
      displayName: '新ユーザー',
      passwordHash: 'hashed:secure123',
      toObject: () => ({
        _id: 'u-new',
        email: 'new@example.com',
        displayName: '新ユーザー',
        passwordHash: 'hashed:secure123',
      }),
    }
    vi.mocked(User.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({
      body: { email: 'new@example.com', password: 'secure123', displayName: '新ユーザー' },
    })
    const res = mockRes()

    // Act
    await createUser(req, res)

    // Assert: hashPassword が平文パスワードで呼ばれる / hashPassword called with plain password
    expect(User.hashPassword).toHaveBeenCalledWith('secure123')
  })
})

// ─── updateUser ────────────────────────────────────────────────

describe('updateUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ユーザーを正常に更新する / updates user successfully', async () => {
    // Arrange: 既存ユーザーあり / existing user found
    vi.mocked(User.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'u1', email: 'old@example.com', tenantId: 'T1' }),
    } as any)
    const fakeUpdated = { _id: 'u1', displayName: '更新後' }
    vi.mocked(User.findByIdAndUpdate).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(fakeUpdated) }),
    } as any)

    const req = mockReq({ params: { id: 'u1' }, body: { displayName: '更新後' } })
    const res = mockRes()

    // Act
    await updateUser(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })

  it('ユーザーが存在しない場合 404 を返す / returns 404 when user not found', async () => {
    // Arrange
    vi.mocked(User.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'ghost' }, body: {} })
    const res = mockRes()

    // Act
    await updateUser(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('無効なロールへの更新で 400 を返す / returns 400 when updating to invalid role', async () => {
    // Arrange
    vi.mocked(User.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'u1', email: 'user@example.com', tenantId: 'T1' }),
    } as any)

    const req = mockReq({ params: { id: 'u1' }, body: { role: 'godmode' } })
    const res = mockRes()

    // Act
    await updateUser(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('godmode') }),
    )
  })

  it('パスワードも更新できる / can also update password', async () => {
    // Arrange
    vi.mocked(User.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'u1', email: 'user@example.com', tenantId: 'T1' }),
    } as any)
    vi.mocked(User.findByIdAndUpdate).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'u1', email: 'user@example.com' }),
      }),
    } as any)

    const req = mockReq({
      params: { id: 'u1' },
      body: { password: 'newSecure123' },
    })
    const res = mockRes()

    // Act
    await updateUser(req, res)

    // Assert: hashPassword が新パスワードで呼ばれる / hashPassword called with new password
    expect(User.hashPassword).toHaveBeenCalledWith('newSecure123')
  })
})

// ─── deleteUser ────────────────────────────────────────────────

describe('deleteUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ユーザーをソフトデリート（isActive=false）する / soft-deletes user (sets isActive=false)', async () => {
    // Arrange
    // deleteUser は findOne({ _id, tenantId }) でテナント確認してから findByIdAndUpdate する
    // deleteUser checks tenant via findOne({ _id, tenantId }) before findByIdAndUpdate
    const fakeExisting = { _id: 'u1', email: 'user@example.com' }
    const fakeUpdated = { _id: 'u1', isActive: false, email: 'user@example.com' }
    vi.mocked(User.findOne).mockResolvedValue(fakeExisting as any)
    vi.mocked(User.findByIdAndUpdate).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(fakeUpdated) }),
    } as any)

    const req = mockReq({ params: { id: 'u1' } })
    const res = mockRes()

    // Act
    await deleteUser(req, res)

    // Assert: テナント確認 + isActive=false で更新 / tenant check + updated with isActive=false
    expect(User.findOne).toHaveBeenCalledWith({ _id: 'u1', tenantId: 'T1' })
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      { isActive: false },
      { new: true },
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Deleted' }),
    )
  })

  it('ユーザーが存在しない場合 404 を返す / returns 404 when user not found', async () => {
    // Arrange
    // findOne が null を返す = テナント内に存在しない / findOne returns null = not in tenant
    vi.mocked(User.findOne).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await deleteUser(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    // findOne が例外をスロー / findOne throws exception
    vi.mocked(User.findOne).mockRejectedValue(new Error('DB error') as any)

    const req = mockReq({ params: { id: 'u1' } })
    const res = mockRes()

    // Act
    await deleteUser(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── changePassword ────────────────────────────────────────────

describe('changePassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('旧パスワードが正しく新パスワードに変更できる / changes password when old password is correct', async () => {
    // Arrange
    // changePassword は findOne({ _id, tenantId }) を使用 / changePassword uses findOne({ _id, tenantId })
    const fakeUser = { _id: 'u1', passwordHash: 'hashed:oldpass' }
    vi.mocked(User.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUser),
    } as any)
    vi.mocked(User.verifyPassword).mockReturnValue(true as any)
    vi.mocked(User.findByIdAndUpdate).mockResolvedValue({} as any)

    const req = mockReq({
      params: { id: 'u1' },
      body: { oldPassword: 'oldpass', newPassword: 'newSecure123' },
    })
    const res = mockRes()

    // Act
    await changePassword(req, res)

    // Assert: 変更成功メッセージ / success message
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('パスワード') }),
    )
  })

  it('旧パスワードが間違っている場合 401 を返す / returns 401 when old password is incorrect', async () => {
    // Arrange
    vi.mocked(User.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'u1', passwordHash: 'hashed:correct' }),
    } as any)
    vi.mocked(User.verifyPassword).mockReturnValue(false as any)

    const req = mockReq({
      params: { id: 'u1' },
      body: { oldPassword: 'wrongpass', newPassword: 'newSecure123' },
    })
    const res = mockRes()

    // Act
    await changePassword(req, res)

    // Assert: 旧パスワード不一致 = 401 / old password mismatch = 401
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('oldPassword が欠けている場合 400 を返す / returns 400 when oldPassword is missing', async () => {
    // Arrange
    const req = mockReq({
      params: { id: 'u1' },
      body: { newPassword: 'newSecure123' },
    })
    const res = mockRes()

    // Act
    await changePassword(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('新パスワードが 6 文字未満の場合 400 を返す / returns 400 when new password is less than 6 chars', async () => {
    // Arrange
    const req = mockReq({
      params: { id: 'u1' },
      body: { oldPassword: 'oldpass', newPassword: '123' },
    })
    const res = mockRes()

    // Act
    await changePassword(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('ユーザーが存在しない場合 404 を返す / returns 404 when user not found', async () => {
    // Arrange
    vi.mocked(User.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({
      params: { id: 'ghost' },
      body: { oldPassword: 'oldpass', newPassword: 'newSecure123' },
    })
    const res = mockRes()

    // Act
    await changePassword(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })
})
