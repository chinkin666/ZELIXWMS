/**
 * barcode ユニットテスト / 条码工具函数单元测试
 *
 * mergeBarcodesWithSku の検証
 * 验证 mergeBarcodesWithSku
 */
import { describe, it, expect } from 'vitest'
import { mergeBarcodesWithSku } from '../barcode'

describe('mergeBarcodesWithSku / バーコードとSKUの結合', () => {
  it('バーコード配列とSKUを結合し、SKUを最後に配置する / 合并条码数组和SKU，SKU放在最后', () => {
    const result = mergeBarcodesWithSku(['BC-001', 'BC-002'], 'SKU-100')
    expect(result).toEqual(['BC-001', 'BC-002', 'SKU-100'])
  })

  it('重複を除去する / 去除重复', () => {
    const result = mergeBarcodesWithSku(['BC-001', 'BC-001', 'BC-002'], 'SKU-100')
    expect(result).toEqual(['BC-001', 'BC-002', 'SKU-100'])
  })

  it('SKUがバーコード配列に含まれる場合、最後に移動する / SKU已在条码数组中时移到最后', () => {
    const result = mergeBarcodesWithSku(['SKU-100', 'BC-001'], 'SKU-100')
    expect(result).toEqual(['BC-001', 'SKU-100'])
  })

  it('SKUが未指定の場合、バーコードのみ返す / SKU未指定时只返回条码', () => {
    const result = mergeBarcodesWithSku(['BC-001', 'BC-002'])
    expect(result).toEqual(['BC-001', 'BC-002'])
  })

  it('null/undefinedを含むバーコード配列をフィルタリングする / 过滤包含 null/undefined 的条码数组', () => {
    const result = mergeBarcodesWithSku([null, 'BC-001', undefined, '', 'BC-002'], 'SKU-100')
    expect(result).toEqual(['BC-001', 'BC-002', 'SKU-100'])
  })

  it('undefinedのバーコード配列を処理する / 处理 undefined 的条码数组', () => {
    const result = mergeBarcodesWithSku(undefined, 'SKU-100')
    expect(result).toEqual(['SKU-100'])
  })

  it('空のSKUと空の配列は空配列を返す / 空SKU和空数组返回空数组', () => {
    const result = mergeBarcodesWithSku([], '')
    expect(result).toEqual([])
  })
})
