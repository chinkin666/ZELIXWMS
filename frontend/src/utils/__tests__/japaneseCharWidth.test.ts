/**
 * 日本語文字幅ユーティリティのユニットテスト
 * 日文字符宽度工具函数单元测试
 *
 * ヤマト送り状の住所欄は全角16文字以内という制限があるため、
 * 字段宽度校验在大和运单地址栏（全角16字以内）中是关键逻辑，需要完整测试。
 *
 * 全角文字 = 2、半角文字 = 1 として各 code point 境界を検証する。
 * 以全角=2、半角=1 验证各 code point 边界。
 */
import { describe, it, expect } from 'vitest'
import { getCharWidth, getStringWidth, splitByWidth } from '../japaneseCharWidth'

// ─────────────────────────────────────────────
// getCharWidth() / 単一文字幅取得
// ─────────────────────────────────────────────
describe('getCharWidth() / 単一文字の幅', () => {
  // ── ASCII（半角） / ASCII（半角）──
  it('NUL (0x00) は幅 1 / NUL(0x00) 宽度为 1', () => {
    expect(getCharWidth(0x0000)).toBe(1)
  })

  it('スペース (0x20) は幅 1 / 空格(0x20) 宽度为 1', () => {
    expect(getCharWidth(0x0020)).toBe(1)
  })

  it('ASCII 英数字 "A" (0x41) は幅 1 / 英文字母 A(0x41) 宽度为 1', () => {
    expect(getCharWidth(0x0041)).toBe(1)
  })

  it('ASCII 最大値 0x7F は幅 1 / ASCII 最大值 0x7F 宽度为 1', () => {
    expect(getCharWidth(0x007f)).toBe(1)
  })

  // ── 半角カタカナ (0xFF61-0xFF9F) / 半角片假名 ──
  it('半角カタカナ先頭 0xFF61 は幅 1 / 半角片假名起始 0xFF61 宽度为 1', () => {
    expect(getCharWidth(0xff61)).toBe(1)
  })

  it('半角カタカナ末尾 0xFF9F は幅 1 / 半角片假名结束 0xFF9F 宽度为 1', () => {
    expect(getCharWidth(0xff9f)).toBe(1)
  })

  it('半角カタカナ中間 "ｱ" (0xFF71) は幅 1 / 半角片假名中间值 0xFF71 宽度为 1', () => {
    // 'ｱ' = HALFWIDTH KATAKANA LETTER A
    expect(getCharWidth(0xff71)).toBe(1)
  })

  // ── CJK 統合漢字 (0x4E00-0x9FFF) / CJK 统一汉字 ──
  it('CJK 漢字先頭 0x4E00 "一" は幅 2 / CJK 汉字起始 0x4E00 宽度为 2', () => {
    expect(getCharWidth(0x4e00)).toBe(2)
  })

  it('CJK 漢字末尾 0x9FFF は幅 2 / CJK 汉字结束 0x9FFF 宽度为 2', () => {
    expect(getCharWidth(0x9fff)).toBe(2)
  })

  it('"東" (0x6771) は幅 2 / 东(0x6771) 宽度为 2', () => {
    expect(getCharWidth('東'.charCodeAt(0))).toBe(2)
  })

  // ── ひらがな (0x3040-0x309F) / 平假名 ──
  it('ひらがな先頭 0x3040 は幅 2 / 平假名起始 0x3040 宽度为 2', () => {
    expect(getCharWidth(0x3040)).toBe(2)
  })

  it('ひらがな "あ" (0x3042) は幅 2 / 平假名あ(0x3042) 宽度为 2', () => {
    expect(getCharWidth('あ'.charCodeAt(0))).toBe(2)
  })

  it('ひらがな末尾 0x309F は幅 2 / 平假名结束 0x309F 宽度为 2', () => {
    expect(getCharWidth(0x309f)).toBe(2)
  })

  // ── 全角カタカナ (0x30A0-0x30FF) / 全角片假名 ──
  it('全角カタカナ先頭 0x30A0 は幅 2 / 全角片假名起始 0x30A0 宽度为 2', () => {
    expect(getCharWidth(0x30a0)).toBe(2)
  })

  it('全角カタカナ "ア" (0x30A2) は幅 2 / 全角片假名ア(0x30A2) 宽度为 2', () => {
    expect(getCharWidth('ア'.charCodeAt(0))).toBe(2)
  })

  it('全角カタカナ末尾 0x30FF は幅 2 / 全角片假名结束 0x30FF 宽度为 2', () => {
    expect(getCharWidth(0x30ff)).toBe(2)
  })

  // ── 全角 ASCII・記号 (0xFF01-0xFF60) / 全角 ASCII 及符号 ──
  it('全角感嘆符 "！" (0xFF01) は幅 2 / 全角感叹号 0xFF01 宽度为 2', () => {
    expect(getCharWidth(0xff01)).toBe(2)
  })

  it('全角 ASCII 末尾 0xFF60 は幅 2 / 全角 ASCII 结束 0xFF60 宽度为 2', () => {
    expect(getCharWidth(0xff60)).toBe(2)
  })

  // ── CJK 記号と句読点 (0x3000-0x303F) / CJK 符号和标点 ──
  it('全角スペース "　" (0x3000) は幅 2 / 全角空格 0x3000 宽度为 2', () => {
    expect(getCharWidth(0x3000)).toBe(2)
  })

  it('句点 "。" (0x3002) は幅 2 / 句号 0x3002 宽度为 2', () => {
    expect(getCharWidth('。'.charCodeAt(0))).toBe(2)
  })

  // ── その他（デフォルト全角扱い）/ 其他（默认全角）──
  it('Emoji など未定義の code point はデフォルト 2 / 未定义 code point 默认宽度为 2', () => {
    // 0x1F600 = 😀 — beyond the defined ranges, falls through to default return 2
    expect(getCharWidth(0x1f600)).toBe(2)
  })
})

// ─────────────────────────────────────────────
// getStringWidth() / 文字列幅計算
// ─────────────────────────────────────────────
describe('getStringWidth() / 文字列の表示幅', () => {
  it('空文字列は幅 0 / 空字符串宽度为 0', () => {
    expect(getStringWidth('')).toBe(0)
  })

  it('ASCII のみ: 幅 = 文字数 / 纯 ASCII：宽度 = 字符数', () => {
    expect(getStringWidth('hello')).toBe(5)
    expect(getStringWidth('ABC123')).toBe(6)
  })

  it('漢字のみ: 幅 = 文字数 × 2 / 纯汉字：宽度 = 字符数 × 2', () => {
    // "東京都" = 3文字 × 2 = 6
    expect(getStringWidth('東京都')).toBe(6)
  })

  it('ひらがなのみ / 纯平假名', () => {
    // "あいう" = 3文字 × 2 = 6
    expect(getStringWidth('あいう')).toBe(6)
  })

  it('全角カタカナのみ / 纯全角片假名', () => {
    // "アイウ" = 3文字 × 2 = 6
    expect(getStringWidth('アイウ')).toBe(6)
  })

  it('半角カタカナのみ / 纯半角片假名', () => {
    // "ｱｲｳ" = 3文字 × 1 = 3
    expect(getStringWidth('ｱｲｳ')).toBe(3)
  })

  it('混在文字列（ASCII + 漢字）/ 混合字符串（ASCII + 汉字）', () => {
    // "A東B" = 1 + 2 + 1 = 4
    expect(getStringWidth('A東B')).toBe(4)
  })

  it('ヤマト住所欄の典型値: 全角16文字 = 幅32 / 大和地址栏典型值：全角16字 = 宽32', () => {
    // 全角16文字 = 32半角単位
    const addr = '東京都渋谷区神宮前一丁目一番一号'
    expect(addr.length).toBe(16)
    expect(getStringWidth(addr)).toBe(32)
  })

  it('混在: ヤマト住所が全角16文字以内に収まるか検証パターン / 混合：验证大和地址是否在全角16字以内', () => {
    // 半角12 + 全角2 = 12 + 4 = 16 (幅16なら許容)
    const addr = 'Shibuya123AB東京'
    // 'Shibuya123AB' = 12 × 1 = 12, '東京' = 2 × 2 = 4 → total 16
    expect(getStringWidth(addr)).toBe(16)
  })

  it('1文字のみ（全角）/ 单字符（全角）', () => {
    expect(getStringWidth('あ')).toBe(2)
  })

  it('1文字のみ（半角）/ 单字符（半角）', () => {
    expect(getStringWidth('a')).toBe(1)
  })
})

// ─────────────────────────────────────────────
// splitByWidth() / 指定幅での文字列分割
// ─────────────────────────────────────────────
describe('splitByWidth() / 指定幅での分割', () => {
  it('空文字列を渡したとき ["", ""] を返す / 空字符串返回 ["", ""]', () => {
    expect(splitByWidth('', 10)).toEqual(['', ''])
  })

  it('null/undefined を渡したとき ["", ""] を返す / 传入 null/undefined 返回 ["", ""]', () => {
    // 実装では `if (!str) return ['', '']` で保護している
    // 实现中用 `if (!str)` 保护
    expect(splitByWidth(null as unknown as string, 10)).toEqual(['', ''])
    expect(splitByWidth(undefined as unknown as string, 10)).toEqual(['', ''])
  })

  it('文字列幅が maxWidth 以下のとき全体を前半に返す / 字符串宽度 ≤ maxWidth 时整体返回前半', () => {
    const [head, tail] = splitByWidth('hello', 10)
    expect(head).toBe('hello')
    expect(tail).toBe('')
  })

  it('ASCII のみ: maxWidth で正確に分割 / 纯 ASCII：在 maxWidth 处精确分割', () => {
    // "hello world" maxWidth=5 → ["hello", " world"]
    const [head, tail] = splitByWidth('hello world', 5)
    expect(head).toBe('hello')
    expect(tail).toBe(' world')
  })

  it('全角文字のみ: maxWidth=4 → 2文字で分割 / 纯全角：maxWidth=4 → 在第2个字符处分割', () => {
    // "東京大阪" → maxWidth=4 → "東京" (幅4) + "大阪"
    const [head, tail] = splitByWidth('東京大阪', 4)
    expect(head).toBe('東京')
    expect(tail).toBe('大阪')
  })

  it('全角文字のみ: maxWidth が奇数のとき全角文字を途中で切らない / maxWidth 为奇数时不切断全角字符', () => {
    // "東京大" maxWidth=3 → "東" (幅2) が収まるが "京" (幅2) は超える → "東" + "京大"
    const [head, tail] = splitByWidth('東京大', 3)
    expect(head).toBe('東')
    expect(tail).toBe('京大')
  })

  it('混在文字列: 半角2 + 全角1 で分割 / 混合字符串：半角2 + 全角1 处分割', () => {
    // "AB東京" maxWidth=4 → "AB東" (幅2+2=4) + "京"
    const [head, tail] = splitByWidth('AB東京', 4)
    expect(head).toBe('AB東')
    expect(tail).toBe('京')
  })

  it('maxWidth = 0 のとき前半は空文字列 / maxWidth=0 时前半为空字符串', () => {
    const [head, tail] = splitByWidth('hello', 0)
    expect(head).toBe('')
    expect(tail).toBe('hello')
  })

  it('maxWidth が文字列幅と等しいとき全体が前半 / maxWidth 等于字符串宽度时整体为前半', () => {
    // "あい" 幅 = 4
    const [head, tail] = splitByWidth('あい', 4)
    expect(head).toBe('あい')
    expect(tail).toBe('')
  })

  it('ヤマト住所欄 32 幅（全角16文字）を超えた場合の分割 / 超出大和地址栏32宽时的分割', () => {
    // 全角20文字のアドレスを maxWidth=32 (全角16文字分) で分割
    const longAddr = '東京都渋谷区神宮前一丁目一番一号マンション'
    // 幅 = 20 × 2 = 40 > 32
    const [head, tail] = splitByWidth(longAddr, 32)
    expect(getStringWidth(head)).toBe(32)
    expect(head + tail).toBe(longAddr)
  })

  it('1文字のみ（幅2）に maxWidth=1 を渡すと前半が空 / 单字符（宽2）传 maxWidth=1 时前半为空', () => {
    const [head, tail] = splitByWidth('あ', 1)
    expect(head).toBe('')
    expect(tail).toBe('あ')
  })
})
