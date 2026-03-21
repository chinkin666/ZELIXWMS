/**
 * packingRuleController 単元テスト / packingRuleController 单元测试
 *
 * 梱包ルールの CRUD・ルール評価を検証。
 * 验证梱包规则的 CRUD、规则评估。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言 / 模块Mock声明 ──────────

vi.mock('@/models/packingRule', () => ({
  PackingRule: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}))

vi.mock('@/models/product', () => ({
  Product: {
    find: vi.fn(),
  },
}))

vi.mock('@/models/material', () => ({
  Material: {
    find: vi.fn(),
  },
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn(),
}))

import { PackingRule } from '@/models/packingRule'
import { Product } from '@/models/product'
import { Material } from '@/models/material'
import { getTenantId } from '@/api/helpers/tenantHelper'
import {
  listPackingRules,
  createPackingRule,
  updatePackingRule,
  deletePackingRule,
  evaluatePackingRules,
} from '../packingRuleController'

// ─── テストユーティリティ / 测试工具 ────────────────────────

const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'T1' },
    ...overrides,
  }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── テスト本体 / 测试主体 ────────────────────────

describe('packingRuleController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTenantId).mockReturnValue('T1')
  })

  // === 一覧取得 / 列表获取 ===
  describe('listPackingRules', () => {
    it('優先度順で一覧を返す / 按优先级顺序返回列表', async () => {
      const rules = [{ _id: '1', name: 'Small', priority: 1 }]
      const chain = { sort: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(rules) }
      vi.mocked(PackingRule.find).mockReturnValue(chain as any)

      const req = mockReq()
      const res = mockRes()
      await listPackingRules(req, res)

      expect(res.json).toHaveBeenCalledWith(rules)
    })

    it('tenantId フィルター適用 / 应用 tenantId 过滤', async () => {
      const chain = { sort: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) }
      vi.mocked(PackingRule.find).mockReturnValue(chain as any)

      const req = mockReq({ query: { tenantId: 'T2' } })
      const res = mockRes()
      await listPackingRules(req, res)

      expect(PackingRule.find).toHaveBeenCalledWith({ tenantId: 'T2' })
    })
  })

  // === 作成 / 创建 ===
  describe('createPackingRule', () => {
    it('有効なデータで 201 を返す / 有效数据返回 201', async () => {
      const created = { toObject: () => ({ _id: 'r1', name: 'SmallBox', priority: 1 }) }
      vi.mocked(PackingRule.create).mockResolvedValue(created as any)

      const req = mockReq({
        body: { name: 'SmallBox', priority: 1, materials: [{ materialSku: 'MAT1', quantity: 1 }] },
      })
      const res = mockRes()
      await createPackingRule(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('name が空の場合 400 / name 为空时返回 400', async () => {
      const req = mockReq({ body: { name: '', materials: [{ materialSku: 'MAT1', quantity: 1 }] } })
      const res = mockRes()
      await createPackingRule(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('materials が空の場合 400 / materials 为空时返回 400', async () => {
      const req = mockReq({ body: { name: 'Rule1', materials: [] } })
      const res = mockRes()
      await createPackingRule(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // === 更新 / 更新 ===
  describe('updatePackingRule', () => {
    it('更新成功 / 更新成功', async () => {
      const updated = { _id: 'r1', name: 'Updated' }
      const chain = { lean: vi.fn().mockResolvedValue(updated) }
      vi.mocked(PackingRule.findByIdAndUpdate).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: 'r1' }, body: { name: 'Updated' } })
      const res = mockRes()
      await updatePackingRule(req, res)

      expect(res.json).toHaveBeenCalledWith(updated)
    })

    it('存在しない場合 404 / 不存在时返回 404', async () => {
      const chain = { lean: vi.fn().mockResolvedValue(null) }
      vi.mocked(PackingRule.findByIdAndUpdate).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: 'bad' }, body: { name: 'X' } })
      const res = mockRes()
      await updatePackingRule(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('name が空文字の場合 400 / name 为空字符串时返回 400', async () => {
      const req = mockReq({ params: { id: 'r1' }, body: { name: '  ' } })
      const res = mockRes()
      await updatePackingRule(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // === 削除 / 删除 ===
  describe('deletePackingRule', () => {
    it('削除成功 / 删除成功', async () => {
      const chain = { lean: vi.fn().mockResolvedValue({ _id: 'r1' }) }
      vi.mocked(PackingRule.findByIdAndDelete).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: 'r1' } })
      const res = mockRes()
      await deletePackingRule(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }))
    })

    it('存在しない場合 404 / 不存在时返回 404', async () => {
      const chain = { lean: vi.fn().mockResolvedValue(null) }
      vi.mocked(PackingRule.findByIdAndDelete).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: 'bad' } })
      const res = mockRes()
      await deletePackingRule(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // === ルール評価 / 规则评估 ===
  describe('evaluatePackingRules', () => {
    it('マッチするルールの耗材を返す / 返回匹配规则的耗材', async () => {
      // 商品マスター / 商品主数据
      const productChain = { lean: vi.fn().mockResolvedValue([{ sku: 'SKU1', weight: 100, width: 10, depth: 10, height: 10 }]) }
      vi.mocked(Product.find).mockReturnValue(productChain as any)

      // 梱包ルール / 梱包规则
      const rules = [{
        _id: 'r1',
        name: 'SmallBox',
        conditions: { maxWeight: 500 },
        materials: [{ materialSku: 'BOX-S', materialName: 'Small Box', quantity: 1 }],
      }]
      const ruleChain = { sort: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(rules) }
      vi.mocked(PackingRule.find).mockReturnValue(ruleChain as any)

      // 耗材マスター / 耗材主数据
      const materialChain = { lean: vi.fn().mockResolvedValue([{ sku: 'BOX-S', name: 'Small Box', unitCost: 50 }]) }
      vi.mocked(Material.find).mockReturnValue(materialChain as any)

      const req = mockReq({
        body: { products: [{ sku: 'SKU1', quantity: 1 }] },
      })
      const res = mockRes()
      await evaluatePackingRules(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ rule: 'SmallBox', materials: expect.any(Array) }),
      )
    })

    it('products が空の場合 400 / products 为空时返回 400', async () => {
      const req = mockReq({ body: { products: [] } })
      const res = mockRes()
      await evaluatePackingRules(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('マッチなしの場合 null を返す / 无匹配时返回 null', async () => {
      const productChain = { lean: vi.fn().mockResolvedValue([]) }
      vi.mocked(Product.find).mockReturnValue(productChain as any)

      const ruleChain = { sort: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) }
      vi.mocked(PackingRule.find).mockReturnValue(ruleChain as any)

      const req = mockReq({ body: { products: [{ sku: 'SKU1', quantity: 1 }] } })
      const res = mockRes()
      await evaluatePackingRules(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ rule: null, materials: [] }),
      )
    })
  })
})
