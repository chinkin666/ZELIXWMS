/**
 * orderValidation 前端ユニットテスト / 前端订单验证单元测试
 *
 * ヤマト運輸の送り状制約に準拠するバリデーションテスト
 * 符合大和运输发货单约束的验证测试
 */
import { describe, it, expect } from 'vitest'
import {
  isEmpty,
  normalizeValue,
  validateCell,
  isCoolTypeSupported,
  getCoolTypeOptionsForInvoiceType,
  validateAddressFields,
  VALIDATION_RULES,
} from '../orderValidation'

describe('isEmpty / 空判定', () => {
  it('null/undefined/空文字列はtrue', () => {
    expect(isEmpty(null)).toBe(true)
    expect(isEmpty(undefined)).toBe(true)
    expect(isEmpty('')).toBe(true)
    expect(isEmpty('-')).toBe(true)
    expect(isEmpty([])).toBe(true)
  })

  it('値があればfalse', () => {
    expect(isEmpty('abc')).toBe(false)
    expect(isEmpty(0)).toBe(false)
    expect(isEmpty([1])).toBe(false)
  })
})

describe('normalizeValue / 値正規化', () => {
  it('文字列のトリム', () => {
    expect(normalizeValue('  abc  ')).toBe('abc')
  })

  it('非文字列はそのまま', () => {
    expect(normalizeValue(123)).toBe(123)
    expect(normalizeValue(null)).toBe(null)
  })
})

describe('VALIDATION_RULES / バリデーションルール', () => {
  it('郵便番号: 7桁数字', () => {
    expect(VALIDATION_RULES.postalCode.test('1234567')).toBe(true)
    expect(VALIDATION_RULES.postalCode.test('123-4567')).toBe(false)
    expect(VALIDATION_RULES.postalCode.test('12345')).toBe(false)
  })

  it('配達時間帯: 4桁数字', () => {
    expect(VALIDATION_RULES.deliveryTimeSlot.test('0812')).toBe(true)
    expect(VALIDATION_RULES.deliveryTimeSlot.test('08:12')).toBe(false)
  })

  it('送り状種類', () => {
    expect(VALIDATION_RULES.invoiceTypes.has('0')).toBe(true) // 発払い
    expect(VALIDATION_RULES.invoiceTypes.has('2')).toBe(true) // コレクト
    expect(VALIDATION_RULES.invoiceTypes.has('X')).toBe(false)
  })

  it('クール区分', () => {
    expect(VALIDATION_RULES.coolTypes.has('0')).toBe(true) // 通常
    expect(VALIDATION_RULES.coolTypes.has('1')).toBe(true) // 冷凍
    expect(VALIDATION_RULES.coolTypes.has('2')).toBe(true) // 冷蔵
    expect(VALIDATION_RULES.coolTypes.has('3')).toBe(false)
  })
})

describe('isCoolTypeSupported / クール便対応チェック', () => {
  it('発払い(0)はクール対応', () => {
    expect(isCoolTypeSupported('0')).toBe(true)
  })

  it('コレクト(2)はクール対応', () => {
    expect(isCoolTypeSupported('2')).toBe(true)
  })

  it('着払い(5)はクール対応', () => {
    expect(isCoolTypeSupported('5')).toBe(true)
  })

  it('DM便(3)はクール非対応', () => {
    expect(isCoolTypeSupported('3')).toBe(false)
  })
})

describe('getCoolTypeOptionsForInvoiceType / クール区分オプション取得', () => {
  it('発払い→3オプション', () => {
    const options = getCoolTypeOptionsForInvoiceType('0')
    expect(options).toHaveLength(3)
    expect(options.map(o => o.value)).toEqual(['0', '1', '2'])
  })

  it('DM便→通常のみ', () => {
    const options = getCoolTypeOptionsForInvoiceType('3')
    expect(options).toHaveLength(1)
    expect(options[0].value).toBe('0')
  })
})

describe('validateCell / セルバリデーション', () => {
  it('必須フィールドが空→false', () => {
    const result = validateCell({ name: '' }, { key: 'name', required: true } as any)
    expect(result).toBe(false)
  })

  it('必須フィールドに値あり→true', () => {
    const result = validateCell({ name: '田中' }, { key: 'name', required: true } as any)
    expect(result).toBe(true)
  })

  it('郵便番号: 7桁→true', () => {
    const result = validateCell(
      { recipient: { postalCode: '1600023' } },
      { key: 'recipient.postalCode', dataKey: 'recipient.postalCode' } as any,
    )
    expect(result).toBe(true)
  })

  it('郵便番号: ハイフン付き→false', () => {
    const result = validateCell(
      { recipient: { postalCode: '160-0023' } },
      { key: 'recipient.postalCode', dataKey: 'recipient.postalCode' } as any,
    )
    expect(result).toBe(false)
  })

  it('電話番号: 数字のみ→true', () => {
    const result = validateCell(
      { recipient: { phone: '09012345678' } },
      { key: 'recipient.phone', dataKey: 'recipient.phone' } as any,
    )
    expect(result).toBe(true)
  })

  it('電話番号: ハイフン付き→false', () => {
    const result = validateCell(
      { recipient: { phone: '090-1234-5678' } },
      { key: 'recipient.phone', dataKey: 'recipient.phone' } as any,
    )
    expect(result).toBe(false)
  })

  it('配達時間帯: 0812→true', () => {
    const result = validateCell(
      { deliveryTimeSlot: '0812' },
      { key: 'deliveryTimeSlot', dataKey: 'deliveryTimeSlot' } as any,
    )
    expect(result).toBe(true)
  })

  it('配達時間帯: 開始>=終了→false', () => {
    const result = validateCell(
      { deliveryTimeSlot: '1208' },
      { key: 'deliveryTimeSlot', dataKey: 'deliveryTimeSlot' } as any,
    )
    expect(result).toBe(false)
  })

  it('送り状種類: 0→true', () => {
    const result = validateCell(
      { invoiceType: '0' },
      { key: 'invoiceType', dataKey: 'invoiceType' } as any,
    )
    expect(result).toBe(true)
  })

  it('クール冷凍 + DM便 → false（非対応）', () => {
    const result = validateCell(
      { coolType: '1', invoiceType: '3' },
      { key: 'coolType', dataKey: 'coolType' } as any,
    )
    expect(result).toBe(false)
  })

  it('クール冷凍 + 発払い → true（対応）', () => {
    const result = validateCell(
      { coolType: '1', invoiceType: '0' },
      { key: 'coolType', dataKey: 'coolType' } as any,
    )
    expect(result).toBe(true)
  })

  it('number型: 範囲チェック', () => {
    expect(validateCell({ qty: 5 }, { key: 'qty', fieldType: 'number', min: 1, max: 10 } as any)).toBe(true)
    expect(validateCell({ qty: 0 }, { key: 'qty', fieldType: 'number', min: 1 } as any)).toBe(false)
    expect(validateCell({ qty: 100 }, { key: 'qty', fieldType: 'number', max: 50 } as any)).toBe(false)
  })

  it('products配列: 有効な構造→true', () => {
    const result = validateCell(
      { products: [{ inputSku: 'SKU-001', quantity: 3 }] },
      { key: 'products', dataKey: 'products', fieldType: 'array', required: true } as any,
    )
    expect(result).toBe(true)
  })

  it('products配列: SKUなし→false', () => {
    const result = validateCell(
      { products: [{ inputSku: '', quantity: 3 }] },
      { key: 'products', dataKey: 'products', fieldType: 'array', required: true } as any,
    )
    expect(result).toBe(false)
  })

  it('products配列: 数量0→false', () => {
    const result = validateCell(
      { products: [{ inputSku: 'SKU-001', quantity: 0 }] },
      { key: 'products', dataKey: 'products', fieldType: 'array' } as any,
    )
    expect(result).toBe(false)
  })
})

describe('validateAddressFields / 住所フィールド検証', () => {
  it('制限内の住所→エラーなし', () => {
    const row = {
      recipient: { city: '渋谷区', street: '渋谷1-2-3', building: 'ABCビル5F' },
      sender: { city: '千代田区', street: '丸の内1-1', building: '' },
    }
    expect(validateAddressFields(row)).toHaveLength(0)
  })

  it('市区郡町村が24半角幅超→エラー', () => {
    const row = {
      recipient: { city: 'あいうえおかきくけこさしすせそ', street: '', building: '' }, // 15全角=30半角幅
    }
    const errors = validateAddressFields(row)
    expect(errors.some(e => e.includes('市区郡町村'))).toBe(true)
  })
})
