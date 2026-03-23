/**
 * nestedObject ユニットテスト / 嵌套对象工具函数单元测试
 *
 * setNestedValue, getNestedValue, hasNestedValue の検証
 * 验证 setNestedValue, getNestedValue, hasNestedValue
 */
import { describe, it, expect } from 'vitest'
import { setNestedValue, getNestedValue, hasNestedValue } from '../nestedObject'

describe('getNestedValue / 嵌套取值', () => {
  it('トップレベルの値を取得する / 获取顶层值', () => {
    expect(getNestedValue({ name: 'Alice' }, 'name')).toBe('Alice')
  })

  it('ネストされた値を取得する / 获取嵌套值', () => {
    const obj = { refs: { orderNo: 'ORD-001' } }
    expect(getNestedValue(obj, 'refs.orderNo')).toBe('ORD-001')
  })

  it('存在しないパスはundefinedを返す / 不存在的路径返回 undefined', () => {
    expect(getNestedValue({ a: 1 }, 'b.c.d')).toBeUndefined()
  })

  it('中間がnullの場合はundefinedを返す / 中间为 null 时返回 undefined', () => {
    const obj = { a: null } as any
    expect(getNestedValue(obj, 'a.b')).toBeUndefined()
  })

  it('深くネストされたパスを取得する / 获取深层嵌套路径', () => {
    const obj = { a: { b: { c: { d: 42 } } } }
    expect(getNestedValue(obj, 'a.b.c.d')).toBe(42)
  })
})

describe('setNestedValue / 嵌套设值', () => {
  it('トップレベルの値を設定する / 设置顶层值', () => {
    const obj: Record<string, any> = {}
    setNestedValue(obj, 'name', 'Bob')
    expect(obj.name).toBe('Bob')
  })

  it('ネストされたパスに値を設定する（中間オブジェクトを自動生成）/ 设置嵌套路径（自动创建中间对象）', () => {
    const obj: Record<string, any> = {}
    setNestedValue(obj, 'refs.orderNo', 'ORD-002')
    expect(obj.refs.orderNo).toBe('ORD-002')
  })

  it('既存のネストされた値を上書きする / 覆盖现有嵌套值', () => {
    const obj: Record<string, any> = { refs: { orderNo: 'OLD' } }
    setNestedValue(obj, 'refs.orderNo', 'NEW')
    expect(obj.refs.orderNo).toBe('NEW')
  })

  it('深いパスに値を設定する / 设置深层路径的值', () => {
    const obj: Record<string, any> = {}
    setNestedValue(obj, 'a.b.c', 'deep')
    expect(obj.a.b.c).toBe('deep')
  })
})

describe('hasNestedValue / 嵌套存在判定', () => {
  it('存在するパスはtrueを返す / 存在的路径返回 true', () => {
    expect(hasNestedValue({ a: { b: 1 } }, 'a.b')).toBe(true)
  })

  it('存在しないパスはfalseを返す / 不存在的路径返回 false', () => {
    expect(hasNestedValue({ a: 1 }, 'b.c')).toBe(false)
  })

  it('値が0やfalseでもtrueを返す / 值为 0 或 false 也返回 true', () => {
    expect(hasNestedValue({ count: 0 }, 'count')).toBe(true)
    expect(hasNestedValue({ flag: false }, 'flag')).toBe(true)
  })
})
