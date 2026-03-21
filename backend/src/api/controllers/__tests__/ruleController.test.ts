/**
 * ruleController 单元测试 / ruleController ユニットテスト
 *
 * ルール定義 CRUD + 有効/無効切替 + テスト実行
 * 规则定义 CRUD + 启用/禁用切换 + 测试执行
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块mock声明 ─────────────────

vi.mock('@/models/ruleDefinition', () => ({
  RuleDefinition: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/services/ruleEngine', () => ({
  RuleEngine: {
    evaluate: vi.fn(),
  },
}))

vi.mock('@/schemas/ruleSchema', () => ({
  createRuleSchema: {
    safeParse: vi.fn(),
  },
  updateRuleSchema: {
    safeParse: vi.fn(),
  },
}))

vi.mock('@/lib/errors', () => ({
  AppError: class AppError extends Error {
    statusCode: number
    code: string
    details: any
    constructor(message: string, statusCode: number, code?: string, details?: any) {
      super(message)
      this.statusCode = statusCode
      this.code = code || 'ERROR'
      this.details = details
    }
  },
}))

import { RuleDefinition } from '@/models/ruleDefinition'
import { RuleEngine } from '@/services/ruleEngine'
import { createRuleSchema, updateRuleSchema } from '@/schemas/ruleSchema'
import {
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  testRule,
} from '@/api/controllers/ruleController'

// ─── テストユーティリティ / 测试工具函数 ───────────────────────────

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, headers: {}, user: { id: 'u1', tenantId: 'T1' }, ...overrides }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── テスト / 测试 ─────────────────────────────────────────────────

describe('ruleController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 一覧 / 列表
  describe('listRules', () => {
    it('ページネーション付きで一覧を返す / 带分页返回列表', async () => {
      const data = [{ _id: 'r1', name: 'Rule1' }]
      ;(RuleDefinition.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(data) }),
          }),
        }),
      })
      ;(RuleDefinition.countDocuments as any).mockResolvedValue(1)

      const res = mockRes()
      await listRules(mockReq({ query: { page: '1', limit: '50' } }), res)

      expect(res.json).toHaveBeenCalledWith({ data, total: 1, page: 1, limit: 50 })
    })

    it('module フィルターを適用 / 应用module过滤', async () => {
      ;(RuleDefinition.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      })
      ;(RuleDefinition.countDocuments as any).mockResolvedValue(0)

      const res = mockRes()
      await listRules(mockReq({ query: { module: 'shipping' } }), res)

      expect(RuleDefinition.find).toHaveBeenCalledWith(
        expect.objectContaining({ module: 'shipping' }),
      )
    })

    it('isActive フィルターを適用 / 应用isActive过滤', async () => {
      ;(RuleDefinition.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      })
      ;(RuleDefinition.countDocuments as any).mockResolvedValue(0)

      const res = mockRes()
      await listRules(mockReq({ query: { isActive: 'true' } }), res)

      expect(RuleDefinition.find).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      )
    })
  })

  // 詳細 / 详情
  describe('getRule', () => {
    it('存在するルールを返す / 返回存在的规则', async () => {
      const rule = { _id: 'r1', name: 'Rule1' }
      ;(RuleDefinition.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(rule) })

      const res = mockRes()
      await getRule(mockReq({ params: { id: 'r1' } }), res)

      expect(res.json).toHaveBeenCalledWith(rule)
    })

    it('存在しないルールで 404 / 不存在的规则返回404', async () => {
      ;(RuleDefinition.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const res = mockRes()
      await getRule(mockReq({ params: { id: 'none' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // 作成 / 创建
  describe('createRule', () => {
    it('バリデーション成功で 201 を返す / 验证成功返回201', async () => {
      const parsed = { name: 'NewRule', module: 'shipping', conditionGroups: [], actions: [] }
      ;(createRuleSchema.safeParse as any).mockReturnValue({ success: true, data: parsed })
      ;(RuleDefinition.create as any).mockResolvedValue({ _id: 'r1', ...parsed })

      const res = mockRes()
      await createRule(mockReq({ body: parsed }), res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'NewRule' }))
    })

    it('バリデーションエラーで 400 / 验证失败返回400', async () => {
      ;(createRuleSchema.safeParse as any).mockReturnValue({
        success: false,
        error: { flatten: () => ({ fieldErrors: { name: ['必須'] } }) },
      })

      const res = mockRes()
      await createRule(mockReq({ body: {} }), res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // 更新 / 更新
  describe('updateRule', () => {
    it('正常更新 / 正常更新', async () => {
      const mockRule: any = { _id: 'r1', name: 'Old', save: vi.fn().mockResolvedValue(undefined) }
      ;(updateRuleSchema.safeParse as any).mockReturnValue({ success: true, data: { name: 'Updated' } })
      ;(RuleDefinition.findById as any).mockResolvedValue(mockRule)

      const res = mockRes()
      await updateRule(mockReq({ params: { id: 'r1' }, body: { name: 'Updated' } }), res)

      expect(mockRule.save).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(mockRule)
    })

    it('存在しないルールで 404 / 不存在的规则返回404', async () => {
      ;(updateRuleSchema.safeParse as any).mockReturnValue({ success: true, data: {} })
      ;(RuleDefinition.findById as any).mockResolvedValue(null)

      const res = mockRes()
      await updateRule(mockReq({ params: { id: 'none' }, body: {} }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // 削除 / 删除
  describe('deleteRule', () => {
    it('正常削除 / 正常删除', async () => {
      ;(RuleDefinition.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'r1' }) })
      ;(RuleDefinition.findByIdAndDelete as any).mockResolvedValue({})

      const res = mockRes()
      await deleteRule(mockReq({ params: { id: 'r1' } }), res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('削除') }))
    })

    it('存在しないルールで 404 / 不存在的规则返回404', async () => {
      ;(RuleDefinition.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const res = mockRes()
      await deleteRule(mockReq({ params: { id: 'none' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // 有効/無効切替 / 启用/禁用切换
  describe('toggleRule', () => {
    it('isActive を反転する / 反转isActive', async () => {
      const mockRule: any = { _id: 'r1', isActive: true, save: vi.fn().mockResolvedValue(undefined) }
      ;(RuleDefinition.findById as any).mockResolvedValue(mockRule)

      const res = mockRes()
      await toggleRule(mockReq({ params: { id: 'r1' } }), res)

      expect(mockRule.isActive).toBe(false)
      expect(mockRule.save).toHaveBeenCalled()
    })

    it('存在しないルールで 404 / 不存在的规则返回404', async () => {
      ;(RuleDefinition.findById as any).mockResolvedValue(null)

      const res = mockRes()
      await toggleRule(mockReq({ params: { id: 'none' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // テスト実行 / 测试执行
  describe('testRule', () => {
    it('ルールマッチ結果を返す / 返回规则匹配结果', async () => {
      const matched = [{ _id: 'r1', name: 'Rule1' }]
      ;(RuleEngine.evaluate as any).mockResolvedValue(matched)

      const res = mockRes()
      await testRule(
        mockReq({ body: { module: 'shipping', context: { weight: 10 } } }),
        res,
      )

      expect(RuleEngine.evaluate).toHaveBeenCalledWith('shipping', { weight: 10 })
      expect(res.json).toHaveBeenCalledWith({ matchedRules: matched })
    })

    it('module か context が無い場合 400 / 缺少module或context返回400', async () => {
      const res = mockRes()
      await testRule(mockReq({ body: { module: 'shipping' } }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })
})
