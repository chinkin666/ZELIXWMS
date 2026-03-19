/**
 * renderCache ユニットテスト / renderCache 单元测试
 *
 * ファイルベースキャッシュのヒット・ミス・TTL・無効化・クリーンアップをテスト
 * 测试基于文件的缓存的命中、未命中、TTL、失效及清理逻辑
 *
 * 外部依存関係をすべてモック化（fs, path, crypto, logger）
 * 所有外部依赖均被 mock（fs、path、crypto、logger）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── fs モック / fs Mock ──────────────────────────────────────────────────────
// fs の全メソッドをモック化して実際のファイルシステムへのアクセスを防ぐ
// 对 fs 的所有方法进行 mock，防止实际访问文件系统
vi.mock('fs', () => {
  return {
    default: {
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      unlinkSync: vi.fn(),
      readdirSync: vi.fn(),
      statSync: vi.fn(),
      rmdirSync: vi.fn(),
    },
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    rmdirSync: vi.fn(),
  }
})

// ─── logger モック / logger Mock ──────────────────────────────────────────────
// ロガーをモック化してコンソール出力を防ぐ
// mock logger 防止控制台输出干扰测试
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
  getCacheKey,
  getCachedRenderPaths,
  getCachedRender,
  setCachedRender,
  cleanupExpiredCache,
  getCacheStats,
  type CacheMetadata,
} from '../renderCache'

// ─── テストヘルパー / Test helpers ────────────────────────────────────────────

/** 有効なキャッシュメタデータを生成 / 生成合法的缓存元数据 */
function makeMetadata(overrides: Partial<CacheMetadata> = {}): CacheMetadata {
  return {
    templateId: 'tmpl-001',
    orderId: 'order-001',
    exportDpi: 300,
    widthMm: 100,
    heightMm: 150,
    createdAt: Date.now(),
    ...overrides,
  }
}

/** メタデータ JSON 文字列を生成 / 生成元数据 JSON 字符串 */
function makeMetadataJson(overrides: Partial<CacheMetadata> = {}): string {
  return JSON.stringify(makeMetadata(overrides))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('renderCache / レンダーキャッシュ', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // デフォルト: キャッシュディレクトリは存在する / デフォルト: キャッシュディレクトリ存在
    // 默认：缓存目录已存在
    vi.mocked(fs.existsSync).mockReturnValue(true)
  })

  // ─── getCacheKey / キャッシュキー生成 ───────────────────────────────────────

  describe('getCacheKey / キャッシュキー生成', () => {
    it('同じ入力から同じキーを生成すること / 相同输入生成相同缓存键', () => {
      const key1 = getCacheKey('tmpl-001', 'order-001', 300)
      const key2 = getCacheKey('tmpl-001', 'order-001', 300)
      expect(key1).toBe(key2)
    })

    it('テンプレートIDが異なれば別キーになること / templateId 不同则生成不同键', () => {
      const key1 = getCacheKey('tmpl-001', 'order-001', 300)
      const key2 = getCacheKey('tmpl-002', 'order-001', 300)
      expect(key1).not.toBe(key2)
    })

    it('注文IDが異なれば別キーになること / orderId 不同则生成不同键', () => {
      const key1 = getCacheKey('tmpl-001', 'order-001', 300)
      const key2 = getCacheKey('tmpl-001', 'order-002', 300)
      expect(key1).not.toBe(key2)
    })

    it('DPIが異なれば別キーになること / DPI 不同则生成不同键', () => {
      const key1 = getCacheKey('tmpl-001', 'order-001', 300)
      const key2 = getCacheKey('tmpl-001', 'order-001', 150)
      expect(key1).not.toBe(key2)
    })

    it('MD5 16進文字列（32文字）を返すこと / 返回 32 位 MD5 十六进制字符串', () => {
      const key = getCacheKey('tmpl-001', 'order-001', 300)
      expect(key).toMatch(/^[a-f0-9]{32}$/)
    })

    it('空文字列でもキーを生成できること / 空字符串也能生成缓存键（不崩溃）', () => {
      const key = getCacheKey('', '', 0)
      expect(key).toMatch(/^[a-f0-9]{32}$/)
    })
  })

  // ─── getCachedRenderPaths / キャッシュパス取得 ──────────────────────────────

  describe('getCachedRenderPaths / キャッシュパス取得', () => {
    const cacheKey = getCacheKey('tmpl-001', 'order-001', 300)

    it('PNG またはメタデータが存在しない場合は null を返すこと / PNG 或元数据不存在时返回 null', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const result = getCachedRenderPaths(cacheKey)
      expect(result).toBeNull()
    })

    it('メタデータのみ欠如している場合も null を返すこと / 仅元数据缺失时也返回 null', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        // PNG exists but .json does not
        return String(p).endsWith('.png')
      })
      const result = getCachedRenderPaths(cacheKey)
      expect(result).toBeNull()
    })

    it('有効なキャッシュのパスを返すこと / 有效缓存返回路径对象', () => {
      // すべてのファイルが存在 / 所有文件存在
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(makeMetadataJson() as any)

      const result = getCachedRenderPaths(cacheKey)
      expect(result).not.toBeNull()
      expect(result!.pngPath).toContain(cacheKey)
      expect(result!.metadata.templateId).toBe('tmpl-001')
    })

    it('注文がキャッシュ作成後に更新された場合は null を返すこと / 订单在缓存创建后更新则返回 null', () => {
      const createdAt = Date.now() - 5000 // 5 seconds ago
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(makeMetadataJson({ createdAt }) as any)

      // 注文はキャッシュ作成後に更新された / 订单在缓存后被更新
      const orderUpdatedAt = new Date(createdAt + 3000)
      const result = getCachedRenderPaths(cacheKey, orderUpdatedAt)
      expect(result).toBeNull()
    })

    it('注文がキャッシュ作成より前に更新された場合はヒット / 订单在缓存创建之前更新则命中', () => {
      const createdAt = Date.now() - 5000
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(makeMetadataJson({ createdAt }) as any)

      // 注文更新はキャッシュ作成より前 / 订单更新早于缓存创建时间
      const orderUpdatedAt = new Date(createdAt - 1000)
      const result = getCachedRenderPaths(cacheKey, orderUpdatedAt)
      expect(result).not.toBeNull()
    })

    it('30日以上経過したキャッシュは null を返すこと（TTL 期限切れ） / 超过30天的缓存返回 null（TTL 过期）', () => {
      const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000
      const expiredCreatedAt = Date.now() - THIRTY_ONE_DAYS_MS
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(makeMetadataJson({ createdAt: expiredCreatedAt }) as any)

      const result = getCachedRenderPaths(cacheKey)
      expect(result).toBeNull()
    })

    it('30日以内のキャッシュはヒット / 30天内的缓存命中', () => {
      const TWENTY_NINE_DAYS_MS = 29 * 24 * 60 * 60 * 1000
      const recentCreatedAt = Date.now() - TWENTY_NINE_DAYS_MS
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(makeMetadataJson({ createdAt: recentCreatedAt }) as any)

      const result = getCachedRenderPaths(cacheKey)
      expect(result).not.toBeNull()
    })

    it('PDF が存在しない場合は pdfPath が空文字列 / PDF 不存在时 pdfPath 为空字符串', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        // PDF does not exist / PDF は存在しない
        return !String(p).endsWith('.pdf')
      })
      vi.mocked(fs.readFileSync).mockReturnValue(makeMetadataJson() as any)

      const result = getCachedRenderPaths(cacheKey)
      expect(result).not.toBeNull()
      expect(result!.pdfPath).toBe('')
    })

    it('メタデータ読み取り時に JSON パースエラーが発生した場合は null / 元数据 JSON 解析失败时返回 null', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('NOT_VALID_JSON' as any)

      const result = getCachedRenderPaths(cacheKey)
      expect(result).toBeNull()
    })

    it('orderUpdatedAt が null の場合はスキップ / orderUpdatedAt が null ならスキップ', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(makeMetadataJson() as any)

      // null を渡しても更新チェックをスキップ / 传入 null 跳过更新时间检查
      const result = getCachedRenderPaths(cacheKey, null)
      expect(result).not.toBeNull()
    })
  })

  // ─── getCachedRender / キャッシュバッファ取得 ─────────────────────────────

  describe('getCachedRender / キャッシュバッファ取得', () => {
    const cacheKey = getCacheKey('tmpl-002', 'order-002', 150)

    it('ファイルが存在しない場合は null を返すこと / 文件不存在时返回 null', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const result = await getCachedRender(cacheKey)
      expect(result).toBeNull()
    })

    it('有効なキャッシュは PNG バッファと PDF バッファを返すこと / 有效缓存返回 PNG 和 PDF buffer', async () => {
      const pngBuf = Buffer.from('PNG_BYTES')
      const pdfBuf = Buffer.from('PDF_BYTES')

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(makeMetadataJson() as any) // metadata
        .mockReturnValueOnce(pngBuf as any)              // PNG
        .mockReturnValueOnce(pdfBuf as any)              // PDF

      const result = await getCachedRender(cacheKey)
      expect(result).not.toBeNull()
      expect(result!.pngBuffer).toEqual(pngBuf)
      expect(result!.pdfBuffer).toEqual(pdfBuf)
    })

    it('PDF が存在しない場合は pdfBuffer が null / PDF 不存在时 pdfBuffer 为 null', async () => {
      const pngBuf = Buffer.from('PNG_BYTES')

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return !String(p).endsWith('.pdf')
      })
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(makeMetadataJson() as any)
        .mockReturnValueOnce(pngBuf as any)

      const result = await getCachedRender(cacheKey)
      expect(result).not.toBeNull()
      expect(result!.pdfBuffer).toBeNull()
    })

    it('期限切れキャッシュは null を返し、ファイルを削除すること / 过期缓存返回 null 并删除文件', async () => {
      const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000
      const expiredAt = Date.now() - THIRTY_ONE_DAYS_MS

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(makeMetadataJson({ createdAt: expiredAt }) as any)

      const result = await getCachedRender(cacheKey)
      expect(result).toBeNull()
      // 期限切れファイルの削除を試みること / 尝试删除过期文件
      expect(vi.mocked(fs.unlinkSync)).toHaveBeenCalled()
    })

    it('注文更新後のキャッシュは null を返すこと / 订单更新后缓存返回 null', async () => {
      const createdAt = Date.now() - 5000
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(makeMetadataJson({ createdAt }) as any)

      const orderUpdatedAt = new Date(createdAt + 3000)
      const result = await getCachedRender(cacheKey, orderUpdatedAt)
      expect(result).toBeNull()
    })

    it('メタデータ読み取り例外時は null を返すこと / 元数据读取异常时返回 null', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('disk read error')
      })

      const result = await getCachedRender(cacheKey)
      expect(result).toBeNull()
    })
  })

  // ─── setCachedRender / キャッシュ書き込み ─────────────────────────────────

  describe('setCachedRender / キャッシュ書き込み', () => {
    const cacheKey = getCacheKey('tmpl-003', 'order-003', 200)
    const pngBuf = Buffer.from('PNG_DATA')
    const pdfBuf = Buffer.from('PDF_DATA')
    const meta: Omit<CacheMetadata, 'createdAt'> = {
      templateId: 'tmpl-003',
      orderId: 'order-003',
      exportDpi: 200,
      widthMm: 100,
      heightMm: 150,
    }

    it('PNG・PDF・メタデータを書き込むこと / 写入 PNG、PDF 和元数据', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      await setCachedRender(cacheKey, pngBuf, pdfBuf, meta)

      // 3 ファイル書き込みを呼ぶこと / 调用 3 次 writeFileSync
      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalledTimes(3)

      // PNG 書き込み / PNG 写入
      const pngCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        ([p]) => String(p).endsWith('.png')
      )
      expect(pngCall).toBeDefined()
      expect(pngCall![1]).toEqual(pngBuf)

      // PDF 書き込み / PDF 写入
      const pdfCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        ([p]) => String(p).endsWith('.pdf')
      )
      expect(pdfCall).toBeDefined()
      expect(pdfCall![1]).toEqual(pdfBuf)

      // メタデータ書き込み / 元数据写入
      const jsonCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        ([p]) => String(p).endsWith('.json')
      )
      expect(jsonCall).toBeDefined()
      const written = JSON.parse(jsonCall![1] as string)
      expect(written.templateId).toBe('tmpl-003')
      expect(written.orderId).toBe('order-003')
      expect(written.createdAt).toBeTypeOf('number')
    })

    it('サブディレクトリが存在しない場合は作成すること / 子目录不存在时自动创建', async () => {
      // ディレクトリは存在しない / 目录不存在
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await setCachedRender(cacheKey, pngBuf, pdfBuf, meta)

      expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      )
    })

    it('書き込みエラーが発生してもクラッシュしないこと / 写入错误时不抛出异常', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('disk full')
      })

      // エラーが外部に伝播しないこと / 错误不向外传播
      await expect(setCachedRender(cacheKey, pngBuf, pdfBuf, meta)).resolves.toBeUndefined()
    })
  })

  // ─── cleanupExpiredCache / 期限切れキャッシュクリーンアップ ─────────────────

  describe('cleanupExpiredCache / 期限切れキャッシュクリーンアップ', () => {
    it('30日以上古いファイルを削除すること / 删除超过30天的文件', async () => {
      const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000
      const oldCreatedAt = Date.now() - THIRTY_ONE_DAYS_MS

      // ディレクトリ構造をモック / mock ディレクトリ構造
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce(['ab'] as any)            // CACHE_DIR subdirs
        .mockReturnValueOnce(['abcdef.json'] as any)   // files in subdir
        .mockReturnValueOnce([] as any)                // remaining files after deletion
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ createdAt: oldCreatedAt }) as any
      )

      const result = await cleanupExpiredCache()

      expect(result.deleted).toBe(1)
      expect(result.errors).toBe(0)
      expect(vi.mocked(fs.unlinkSync)).toHaveBeenCalled()
    })

    it('期限内のファイルは削除しないこと / 未过期文件不被删除', async () => {
      const recentCreatedAt = Date.now() - 1000 // 1 second ago

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce(['ab'] as any)
        .mockReturnValueOnce(['abcdef.json'] as any)
        .mockReturnValueOnce(['abcdef.json'] as any) // still has files
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ createdAt: recentCreatedAt }) as any
      )

      const result = await cleanupExpiredCache()

      expect(result.deleted).toBe(0)
      expect(vi.mocked(fs.unlinkSync)).not.toHaveBeenCalled()
    })

    it('非ディレクトリエントリはスキップすること / 跳过非目录条目', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValueOnce(['somefile.txt'] as any)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any)

      const result = await cleanupExpiredCache()

      expect(result.deleted).toBe(0)
      expect(vi.mocked(fs.readFileSync)).not.toHaveBeenCalled()
    })

    it('.json 以外のファイルはスキップすること / 跳过非 .json 文件', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce(['ab'] as any)
        .mockReturnValueOnce(['abcdef.png', 'abcdef.pdf'] as any) // not .json
        .mockReturnValueOnce(['abcdef.png', 'abcdef.pdf'] as any)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)

      const result = await cleanupExpiredCache()

      expect(result.deleted).toBe(0)
      expect(vi.mocked(fs.readFileSync)).not.toHaveBeenCalled()
    })

    it('空になったサブディレクトリを削除すること / 删除已空的子目录', async () => {
      const oldCreatedAt = Date.now() - 31 * 24 * 60 * 60 * 1000

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce(['ab'] as any)
        .mockReturnValueOnce(['abcdef.json'] as any)
        .mockReturnValueOnce([] as any) // empty after cleanup
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ createdAt: oldCreatedAt }) as any
      )

      await cleanupExpiredCache()

      // 空ディレクトリを削除 / 删除空目录
      expect(vi.mocked(fs.rmdirSync)).toHaveBeenCalled()
    })

    it('メタデータ解析エラーはエラーカウントに含まれること / 元数据解析失败计入 errors', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce(['ab'] as any)
        .mockReturnValueOnce(['abcdef.json'] as any)
        .mockReturnValueOnce(['abcdef.json'] as any)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('corrupted file')
      })

      const result = await cleanupExpiredCache()

      expect(result.errors).toBe(1)
    })

    it('キャッシュディレクトリが空の場合は deleted: 0, errors: 0 / 缓存目录为空时返回 deleted:0, errors:0', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValueOnce([] as any)

      const result = await cleanupExpiredCache()

      expect(result).toEqual({ deleted: 0, errors: 0 })
    })
  })

  // ─── getCacheStats / キャッシュ統計 ──────────────────────────────────────

  describe('getCacheStats / キャッシュ統計', () => {
    it('PNG ファイルのサイズと件数を集計すること / 统计 PNG 文件数量和总大小', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce(['ab'] as any)
        .mockReturnValueOnce(['abc123.png', 'abc123.json'] as any)

      vi.mocked(fs.statSync)
        .mockReturnValueOnce({ isDirectory: () => true } as any)    // subdir stat
        .mockReturnValueOnce({ size: 50000, mtimeMs: 1000 } as any) // PNG stat

      const stats = await getCacheStats()

      expect(stats.totalFiles).toBe(1)
      expect(stats.totalSizeBytes).toBe(50000)
      expect(stats.oldestFile).toBe(1000)
      expect(stats.newestFile).toBe(1000)
    })

    it('複数ファイルで最古・最新を正しく判定すること / 多个文件时正确判断最旧和最新', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce(['ab'] as any)
        .mockReturnValueOnce(['file1.png', 'file2.png'] as any)

      vi.mocked(fs.statSync)
        .mockReturnValueOnce({ isDirectory: () => true } as any)
        .mockReturnValueOnce({ size: 1000, mtimeMs: 500 } as any)  // file1
        .mockReturnValueOnce({ size: 2000, mtimeMs: 9000 } as any) // file2

      const stats = await getCacheStats()

      expect(stats.totalFiles).toBe(2)
      expect(stats.totalSizeBytes).toBe(3000)
      expect(stats.oldestFile).toBe(500)
      expect(stats.newestFile).toBe(9000)
    })

    it('キャッシュが空の場合はゼロ値を返すこと / 缓存为空时返回零值', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValueOnce([] as any)

      const stats = await getCacheStats()

      expect(stats.totalFiles).toBe(0)
      expect(stats.totalSizeBytes).toBe(0)
      expect(stats.oldestFile).toBeNull()
      expect(stats.newestFile).toBeNull()
    })

    it('PNG 以外のファイルはカウントしないこと / 非 PNG 文件不计入统计', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce(['ab'] as any)
        .mockReturnValueOnce(['abc.json', 'abc.pdf'] as any) // no PNG

      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)

      const stats = await getCacheStats()

      expect(stats.totalFiles).toBe(0)
      expect(stats.totalSizeBytes).toBe(0)
    })
  })

  // ─── キャッシュキー生成の境界値 / Cache key edge cases ───────────────────

  describe('getCacheKey 境界値 / edge cases', () => {
    it('特殊文字を含む ID でも MD5 生成できること / 特殊字符 ID 也能生成 MD5', () => {
      const key = getCacheKey('tmpl/with/slash', 'order:with:colon', 300)
      expect(key).toMatch(/^[a-f0-9]{32}$/)
    })

    it('非常に長い ID でも正しく処理できること / 超长 ID 也能正确处理', () => {
      const longId = 'a'.repeat(1000)
      const key = getCacheKey(longId, longId, 9999)
      expect(key).toMatch(/^[a-f0-9]{32}$/)
    })

    it('Unicode 文字を含む ID でも動作すること / 含 Unicode 字符的 ID 也能正常工作', () => {
      const key = getCacheKey('テンプレート001', '注文001', 300)
      expect(key).toMatch(/^[a-f0-9]{32}$/)
    })
  })
})
