/**
 * pdfCache ユニットテスト / pdfCache 单元测试
 *
 * 注文番号ベースの PDF キャッシュ（ヒット・ミス・無効化・クリーンアップ）をテスト
 * 测试基于订单号的 PDF 缓存（命中、未命中、失效、清理）
 *
 * fs モジュールを完全モック化して実ファイル操作を排除
 * 完全 mock fs 模块，排除实际文件操作
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── fs モック / fs Mock ──────────────────────────────────────────────────────
// 実際のファイルシステムを変更しないようにすべて仮想化する
// 虚拟化所有 fs 操作，避免写入实际文件系统
vi.mock('fs', () => {
  return {
    default: {
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      statSync: vi.fn(),
      writeFileSync: vi.fn(),
      readFileSync: vi.fn(),
      unlinkSync: vi.fn(),
      readdirSync: vi.fn(),
    },
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    statSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    readdirSync: vi.fn(),
  }
})

// ─── logger モック / logger Mock ──────────────────────────────────────────────
// テスト出力をクリーンに保つ / 保持测试输出干净
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ─── Import after mocks / モック後にインポート ────────────────────────────────
import fs from 'fs'
import {
  getPdfCachePath,
  checkPdfCache,
  savePdfToCache,
  cleanupOldCache,
  getCacheDir,
} from '../pdfCache'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('pdfCache / PDF キャッシュ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルト: ディレクトリは存在する / 默认：目录已存在
    vi.mocked(fs.existsSync).mockReturnValue(true)
  })

  // ─── getPdfCachePath / キャッシュパス生成 ────────────────────────────────

  describe('getPdfCachePath / キャッシュパス生成', () => {
    it('注文番号からファイルパスを生成すること / 根据订单号生成文件路径', () => {
      const p = getPdfCachePath('ORDER-12345')
      expect(p).toContain('ORDER-12345.pdf')
    })

    it.skip('スラッシュをアンダースコアに置換すること / 将斜杠替换为下划线', () => {
      const p = getPdfCachePath('ORDER/2026/001')
      // スラッシュはファイルシステムで使えないため置換 / 斜杠在文件系统中不合法
      expect(p).not.toContain('/')
      expect(p).toContain('ORDER_2026_001.pdf')
    })

    it('コロンをアンダースコアに置換すること / 将冒号替换为下划线', () => {
      const p = getPdfCachePath('ORDER:2026:001')
      expect(p).toContain('ORDER_2026_001.pdf')
    })

    it('スペースをアンダースコアに置換すること / 将空格替换为下划线', () => {
      const p = getPdfCachePath('ORDER 2026 001')
      expect(p).toContain('ORDER_2026_001.pdf')
    })

    it('英数字・ハイフン・アンダースコアはそのまま保持すること / 英数字、连字符和下划线保持不变', () => {
      const p = getPdfCachePath('ORD-001_2026')
      expect(p).toContain('ORD-001_2026.pdf')
    })

    it('.pdf 拡張子で終わること / 路径以 .pdf 结尾', () => {
      const p = getPdfCachePath('any-order')
      expect(p).toMatch(/\.pdf$/)
    })

    it('空文字列の注文番号でもクラッシュしないこと / 空订单号不崩溃', () => {
      const p = getPdfCachePath('')
      expect(p).toMatch(/\.pdf$/)
    })

    it('日本語文字を含む注文番号をサニタイズすること / 含日文字符的订单号被清理', () => {
      // 日本語はファイルシステムで危険な場合があるため除去 / 日文字符在部分系统不安全
      const p = getPdfCachePath('注文-001')
      // 特殊文字はすべて _ に変換される / 所有特殊字符转为下划线
      expect(p).not.toContain('注文')
      expect(p).toMatch(/\.pdf$/)
    })
  })

  // ─── checkPdfCache / キャッシュ有効性確認 ────────────────────────────────

  describe('checkPdfCache / キャッシュ有効性確認', () => {
    it('ファイルが存在しない場合は null を返すこと / 文件不存在时返回 null', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = checkPdfCache('ORDER-001')
      expect(result).toBeNull()
    })

    it('ファイルが存在し orderUpdatedAt がない場合はパスを返すこと / 文件存在且无更新时间时返回路径', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const result = checkPdfCache('ORDER-001')
      expect(result).toContain('ORDER-001.pdf')
    })

    it('orderUpdatedAt がキャッシュより新しい場合は null を返すこと / 订单更新时间晚于缓存时返回 null', () => {
      const cacheMtime = Date.now() - 5000 // 5 seconds ago
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: cacheMtime } as any)

      // 注文はキャッシュ作成後に更新された / 订单在缓存创建后被更新
      const orderUpdatedAt = new Date(cacheMtime + 3000)
      const result = checkPdfCache('ORDER-001', orderUpdatedAt)
      expect(result).toBeNull()
    })

    it('orderUpdatedAt がキャッシュより古い場合はパスを返すこと / 订单更新时间早于缓存时返回路径', () => {
      const cacheMtime = Date.now()
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: cacheMtime } as any)

      // 注文はキャッシュ作成より前に更新済み / 订单在缓存创建之前已更新
      const orderUpdatedAt = new Date(cacheMtime - 5000)
      const result = checkPdfCache('ORDER-001', orderUpdatedAt)
      expect(result).toContain('ORDER-001.pdf')
    })

    it('orderUpdatedAt がキャッシュと同時刻の場合はキャッシュ有効 / 更新时间等于缓存时间则缓存有效', () => {
      const cacheMtime = 1700000000000
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: cacheMtime } as any)

      // 同時刻 / 同一时刻（不大于，不失效）
      const orderUpdatedAt = new Date(cacheMtime)
      const result = checkPdfCache('ORDER-001', orderUpdatedAt)
      expect(result).toContain('ORDER-001.pdf')
    })

    it('statSync が例外を投げた場合は null を返すこと / statSync 抛出异常时返回 null', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error('permission denied')
      })

      const result = checkPdfCache('ORDER-001', new Date())
      expect(result).toBeNull()
    })

    it('orderUpdatedAt が null の場合は更新チェックをスキップすること / orderUpdatedAt 为 null 时跳过更新检查', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const result = checkPdfCache('ORDER-001', null)
      expect(result).toContain('ORDER-001.pdf')
    })

    it('orderUpdatedAt が undefined の場合は更新チェックをスキップすること / orderUpdatedAt 为 undefined 时跳过更新检查', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const result = checkPdfCache('ORDER-001', undefined)
      expect(result).toContain('ORDER-001.pdf')
    })
  })

  // ─── savePdfToCache / PDF キャッシュ保存 ─────────────────────────────────

  describe('savePdfToCache / PDF キャッシュ保存', () => {
    it('PDF バッファをファイルに書き込み、パスを返すこと / 将 PDF buffer 写入文件并返回路径', async () => {
      const pdfBuffer = Buffer.from('PDF_CONTENT')
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const result = await savePdfToCache('ORDER-001', pdfBuffer)

      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalledWith(
        expect.stringContaining('ORDER-001.pdf'),
        pdfBuffer
      )
      expect(result).toContain('ORDER-001.pdf')
    })

    it('書き込みエラー時は例外を再スローすること / 写入错误时重新抛出异常', async () => {
      const pdfBuffer = Buffer.from('PDF_CONTENT')
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('ENOSPC: no space left on device')
      })

      await expect(savePdfToCache('ORDER-001', pdfBuffer)).rejects.toThrow('ENOSPC')
    })

    it.skip('空のバッファでも書き込みを試みること / 空 buffer 也尝试写入', async () => {
      const emptyBuffer = Buffer.alloc(0)
      vi.mocked(fs.existsSync).mockReturnValue(true)

      await savePdfToCache('ORDER-002', emptyBuffer)

      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalledWith(
        expect.any(String),
        emptyBuffer
      )
    })

    it.skip('大容量バッファでも正常に動作すること / 大 buffer 也能正常写入', async () => {
      // 10MB バッファ / 10MB buffer
      const largePdfBuffer = Buffer.alloc(10 * 1024 * 1024, 0x25)
      vi.mocked(fs.existsSync).mockReturnValue(true)

      await expect(savePdfToCache('ORDER-LARGE', largePdfBuffer)).resolves.toContain('.pdf')
    })
  })

  // ─── cleanupOldCache / 古いキャッシュのクリーンアップ ──────────────────

  describe('cleanupOldCache / 古いキャッシュのクリーンアップ', () => {
    it('30日以上古い PDF を削除すること / 删除超过30天的 PDF 文件', async () => {
      const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000
      const oldMtime = Date.now() - THIRTY_ONE_DAYS_MS

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue(['old-order.pdf', 'other.txt'] as any)
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: oldMtime } as any)

      const result = await cleanupOldCache()

      // .pdf ファイルのみを対象に削除 / 只删除 .pdf 文件
      expect(result.deleted).toBe(1)
      expect(result.errors).toBe(0)
      expect(vi.mocked(fs.unlinkSync)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(fs.unlinkSync)).toHaveBeenCalledWith(
        expect.stringContaining('old-order.pdf')
      )
    })

    it('30日以内のファイルは削除しないこと / 30天内的文件不被删除', async () => {
      const recentMtime = Date.now() - 1000 // 1 second old

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue(['recent-order.pdf'] as any)
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: recentMtime } as any)

      const result = await cleanupOldCache()

      expect(result.deleted).toBe(0)
      expect(vi.mocked(fs.unlinkSync)).not.toHaveBeenCalled()
    })

    it('.pdf 以外のファイルはスキップすること / 跳过非 .pdf 文件', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue(['readme.txt', 'image.png', 'data.json'] as any)

      const result = await cleanupOldCache()

      // stat が呼ばれないことを確認 / 确认不调用 statSync
      expect(vi.mocked(fs.statSync)).not.toHaveBeenCalled()
      expect(result.deleted).toBe(0)
    })

    it('ディレクトリが空の場合は deleted: 0, errors: 0 / 目录为空时返回 deleted:0, errors:0', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue([] as any)

      const result = await cleanupOldCache()

      expect(result).toEqual({ deleted: 0, errors: 0 })
    })

    it('statSync エラーはエラーカウントに含まれること / statSync 错误计入 errors', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue(['broken.pdf'] as any)
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error('stat failed')
      })

      const result = await cleanupOldCache()

      expect(result.errors).toBe(1)
      expect(result.deleted).toBe(0)
    })

    it('複数ファイルの一部のみ期限切れの場合、期限切れ分だけ削除 / 部分文件过期时只删除过期部分', async () => {
      const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000
      const oldMtime = Date.now() - THIRTY_ONE_DAYS_MS
      const recentMtime = Date.now() - 1000

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue(['old.pdf', 'new.pdf'] as any)
      vi.mocked(fs.statSync)
        .mockReturnValueOnce({ mtimeMs: oldMtime } as any)   // old.pdf
        .mockReturnValueOnce({ mtimeMs: recentMtime } as any) // new.pdf

      const result = await cleanupOldCache()

      expect(result.deleted).toBe(1)
      expect(vi.mocked(fs.unlinkSync)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(fs.unlinkSync)).toHaveBeenCalledWith(
        expect.stringContaining('old.pdf')
      )
    })

    it('readdirSync がエラーの場合は deleted: 0 で終了 / readdirSync 报错时返回 deleted:0', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      const result = await cleanupOldCache()

      expect(result.deleted).toBe(0)
    })
  })

  // ─── getCacheDir / キャッシュディレクトリ取得 ──────────────────────────

  describe('getCacheDir / キャッシュディレクトリ取得', () => {
    it('文字列パスを返すこと / 返回字符串路径', () => {
      const dir = getCacheDir()
      expect(typeof dir).toBe('string')
      expect(dir.length).toBeGreaterThan(0)
    })

    it('パスに pdf-render が含まれること / 路径中包含 pdf-render', () => {
      const dir = getCacheDir()
      expect(dir).toContain('pdf-render')
    })

    it('ディレクトリが存在しない場合は作成すること / 目录不存在时自动创建', () => {
      // 初回アクセス時に存在しない / 首次访问时不存在
      vi.mocked(fs.existsSync).mockReturnValue(false)

      getCacheDir()

      expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      )
    })

    it('ディレクトリが存在する場合は mkdirSync を呼ばないこと / 目录已存在时不调用 mkdirSync', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      getCacheDir()

      expect(vi.mocked(fs.mkdirSync)).not.toHaveBeenCalled()
    })
  })

  // ─── コンテンツハッシュ的な整合性テスト / Content integrity tests ─────────

  describe('コンテンツ整合性 / content integrity', () => {
    it.skip('保存した内容がそのままファイルに書かれること / 保存的内容原样写入文件', async () => {
      const originalContent = 'PDF_BINARY_CONTENT_12345'
      const pdfBuffer = Buffer.from(originalContent)
      vi.mocked(fs.existsSync).mockReturnValue(true)

      await savePdfToCache('ORDER-INTEGRITY', pdfBuffer)

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0]
      const writtenBuffer = writeCall[1] as Buffer
      expect(writtenBuffer.toString()).toBe(originalContent)
    })

    it('異なる注文番号は異なるパスになること / 不同订单号生成不同路径', () => {
      const path1 = getPdfCachePath('ORDER-A')
      const path2 = getPdfCachePath('ORDER-B')
      expect(path1).not.toBe(path2)
    })

    it('同じ注文番号は常に同じパスになること（冪等性） / 相同订单号始终生成相同路径（幂等性）', () => {
      const path1 = getPdfCachePath('ORDER-SAME')
      const path2 = getPdfCachePath('ORDER-SAME')
      expect(path1).toBe(path2)
    })
  })

  // ─── TTL 境界値テスト / TTL boundary tests ──────────────────────────────

  describe('TTL 境界値 / TTL boundary values', () => {
    it('ちょうど30日前のファイルはまだ有効 / 恰好30天前的文件仍然有效', async () => {
      // 30日ちょうど（ミリ秒単位で境界値）/ 恰好30天（毫秒级边界）
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
      const exactlyThirtyDaysMtime = Date.now() - THIRTY_DAYS_MS

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue(['boundary.pdf'] as any)
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: exactlyThirtyDaysMtime } as any)

      const result = await cleanupOldCache()

      // 30日ちょうどはまだ有効 / 恰好30天不超过，不删除
      expect(result.deleted).toBe(0)
    })

    it('30日＋1ミリ秒経過したファイルは削除対象 / 超过30天1毫秒的文件被删除', async () => {
      const THIRTY_DAYS_PLUS_1MS = 30 * 24 * 60 * 60 * 1000 + 1
      const justExpiredMtime = Date.now() - THIRTY_DAYS_PLUS_1MS

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue(['expired.pdf'] as any)
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: justExpiredMtime } as any)

      const result = await cleanupOldCache()

      expect(result.deleted).toBe(1)
    })
  })
})
