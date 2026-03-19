/**
 * dateNormalize 前端ユニットテスト / 前端日期规范化单元测试
 * 日本の倉庫では YYYY/MM/DD 形式が標準 / 日本仓库使用YYYY/MM/DD格式
 */
import { describe, it, expect } from 'vitest'
import { normalizeDateOnly } from '../dateNormalize'

describe('normalizeDateOnly / 日付正規化', () => {
  it('YYYY/MM/DD はそのまま返す', () => {
    expect(normalizeDateOnly('2026/03/19')).toBe('2026/03/19')
  })

  it('YYYY-MM-DD を YYYY/MM/DD に変換', () => {
    expect(normalizeDateOnly('2026-03-19')).toBe('2026/03/19')
  })

  it('日時文字列から日付部分のみ抽出', () => {
    expect(normalizeDateOnly('2026-03-19T15:30:00.000Z')).toBe('2026/03/19')
    expect(normalizeDateOnly('2026/03/19 15:30')).toBe('2026/03/19')
  })

  it('Dateオブジェクトを変換', () => {
    const d = new Date(2026, 2, 19) // 2026-03-19
    const result = normalizeDateOnly(d)
    expect(result).toBe('2026/03/19')
  })

  it('null/undefined/空で空文字列', () => {
    expect(normalizeDateOnly(null)).toBe('')
    expect(normalizeDateOnly(undefined)).toBe('')
    expect(normalizeDateOnly('')).toBe('')
  })

  it('無効な値で空文字列', () => {
    expect(normalizeDateOnly('abc')).toBe('')
    expect(normalizeDateOnly(new Date('invalid'))).toBe('')
  })

  it('出荷予定日のフォーマット / 出货预定日格式', () => {
    expect(normalizeDateOnly('2026-12-31')).toBe('2026/12/31')
    expect(normalizeDateOnly('2026/01/01')).toBe('2026/01/01')
  })
})
