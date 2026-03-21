/**
 * marketplaceController 単元テスト / marketplaceController 单元测试
 *
 * マーケットプレイス連携スタブの動作を検証。
 * 验证电商平台连接桩的行为。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言 / 模块Mock声明 ──────────

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import {
  listProviders,
  connectProvider,
  syncOrders,
  syncStock,
  getProviderStatus,
} from '../marketplaceController'

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

describe('marketplaceController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === プロバイダー一覧 / 平台列表 ===
  describe('listProviders', () => {
    it('全プロバイダーを返す / 返回所有平台', async () => {
      const req = mockReq()
      const res = mockRes()
      await listProviders(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          providers: expect.arrayContaining([
            expect.objectContaining({ name: 'amazon', status: 'not_configured' }),
            expect.objectContaining({ name: 'shopify', status: 'not_configured' }),
          ]),
        }),
      )
      const { providers } = res.json.mock.calls[0][0]
      expect(providers).toHaveLength(7)
    })
  })

  // === プロバイダー接続 / 平台连接 ===
  describe('connectProvider', () => {
    it('有効なプロバイダーでスタブ応答を返す / 有效平台返回桩响应', async () => {
      const req = mockReq({ params: { provider: 'amazon' } })
      const res = mockRes()
      await connectProvider(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'not_configured', provider: 'amazon' }),
      )
    })

    it('無効なプロバイダーで 400 を返す / 无效平台返回 400', async () => {
      const req = mockReq({ params: { provider: 'invalid_platform' } })
      const res = mockRes()
      await connectProvider(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', supportedProviders: expect.any(Array) }),
      )
    })
  })

  // === 注文同期 / 订单同步 ===
  describe('syncOrders', () => {
    it('有効なプロバイダーでスタブ応答 / 有效平台返回桩响应', async () => {
      const req = mockReq({ params: { provider: 'rakuten' } })
      const res = mockRes()
      await syncOrders(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'not_configured', provider: 'rakuten' }),
      )
    })

    it('無効なプロバイダーで 400 / 无效平台返回 400', async () => {
      const req = mockReq({ params: { provider: 'ebay' } })
      const res = mockRes()
      await syncOrders(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // === 在庫同期 / 库存同步 ===
  describe('syncStock', () => {
    it('有効なプロバイダーでスタブ応答 / 有效平台返回桩响应', async () => {
      const req = mockReq({ params: { provider: 'yahoo' } })
      const res = mockRes()
      await syncStock(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'not_configured', provider: 'yahoo' }),
      )
    })

    it('無効なプロバイダーで 400 / 无效平台返回 400', async () => {
      const req = mockReq({ params: { provider: 'wish' } })
      const res = mockRes()
      await syncStock(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // === ステータス照会 / 状态查询 ===
  describe('getProviderStatus', () => {
    it('有効なプロバイダーのステータスを返す / 返回有效平台的状态', async () => {
      const req = mockReq({ params: { provider: 'shopify' } })
      const res = mockRes()
      await getProviderStatus(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'shopify',
          status: 'not_configured',
          connectedAt: null,
          lastSyncAt: null,
        }),
      )
    })

    it('無効なプロバイダーで 400 / 无效平台返回 400', async () => {
      const req = mockReq({ params: { provider: 'nonexistent' } })
      const res = mockRes()
      await getProviderStatus(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })
})
