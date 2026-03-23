/**
 * carrier ユニットテスト / 配送業者工具函数单元测试
 *
 * BUILT_IN_CARRIER_PREFIX, isBuiltInCarrierId の検証
 * 验证 BUILT_IN_CARRIER_PREFIX, isBuiltInCarrierId
 */
import { describe, it, expect } from 'vitest'
import { BUILT_IN_CARRIER_PREFIX, isBuiltInCarrierId } from '../carrier'

describe('BUILT_IN_CARRIER_PREFIX / 内置配送業者IDプレフィックス', () => {
  it('正しいプレフィックスを持つ / 拥有正确的前缀', () => {
    expect(BUILT_IN_CARRIER_PREFIX).toBe('__builtin_')
  })
})

describe('isBuiltInCarrierId / 内置配送業者ID判定', () => {
  it('内置プレフィックスを持つIDはtrueを返す / 具有内置前缀的 ID 返回 true', () => {
    expect(isBuiltInCarrierId('__builtin_yamato__')).toBe(true)
    expect(isBuiltInCarrierId('__builtin_sagawa__')).toBe(true)
  })

  it('通常のIDはfalseを返す / 普通 ID 返回 false', () => {
    expect(isBuiltInCarrierId('carrier-001')).toBe(false)
    expect(isBuiltInCarrierId('custom_carrier')).toBe(false)
  })

  it('null/undefinedはfalseを返す / null/undefined 返回 false', () => {
    expect(isBuiltInCarrierId(null)).toBe(false)
    expect(isBuiltInCarrierId(undefined)).toBe(false)
  })

  it('空文字列はfalseを返す / 空字符串返回 false', () => {
    expect(isBuiltInCarrierId('')).toBe(false)
  })
})
