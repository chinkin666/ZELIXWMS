/**
 * importController 統合テスト / Import Controller Integration Tests
 *
 * CSV インポート API の HTTP フローを検証する。
 * Verifies HTTP flow for CSV import operations.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/services/csvImportService', () => ({
  importShipmentOrders: vi.fn(),
  importProducts: vi.fn(),
}))

import { importShipmentOrders, importProducts } from '@/services/csvImportService'
import { importShipmentOrdersCsv, importProductsCsv, downloadTemplate } from '../importController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, file: undefined, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.setHeader = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res
}

describe('importController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('importShipmentOrdersCsv', () => {
    it('ファイルがない場合400を返す / returns 400 when no file', async () => {
      const req = mockReq()
      const res = mockRes()
      await importShipmentOrdersCsv(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常にインポート / imports successfully', async () => {
      vi.mocked(importShipmentOrders).mockResolvedValue({
        importedCount: 5,
        errors: [],
        skippedCount: 0,
      } as any)

      const req = mockReq({
        file: { buffer: Buffer.from('header\nrow1\n') },
        query: { dryRun: 'false' },
        body: {},
      })
      const res = mockRes()
      await importShipmentOrdersCsv(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ importedCount: 5, dryRun: false }),
      )
    })

    it('ドライランモード / dry run mode works', async () => {
      vi.mocked(importShipmentOrders).mockResolvedValue({
        importedCount: 3,
        errors: [],
        skippedCount: 0,
      } as any)

      const req = mockReq({
        file: { buffer: Buffer.from('header\nrow1\n') },
        query: { dryRun: 'true' },
        body: {},
      })
      const res = mockRes()
      await importShipmentOrdersCsv(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ dryRun: true }),
      )
      expect(importShipmentOrders).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ dryRun: true }))
    })

    it('サービス例外の場合500を返す / returns 500 on service error', async () => {
      vi.mocked(importShipmentOrders).mockRejectedValue(new Error('Parse error'))

      const req = mockReq({
        file: { buffer: Buffer.from('bad,csv') },
        query: {},
        body: {},
      })
      const res = mockRes()
      await importShipmentOrdersCsv(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('importProductsCsv', () => {
    it('ファイルがない場合400を返す / returns 400 when no file', async () => {
      const req = mockReq()
      const res = mockRes()
      await importProductsCsv(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常にインポート / imports products successfully', async () => {
      vi.mocked(importProducts).mockResolvedValue({
        importedCount: 10,
        errors: [],
        skippedCount: 0,
      } as any)

      const req = mockReq({
        file: { buffer: Buffer.from('sku,name\nSKU1,Product1\n') },
        query: {},
        body: {},
      })
      const res = mockRes()
      await importProductsCsv(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ importedCount: 10 }),
      )
    })
  })

  describe('downloadTemplate', () => {
    it('存在しないテンプレートの場合404を返す / returns 404 for unknown template', async () => {
      const req = mockReq({ params: { type: 'unknown' } })
      const res = mockRes()
      await downloadTemplate(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('出荷指示テンプレートをダウンロード / downloads shipment orders template', async () => {
      const req = mockReq({ params: { type: 'shipment-orders' } })
      const res = mockRes()
      await downloadTemplate(req, res)

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', expect.stringContaining('csv'))
    })
  })
})
