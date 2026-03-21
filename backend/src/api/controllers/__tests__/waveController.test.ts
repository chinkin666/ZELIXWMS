/**
 * waveController テスト / Wave Controller Tests
 *
 * ウェーブ管理の HTTP フローを検証する。
 * 验证波次管理的 HTTP 流程。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ウェーブモデルのモック / 波次模型 mock
vi.mock('@/models/wave', () => ({
  Wave: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndDelete: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

import { Wave } from '@/models/wave'
import {
  listWaves,
  getWave,
  createWave,
  updateWave,
  deleteWave,
  startWave,
  completeWave,
} from '../waveController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, headers: {}, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('waveController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listWaves', () => {
    it('ウェーブ一覧を返す / 返回波次列表', async () => {
      const mockData = [{ _id: 'w1', waveNumber: 'WAVE-001', status: 'draft' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(Wave.find).mockReturnValue(chainMock as any)
      vi.mocked(Wave.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listWaves(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockData, total: 1 }))
    })

    it('フィルタが適用される / 应用过滤器', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(Wave.find).mockReturnValue(chainMock as any)
      vi.mocked(Wave.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { warehouseId: 'wh1', status: 'draft', search: 'テスト' } })
      const res = mockRes()
      await listWaves(req, res)

      const filter = vi.mocked(Wave.find).mock.calls[0][0] as any
      expect(filter.warehouseId).toBe('wh1')
      expect(filter.status).toBe('draft')
      expect(filter.$or).toBeDefined()
    })

    it('500エラーを返す / 返回500错误', async () => {
      vi.mocked(Wave.find).mockImplementation(() => { throw new Error('DB error') })

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listWaves(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getWave', () => {
    it('ウェーブを返す / 返回波次', async () => {
      const mockWave = { _id: 'w1', waveNumber: 'WAVE-001' }
      vi.mocked(Wave.findById).mockReturnValue({ populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(mockWave) }) } as any)

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await getWave(req, res)

      expect(res.json).toHaveBeenCalledWith(mockWave)
    })

    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(Wave.findById).mockReturnValue({ populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await getWave(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('createWave', () => {
    it('waveNumberが空の場合400を返す / waveNumber为空时返回400', async () => {
      const req = mockReq({ body: { warehouseId: 'wh1' } })
      const res = mockRes()
      await createWave(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('warehouseIdが空の場合400を返す / warehouseId为空时返回400', async () => {
      const req = mockReq({ body: { waveNumber: 'WAVE-001' } })
      const res = mockRes()
      await createWave(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('ウェーブ番号重複の場合409を返す / 波次号重复时返回409', async () => {
      vi.mocked(Wave.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({ waveNumber: 'WAVE-001' }) } as any)

      const req = mockReq({ body: { waveNumber: 'WAVE-001', warehouseId: 'wh1' } })
      const res = mockRes()
      await createWave(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('正常に作成される / 正常创建', async () => {
      vi.mocked(Wave.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)
      vi.mocked(Wave.create).mockResolvedValue({ _id: 'w1', waveNumber: 'WAVE-001' } as any)

      const req = mockReq({ body: { waveNumber: 'WAVE-001', warehouseId: 'wh1' } })
      const res = mockRes()
      await createWave(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('500エラーを返す / 返回500错误', async () => {
      vi.mocked(Wave.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)
      vi.mocked(Wave.create).mockRejectedValue(new Error('DB error'))

      const req = mockReq({ body: { waveNumber: 'WAVE-001', warehouseId: 'wh1' } })
      const res = mockRes()
      await createWave(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('updateWave', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(Wave.findById).mockResolvedValue(null)

      const req = mockReq({ params: { id: 'nonexistent' }, body: { memo: '更新' } })
      const res = mockRes()
      await updateWave(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常に更新される / 正常更新', async () => {
      const mockWave = {
        _id: 'w1',
        waveNumber: 'WAVE-001',
        save: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(Wave.findById).mockResolvedValue(mockWave as any)

      const req = mockReq({ params: { id: 'w1' }, body: { memo: '更新メモ' } })
      const res = mockRes()
      await updateWave(req, res)

      expect(res.json).toHaveBeenCalledWith(mockWave)
    })
  })

  describe('deleteWave', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(Wave.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await deleteWave(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('ドラフト以外は削除不可 / 非草稿状态不可删除', async () => {
      vi.mocked(Wave.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'w1', status: 'picking' }) } as any)

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await deleteWave(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('ドラフト状態で正常に削除される / 草稿状态正常删除', async () => {
      vi.mocked(Wave.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'w1', status: 'draft' }) } as any)
      vi.mocked(Wave.findByIdAndDelete).mockResolvedValue({} as any)

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await deleteWave(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'ウェーブを削除しました' }))
    })
  })

  describe('startWave', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(Wave.findById).mockResolvedValue(null)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await startWave(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常に開始する / 正常开始', async () => {
      const mockWave = {
        _id: 'w1',
        status: 'draft',
        save: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(Wave.findById).mockResolvedValue(mockWave as any)

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await startWave(req, res)

      expect(mockWave.status).toBe('picking')
      expect(res.json).toHaveBeenCalledWith(mockWave)
    })
  })

  describe('completeWave', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(Wave.findById).mockResolvedValue(null)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await completeWave(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常に完了する / 正常完成', async () => {
      const mockWave = {
        _id: 'w1',
        status: 'picking',
        save: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(Wave.findById).mockResolvedValue(mockWave as any)

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await completeWave(req, res)

      expect(mockWave.status).toBe('completed')
      expect(res.json).toHaveBeenCalledWith(mockWave)
    })
  })
})
