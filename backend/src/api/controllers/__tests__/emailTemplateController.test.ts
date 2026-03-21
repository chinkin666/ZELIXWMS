/**
 * emailTemplateController 统合テスト / Email Template Controller Integration Tests
 *
 * EmailTemplate モデル層を通じたテンプレート操作の HTTP フローを検証する。
 * Verifies HTTP flow for email template CRUD operations through the model layer.
 *
 * モック方針 / Mock strategy:
 * - EmailTemplate モデルをすべてモック（DB不要）
 *   Mock the EmailTemplate model to eliminate DB dependency
 * - 全ハンドラーのハッピーパスとエラーパスを網羅
 *   Cover happy path and error paths for every handler
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/emailTemplate', () => ({
  EmailTemplate: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

import { EmailTemplate } from '@/models/emailTemplate'
import {
  listEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  previewEmailTemplate,
} from '@/api/controllers/emailTemplateController'

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

/**
 * サンプルテンプレートデータ / Sample template data
 */
const sampleTemplate = {
  _id: 'tpl-001',
  name: '出荷通知テンプレート',
  carrierId: null,
  carrierName: 'ヤマト運輸',
  isActive: true,
  senderName: '株式会社テスト',
  senderEmail: 'no-reply@test.com',
  replyToEmail: '',
  subject: '【出荷完了】{{orderNumber}} のお知らせ',
  bodyTemplate: '{{customerName}} 様\n\nご注文 {{orderNumber}} が出荷されました。',
  footerText: '本メールは自動送信です。',
  isDefault: false,
}

// ─── listEmailTemplates ─────────────────────────────────────────

describe('listEmailTemplates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('フィルタなしで全テンプレートを返す / returns all templates without filters', async () => {
    // Arrange
    const fakeTemplates = [sampleTemplate]
    vi.mocked(EmailTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(fakeTemplates),
          }),
        }),
      }),
    } as any)
    vi.mocked(EmailTemplate.countDocuments).mockResolvedValue(1)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listEmailTemplates(req, res)

    // Assert: 空フィルタでモデルが呼ばれる / model called with empty filter
    expect(EmailTemplate.find).toHaveBeenCalledWith({})
    expect(res.json).toHaveBeenCalledWith({ data: fakeTemplates, total: 1 })
  })

  it('carrierId クエリでフィルタを構築する / builds carrierId filter from query', async () => {
    // Arrange
    vi.mocked(EmailTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(EmailTemplate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { carrierId: 'carrier-123' } })
    const res = mockRes()

    // Act
    await listEmailTemplates(req, res)

    // Assert: carrierId フィルタが適用される / carrierId filter applied
    expect(EmailTemplate.find).toHaveBeenCalledWith(
      expect.objectContaining({ carrierId: 'carrier-123' }),
    )
  })

  it('空白の carrierId は無視される / blank carrierId is ignored', async () => {
    // Arrange
    vi.mocked(EmailTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(EmailTemplate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { carrierId: '   ' } })
    const res = mockRes()

    // Act
    await listEmailTemplates(req, res)

    // Assert: フィルタに carrierId が含まれない / carrierId not included in filter
    const callArg = (vi.mocked(EmailTemplate.find).mock.calls[0] as any)?.[0] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('carrierId')
  })

  it('isActive=true フィルタが適用される / applies isActive=true filter', async () => {
    // Arrange
    vi.mocked(EmailTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(EmailTemplate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { isActive: 'true' } })
    const res = mockRes()

    // Act
    await listEmailTemplates(req, res)

    // Assert
    expect(EmailTemplate.find).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    )
  })

  it('isActive=false フィルタが適用される / applies isActive=false filter', async () => {
    // Arrange
    vi.mocked(EmailTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(EmailTemplate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { isActive: 'false' } })
    const res = mockRes()

    // Act
    await listEmailTemplates(req, res)

    // Assert
    expect(EmailTemplate.find).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    )
  })

  it('無効な isActive 値は無視される / invalid isActive value is ignored', async () => {
    // Arrange
    vi.mocked(EmailTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(EmailTemplate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { isActive: 'maybe' } })
    const res = mockRes()

    // Act
    await listEmailTemplates(req, res)

    // Assert: isActive がフィルタに含まれない / isActive not in filter
    const callArg = (vi.mocked(EmailTemplate.find).mock.calls[0] as any)?.[0] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('isActive')
  })

  it('page と limit でページネーションが適用される / applies pagination with page and limit', async () => {
    // Arrange
    const chainMock = {
      sort: vi.fn(),
    }
    const skipMock = vi.fn()
    const limitMock = vi.fn()
    const leanMock = vi.fn().mockResolvedValue([])

    limitMock.mockReturnValue({ lean: leanMock })
    skipMock.mockReturnValue({ limit: limitMock })
    chainMock.sort.mockReturnValue({ skip: skipMock })
    vi.mocked(EmailTemplate.find).mockReturnValue(chainMock as any)
    vi.mocked(EmailTemplate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { page: '2', limit: '10' } })
    const res = mockRes()

    // Act
    await listEmailTemplates(req, res)

    // Assert: skip=10 (page2, limit10), limit=10 / skip and limit applied correctly
    expect(skipMock).toHaveBeenCalledWith(10)
    expect(limitMock).toHaveBeenCalledWith(10)
  })

  it('limit の上限は 200 に制限される / limit is capped at 200', async () => {
    // Arrange
    const skipMock = vi.fn()
    const limitMock = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
    skipMock.mockReturnValue({ limit: limitMock })
    vi.mocked(EmailTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ skip: skipMock }),
    } as any)
    vi.mocked(EmailTemplate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { limit: '9999' } })
    const res = mockRes()

    // Act
    await listEmailTemplates(req, res)

    // Assert: 最大 200 に制限される / capped at 200
    expect(limitMock).toHaveBeenCalledWith(200)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(EmailTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockRejectedValue(new Error('DB connection lost')),
          }),
        }),
      }),
    } as any)
    vi.mocked(EmailTemplate.countDocuments).mockResolvedValue(0)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listEmailTemplates(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'メールテンプレートの取得に失敗しました' }),
    )
  })
})

// ─── getEmailTemplate ───────────────────────────────────────────

describe('getEmailTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存テンプレートを ID で取得する / retrieves existing template by ID', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sampleTemplate),
    } as any)

    const req = mockReq({ params: { id: 'tpl-001' } })
    const res = mockRes()

    // Act
    await getEmailTemplate(req, res)

    // Assert
    expect(EmailTemplate.findById).toHaveBeenCalledWith('tpl-001')
    expect(res.json).toHaveBeenCalledWith(sampleTemplate)
  })

  it('存在しないテンプレートで 404 を返す / returns 404 when template not found', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'メールテンプレートが見つかりません' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('connection error')),
    } as any)

    const req = mockReq({ params: { id: 'tpl-001' } })
    const res = mockRes()

    // Act
    await getEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'メールテンプレートの取得に失敗しました' }),
    )
  })
})

// ─── createEmailTemplate ────────────────────────────────────────

describe('createEmailTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  const validBody = {
    name: '出荷通知',
    senderName: '株式会社テスト',
    senderEmail: 'no-reply@test.com',
    subject: '出荷完了のお知らせ',
    bodyTemplate: '{{customerName}} 様、ご注文が出荷されました。',
  }

  it('必須フィールドが揃った場合に 201 で作成する / creates template and returns 201 on valid input', async () => {
    // Arrange
    const created = { ...sampleTemplate, toObject: () => sampleTemplate }
    vi.mocked(EmailTemplate.create).mockResolvedValue(created as any)

    const req = mockReq({ body: validBody })
    const res = mockRes()

    // Act
    await createEmailTemplate(req, res)

    // Assert: 201 で作成されたオブジェクトを返す / returns created object with 201
    expect(EmailTemplate.create).toHaveBeenCalledOnce()
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(sampleTemplate)
  })

  it('isDefault=true の場合に既存デフォルトをリセットする / resets existing defaults when isDefault=true', async () => {
    // Arrange
    vi.mocked(EmailTemplate.updateMany).mockResolvedValue({ modifiedCount: 1 } as any)
    const created = { ...sampleTemplate, isDefault: true, toObject: () => ({ ...sampleTemplate, isDefault: true }) }
    vi.mocked(EmailTemplate.create).mockResolvedValue(created as any)

    const req = mockReq({ body: { ...validBody, isDefault: true, carrierId: 'carrier-abc' } })
    const res = mockRes()

    // Act
    await createEmailTemplate(req, res)

    // Assert: updateMany でデフォルトがクリアされる / updateMany clears existing defaults
    expect(EmailTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: true, carrierId: 'carrier-abc' }),
      { isDefault: false },
    )
  })

  it('isDefault=true かつ carrierId なしの場合 carrierId=null でリセット / resets with carrierId=null when no carrierId', async () => {
    // Arrange
    vi.mocked(EmailTemplate.updateMany).mockResolvedValue({ modifiedCount: 0 } as any)
    const created = { ...sampleTemplate, isDefault: true, toObject: () => sampleTemplate }
    vi.mocked(EmailTemplate.create).mockResolvedValue(created as any)

    const req = mockReq({ body: { ...validBody, isDefault: true } })
    const res = mockRes()

    // Act
    await createEmailTemplate(req, res)

    // Assert: carrierId=null でフィルタ / filter uses carrierId=null
    expect(EmailTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: true, carrierId: null }),
      { isDefault: false },
    )
  })

  it('name が空の場合 400 を返す / returns 400 when name is empty', async () => {
    // Arrange
    const req = mockReq({ body: { ...validBody, name: '' } })
    const res = mockRes()

    // Act
    await createEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'テンプレート名は必須です' })
    expect(EmailTemplate.create).not.toHaveBeenCalled()
  })

  it('name が空白のみの場合 400 を返す / returns 400 when name is whitespace only', async () => {
    // Arrange
    const req = mockReq({ body: { ...validBody, name: '   ' } })
    const res = mockRes()

    // Act
    await createEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'テンプレート名は必須です' })
  })

  it('name が欠落している場合 400 を返す / returns 400 when name is missing', async () => {
    // Arrange
    const { name: _n, ...bodyWithoutName } = validBody
    const req = mockReq({ body: bodyWithoutName })
    const res = mockRes()

    // Act
    await createEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'テンプレート名は必須です' })
  })

  it('senderName が空の場合 400 を返す / returns 400 when senderName is empty', async () => {
    // Arrange
    const req = mockReq({ body: { ...validBody, senderName: '' } })
    const res = mockRes()

    // Act
    await createEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: '発送元名は必須です' })
  })

  it('senderEmail が空の場合 400 を返す / returns 400 when senderEmail is empty', async () => {
    // Arrange
    const req = mockReq({ body: { ...validBody, senderEmail: '' } })
    const res = mockRes()

    // Act
    await createEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: '送信元メールアドレスは必須です' })
  })

  it('subject が空の場合 400 を返す / returns 400 when subject is empty', async () => {
    // Arrange
    const req = mockReq({ body: { ...validBody, subject: '' } })
    const res = mockRes()

    // Act
    await createEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'メールタイトルは必須です' })
  })

  it('bodyTemplate が空の場合 400 を返す / returns 400 when bodyTemplate is empty', async () => {
    // Arrange
    const req = mockReq({ body: { ...validBody, bodyTemplate: '' } })
    const res = mockRes()

    // Act
    await createEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'メール本文テンプレートは必須です' })
  })

  it('オプションフィールドのデフォルト値が設定される / optional fields get default values', async () => {
    // Arrange
    const created = { ...sampleTemplate, toObject: () => sampleTemplate }
    vi.mocked(EmailTemplate.create).mockResolvedValue(created as any)

    const req = mockReq({ body: validBody })
    const res = mockRes()

    // Act
    await createEmailTemplate(req, res)

    // Assert: carrierId=null, isActive=true, isDefault=false がデフォルト
    // carrierId=null, isActive=true, isDefault=false are defaults
    expect(EmailTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        carrierId: null,
        isActive: true,
        isDefault: false,
        carrierName: '',
        replyToEmail: '',
        footerText: '',
      }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(EmailTemplate.create).mockRejectedValue(new Error('insert failed'))

    const req = mockReq({ body: validBody })
    const res = mockRes()

    // Act
    await createEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'メールテンプレートの作成に失敗しました' }),
    )
  })
})

// ─── updateEmailTemplate ────────────────────────────────────────

describe('updateEmailTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存テンプレートを正常に更新する / updates existing template successfully', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sampleTemplate),
    } as any)
    const updated = { ...sampleTemplate, name: '更新後テンプレート' }
    vi.mocked(EmailTemplate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updated),
    } as any)

    const req = mockReq({ params: { id: 'tpl-001' }, body: { name: '更新後テンプレート' } })
    const res = mockRes()

    // Act
    await updateEmailTemplate(req, res)

    // Assert: 更新されたテンプレートを返す / returns updated template
    expect(EmailTemplate.findByIdAndUpdate).toHaveBeenCalledWith(
      'tpl-001',
      expect.objectContaining({ name: '更新後テンプレート' }),
      { new: true, runValidators: true },
    )
    expect(res.json).toHaveBeenCalledWith(updated)
  })

  it('isDefault=true の場合に既存デフォルトをリセットする / resets existing defaults when isDefault=true', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sampleTemplate),
    } as any)
    vi.mocked(EmailTemplate.updateMany).mockResolvedValue({ modifiedCount: 1 } as any)
    const updated = { ...sampleTemplate, isDefault: true }
    vi.mocked(EmailTemplate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updated),
    } as any)

    const req = mockReq({ params: { id: 'tpl-001' }, body: { isDefault: true } })
    const res = mockRes()

    // Act
    await updateEmailTemplate(req, res)

    // Assert: 他のデフォルトがクリアされる / other defaults are cleared
    expect(EmailTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: true }),
      { isDefault: false },
    )
  })

  it('isDefault=true かつ carrierId 指定で正しくフィルタ / uses specified carrierId when isDefault=true with carrierId', async () => {
    // Arrange
    const existingWithCarrier = { ...sampleTemplate, carrierId: 'carrier-abc' }
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(existingWithCarrier),
    } as any)
    vi.mocked(EmailTemplate.updateMany).mockResolvedValue({ modifiedCount: 0 } as any)
    vi.mocked(EmailTemplate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(existingWithCarrier),
    } as any)

    const req = mockReq({ params: { id: 'tpl-001' }, body: { isDefault: true, carrierId: 'carrier-new' } })
    const res = mockRes()

    // Act
    await updateEmailTemplate(req, res)

    // Assert: 新しい carrierId でフィルタ / filter uses new carrierId
    expect(EmailTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ carrierId: 'carrier-new' }),
      { isDefault: false },
    )
  })

  it('isDefault=true かつ carrierId 未指定は既存値を使用する / uses existing carrierId when isDefault=true without carrierId', async () => {
    // Arrange
    const existingWithCarrier = { ...sampleTemplate, carrierId: 'carrier-existing' }
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(existingWithCarrier),
    } as any)
    vi.mocked(EmailTemplate.updateMany).mockResolvedValue({ modifiedCount: 0 } as any)
    vi.mocked(EmailTemplate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(existingWithCarrier),
    } as any)

    const req = mockReq({ params: { id: 'tpl-001' }, body: { isDefault: true } })
    const res = mockRes()

    // Act
    await updateEmailTemplate(req, res)

    // Assert: 既存の carrierId を使用 / uses existing carrierId
    expect(EmailTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ carrierId: 'carrier-existing' }),
      { isDefault: false },
    )
  })

  it('テンプレートが存在しない場合 404 を返す（findById 時）/ returns 404 when template not found at findById', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { name: '更新' } })
    const res = mockRes()

    // Act
    await updateEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'メールテンプレートが見つかりません' })
    expect(EmailTemplate.findByIdAndUpdate).not.toHaveBeenCalled()
  })

  it('findByIdAndUpdate が null を返す場合 404 を返す / returns 404 when findByIdAndUpdate returns null', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sampleTemplate),
    } as any)
    vi.mocked(EmailTemplate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'tpl-001' }, body: { name: '更新' } })
    const res = mockRes()

    // Act
    await updateEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'メールテンプレートが見つかりません' })
  })

  it('undefined フィールドは updateData に含まれない / undefined fields are not included in updateData', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sampleTemplate),
    } as any)
    vi.mocked(EmailTemplate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sampleTemplate),
    } as any)

    // name のみ送信、他フィールドは undefined / only name sent, others are undefined
    const req = mockReq({ params: { id: 'tpl-001' }, body: { name: '新しい名前' } })
    const res = mockRes()

    // Act
    await updateEmailTemplate(req, res)

    // Assert: updateData に name のみ含まれる / updateData only contains name
    const updateArg = (vi.mocked(EmailTemplate.findByIdAndUpdate).mock.calls[0] as any)?.[1] as Record<string, unknown>
    expect(updateArg).toHaveProperty('name', '新しい名前')
    expect(updateArg).not.toHaveProperty('senderEmail')
    expect(updateArg).not.toHaveProperty('subject')
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB down')),
    } as any)

    const req = mockReq({ params: { id: 'tpl-001' }, body: { name: '更新' } })
    const res = mockRes()

    // Act
    await updateEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'メールテンプレートの更新に失敗しました' }),
    )
  })
})

// ─── deleteEmailTemplate ────────────────────────────────────────

describe('deleteEmailTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('テンプレートを削除し確認メッセージを返す / deletes template and returns confirmation', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sampleTemplate),
    } as any)

    const req = mockReq({ params: { id: 'tpl-001' } })
    const res = mockRes()

    // Act
    await deleteEmailTemplate(req, res)

    // Assert: 削除確認レスポンス / deletion confirmation response
    expect(EmailTemplate.findByIdAndDelete).toHaveBeenCalledWith('tpl-001')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Deleted', id: sampleTemplate._id }),
    )
  })

  it('存在しないテンプレートの削除で 404 を返す / returns 404 when deleting non-existent template', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await deleteEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'メールテンプレートが見つかりません' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('delete failed')),
    } as any)

    const req = mockReq({ params: { id: 'tpl-001' } })
    const res = mockRes()

    // Act
    await deleteEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'メールテンプレートの削除に失敗しました' }),
    )
  })
})

// ─── previewEmailTemplate ───────────────────────────────────────

describe('previewEmailTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('テンプレートプレビューを HTML 付きで返す / returns template preview with HTML', async () => {
    // Arrange
    const templateWithPlaceholders = {
      ...sampleTemplate,
      subject: '【出荷完了】{{orderNumber}} のお知らせ',
      bodyTemplate: '{{customerName}} 様\n\nご注文 {{orderNumber}} が出荷されました。',
      footerText: '発送元: {{senderName}}',
    }
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(templateWithPlaceholders),
    } as any)

    const req = mockReq({ body: { templateId: 'tpl-001' } })
    const res = mockRes()

    // Act
    await previewEmailTemplate(req, res)

    // Assert: subject, body, footer, html が返される / subject, body, footer, html are returned
    expect(EmailTemplate.findById).toHaveBeenCalledWith('tpl-001')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('ORD-2026-0001'),
        body: expect.stringContaining('山田 太郎'),
        footer: expect.stringContaining('株式会社テスト'),
        html: expect.stringContaining('<div'),
      }),
    )
  })

  it('カスタム sampleData でプレースホルダーが置換される / custom sampleData replaces placeholders', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sampleTemplate),
    } as any)

    const req = mockReq({
      body: {
        templateId: 'tpl-001',
        sampleData: { customerName: '田中 花子', orderNumber: 'ORD-CUSTOM-999' },
      },
    })
    const res = mockRes()

    // Act
    await previewEmailTemplate(req, res)

    // Assert: カスタムデータが使われる / custom data is used
    const callArg = (vi.mocked(res.json).mock.calls[0] as any)?.[0] as Record<string, unknown>
    expect(callArg.body as string).toContain('田中 花子')
    expect(callArg.subject as string).toContain('ORD-CUSTOM-999')
  })

  it('footerText が空の場合 footer は空文字になる / footer is empty string when footerText is empty', async () => {
    // Arrange
    const templateNoFooter = { ...sampleTemplate, footerText: '' }
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(templateNoFooter),
    } as any)

    const req = mockReq({ body: { templateId: 'tpl-001' } })
    const res = mockRes()

    // Act
    await previewEmailTemplate(req, res)

    // Assert: footer は空文字 / footer is empty string
    const callArg = (vi.mocked(res.json).mock.calls[0] as any)?.[0] as Record<string, unknown>
    expect(callArg.footer).toBe('')
  })

  it('HTML に特殊文字がエスケープされる / HTML special characters are escaped', async () => {
    // Arrange
    const templateWithXss = {
      ...sampleTemplate,
      subject: '<script>alert("xss")</script>',
      bodyTemplate: 'テスト & "クォート" <タグ>',
      footerText: '',
    }
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(templateWithXss),
    } as any)

    const req = mockReq({ body: { templateId: 'tpl-001' } })
    const res = mockRes()

    // Act
    await previewEmailTemplate(req, res)

    // Assert: HTML エスケープされている / HTML is escaped
    const callArg = (vi.mocked(res.json).mock.calls[0] as any)?.[0] as Record<string, unknown>
    expect(callArg.html as string).toContain('&lt;script&gt;')
    expect(callArg.html as string).toContain('&amp;')
    expect(callArg.html as string).toContain('&quot;')
    expect(callArg.html as string).not.toContain('<script>')
  })

  it('templateId が欠落している場合 400 を返す / returns 400 when templateId is missing', async () => {
    // Arrange
    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await previewEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'テンプレートIDは必須です' })
    expect(EmailTemplate.findById).not.toHaveBeenCalled()
  })

  it('テンプレートが存在しない場合 404 を返す / returns 404 when template not found', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ body: { templateId: 'ghost-id' } })
    const res = mockRes()

    // Act
    await previewEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'メールテンプレートが見つかりません' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('lookup failed')),
    } as any)

    const req = mockReq({ body: { templateId: 'tpl-001' } })
    const res = mockRes()

    // Act
    await previewEmailTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'プレビューの生成に失敗しました' }),
    )
  })

  it('複数のプレースホルダーが正しく置換される / multiple placeholders are all replaced', async () => {
    // Arrange
    const multiPlaceholderTemplate = {
      ...sampleTemplate,
      subject: '{{orderNumber}} - {{carrierName}}',
      bodyTemplate: '{{customerName}} / {{trackingNumber}} / {{shippingDate}} / {{itemList}}',
      footerText: '{{senderName}}',
    }
    vi.mocked(EmailTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(multiPlaceholderTemplate),
    } as any)

    const req = mockReq({ body: { templateId: 'tpl-001' } })
    const res = mockRes()

    // Act
    await previewEmailTemplate(req, res)

    // Assert: 全プレースホルダーが置換される / all placeholders replaced
    const callArg = (vi.mocked(res.json).mock.calls[0] as any)?.[0] as Record<string, unknown>
    // デフォルトサンプルデータが使われる / default sample data is used
    expect(callArg.subject as string).not.toContain('{{')
    expect(callArg.body as string).not.toContain('{{')
    expect(callArg.footer as string).not.toContain('{{')
  })
})
