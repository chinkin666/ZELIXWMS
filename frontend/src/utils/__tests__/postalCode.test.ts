/**
 * 郵便番号自動入力ユーティリティのユニットテスト
 * 邮政编码自动填写工具函数单元测试
 *
 * zipcloud API (https://zipcloud.ibsnet.co.jp/) を経由して住所を取得する。
 * 通过 zipcloud API 获取地址，外部依赖需要完整 mock。
 *
 * 全テストで globalThis.fetch をモックし、外部 HTTP 呼び出しをシミュレートする。
 * 所有测试均 mock globalThis.fetch，模拟外部 HTTP 调用。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { lookupPostalCode } from '../postalCode'

// ─────────────────────────────────────────────
// ヘルパー: fetch モックのセットアップ
// 辅助函数：设置 fetch mock
// ─────────────────────────────────────────────

/**
 * zipcloud API のレスポンスをモックする
 * mock zipcloud API 响应
 */
function mockFetchSuccess(address1: string, address2: string, address3: string) {
  vi.mocked(globalThis.fetch).mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        status: 200,
        message: null,
        results: [{ address1, address2, address3 }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  )
}

/**
 * zipcloud API が結果なし（存在しない郵便番号）をモックする
 * mock zipcloud API 返回无结果（郵便番号不存在）
 */
function mockFetchNoResults() {
  vi.mocked(globalThis.fetch).mockResolvedValueOnce(
    new Response(
      JSON.stringify({ status: 200, message: null, results: null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  )
}

/**
 * zipcloud API がステータスエラーを返すをモックする
 * mock zipcloud API 返回状态错误
 */
function mockFetchApiError() {
  vi.mocked(globalThis.fetch).mockResolvedValueOnce(
    new Response(
      JSON.stringify({ status: 400, message: 'パラメータが不正です。', results: null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  )
}

// ─────────────────────────────────────────────
// テストセットアップ / 测试初始化
// ─────────────────────────────────────────────
const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────
// 正常系: 有効な郵便番号 / 正常流程：有效邮政编码
// ─────────────────────────────────────────────
describe('lookupPostalCode() / 正常系', () => {
  it('7桁の郵便番号で住所を返す / 7位邮政编码返回地址', async () => {
    mockFetchSuccess('東京都', '渋谷区', '神宮前')

    const result = await lookupPostalCode('1500001')

    expect(result).toEqual({
      prefecture: '東京都',
      city: '渋谷区',
      street: '神宮前',
    })
  })

  it('ハイフン付き郵便番号を自動クリーニングして検索する / 带连字符的邮政编码自动清理后查询', async () => {
    mockFetchSuccess('東京都', '新宿区', '西新宿')

    const result = await lookupPostalCode('160-0023')

    expect(result).not.toBeNull()
    expect(result?.prefecture).toBe('東京都')
    // ハイフン除去後の 1600023 でフェッチされているか確認
    // 确认是用去连字符后的 1600023 调用的 fetch
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      'https://zipcloud.ibsnet.co.jp/api/search?zipcode=1600023',
    )
  })

  it('スペース混じりの郵便番号もクリーニングされる / 含空格的邮政编码也会被清理', async () => {
    mockFetchSuccess('大阪府', '大阪市北区', '梅田')

    const result = await lookupPostalCode('530 0001')

    expect(result).not.toBeNull()
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      'https://zipcloud.ibsnet.co.jp/api/search?zipcode=5300001',
    )
  })

  it('address3 が空文字のとき street は空文字列 / address3 为空时 street 为空字符串', async () => {
    mockFetchSuccess('北海道', '札幌市中央区', '')

    const result = await lookupPostalCode('0600001')

    expect(result?.street).toBe('')
  })

  it('API レスポンスに address フィールドがないとき空文字でフォールバック / API 响应缺字段时回退为空字符串', async () => {
    // address1/2/3 が undefined の場合 (|| '' でフォールバック)
    // 当 address1/2/3 为 undefined 时（用 || '' 回退）
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 200,
          message: null,
          results: [{}], // フィールドなし / 无字段
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const result = await lookupPostalCode('1000001')

    expect(result).toEqual({ prefecture: '', city: '', street: '' })
  })

  it('正しい URL で fetch が呼ばれる / 使用正确 URL 调用 fetch', async () => {
    mockFetchSuccess('愛知県', '名古屋市中村区', '名駅')

    await lookupPostalCode('4500002')

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledOnce()
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      'https://zipcloud.ibsnet.co.jp/api/search?zipcode=4500002',
    )
  })
})

// ─────────────────────────────────────────────
// バリデーション: 不正な入力 / 验证：非法输入
// ─────────────────────────────────────────────
describe('lookupPostalCode() / 入力バリデーション', () => {
  it('6桁の郵便番号は null を返す（fetch 呼び出しなし）/ 6位邮政编码返回 null（不调用 fetch）', async () => {
    const result = await lookupPostalCode('123456')

    expect(result).toBeNull()
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled()
  })

  it('8桁の郵便番号は null を返す / 8位邮政编码返回 null', async () => {
    const result = await lookupPostalCode('12345678')

    expect(result).toBeNull()
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled()
  })

  it('空文字列は null を返す / 空字符串返回 null', async () => {
    const result = await lookupPostalCode('')

    expect(result).toBeNull()
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled()
  })

  it('アルファベット混じりは null を返す / 包含字母返回 null', async () => {
    const result = await lookupPostalCode('ABC1234')

    expect(result).toBeNull()
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled()
  })

  it('ハイフンのみのときは null を返す / 仅连字符返回 null', async () => {
    const result = await lookupPostalCode('---')

    expect(result).toBeNull()
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled()
  })

  it('全角数字は null を返す / 全角数字返回 null', async () => {
    // "１２３４５６７" — 全角数字、正規表現 /^\d{7}$/ にマッチしない
    // 全角数字不匹配 /^\d{7}$/
    const result = await lookupPostalCode('１２３４５６７')

    expect(result).toBeNull()
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled()
  })

  it('スペースのみは null を返す / 纯空格返回 null', async () => {
    const result = await lookupPostalCode('       ')

    expect(result).toBeNull()
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────
// API エラー系 / API 错误情况
// ─────────────────────────────────────────────
describe('lookupPostalCode() / API エラー系', () => {
  it('API status が 200 以外のとき null を返す / API status 非200 时返回 null', async () => {
    mockFetchApiError()

    const result = await lookupPostalCode('0000000')

    expect(result).toBeNull()
  })

  it('results が null のとき null を返す / results 为 null 时返回 null', async () => {
    mockFetchNoResults()

    const result = await lookupPostalCode('9999999')

    expect(result).toBeNull()
  })

  it('results が空配列のとき null を返す / results 为空数组时返回 null', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: 200, message: null, results: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const result = await lookupPostalCode('1234567')

    expect(result).toBeNull()
  })

  it('fetch がネットワークエラーをスローしたとき null を返す / fetch 抛出网络错误时返回 null', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Network Error'))

    const result = await lookupPostalCode('1000001')

    expect(result).toBeNull()
  })

  it('fetch がタイムアウトしたとき null を返す（AbortError）/ fetch 超时时返回 null（AbortError）', async () => {
    const abortError = new DOMException('The user aborted a request.', 'AbortError')
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(abortError)

    const result = await lookupPostalCode('1500001')

    expect(result).toBeNull()
  })

  it('JSON 解析に失敗したとき null を返す / JSON 解析失败时返回 null', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('invalid json {{{', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await lookupPostalCode('1000001')

    expect(result).toBeNull()
  })

  it('HTTP 500 レスポンスで JSON 解析に失敗しても null を返す / HTTP 500 响应 JSON 解析失败也返回 null', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    )

    const result = await lookupPostalCode('1000001')

    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────
// 境界値テスト / 边界值测试
// ─────────────────────────────────────────────
describe('lookupPostalCode() / 境界値テスト', () => {
  it('ハイフンを除去した後にちょうど7桁になる入力は有効 / 去连字符后恰好7位的输入有效', async () => {
    mockFetchSuccess('東京都', '千代田区', '丸の内')

    // "100-0005" → クリーニング後 "1000005" (7桁)
    const result = await lookupPostalCode('100-0005')

    expect(result).not.toBeNull()
  })

  it('複数のハイフンやスペースが混在しても正しくクリーニングされる / 多个连字符和空格混合也能正确清理', async () => {
    // "100 - 0005" → クリーニング後 "1000005"
    mockFetchSuccess('東京都', '千代田区', '丸の内')

    const result = await lookupPostalCode('100 - 0005')

    expect(result).not.toBeNull()
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      'https://zipcloud.ibsnet.co.jp/api/search?zipcode=1000005',
    )
  })

  it('results[0] の最初の結果のみ使用する（複数結果があっても）/ 只使用 results[0]（即使有多条结果）', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 200,
          message: null,
          results: [
            { address1: '東京都', address2: '千代田区', address3: '丸の内' },
            { address1: '東京都', address2: '別の区', address3: '別の町' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const result = await lookupPostalCode('1000005')

    expect(result?.city).toBe('千代田区')
  })
})
