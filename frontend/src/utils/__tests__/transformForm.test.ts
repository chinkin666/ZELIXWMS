/**
 * transformForm ユニットテスト / 转换表单工具函数单元测试
 *
 * jsonSchemaToFormFields, buildParamsFromForm の検証
 * 验证 jsonSchemaToFormFields, buildParamsFromForm
 */
import { describe, it, expect } from 'vitest'
import { jsonSchemaToFormFields, buildParamsFromForm } from '../transformForm'
import type { FormField } from '../transformForm'

describe('jsonSchemaToFormFields / JSONスキーマからフォームフィールドを生成', () => {
  it('無効なスキーマでは空配列を返す / 无效 schema 返回空数组', () => {
    expect(jsonSchemaToFormFields(null)).toEqual([])
    expect(jsonSchemaToFormFields({})).toEqual([])
    expect(jsonSchemaToFormFields({ type: 'string' })).toEqual([])
  })

  it('文字列プロパティをstringフィールドに変換する / 将字符串属性转换为 string 字段', () => {
    const schema = {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'regex pattern' },
      },
      required: ['pattern'],
    }
    const fields = jsonSchemaToFormFields(schema)
    expect(fields).toHaveLength(1)
    expect(fields[0]?.key).toBe('pattern')
    expect(fields[0]?.type).toBe('string')
    expect(fields[0]?.required).toBe(true)
    expect(fields[0]?.label).toBe('正規表現パターン')
  })

  it('enumを持つ文字列をselectフィールドに変換する / 将带 enum 的字符串转换为 select 字段', () => {
    const schema = {
      type: 'object',
      properties: {
        position: { type: 'string', enum: ['start', 'end'] },
      },
    }
    const fields = jsonSchemaToFormFields(schema)
    expect(fields).toHaveLength(1)
    expect(fields[0]?.type).toBe('select')
    expect(fields[0]?.options).toEqual([
      { label: 'start', value: 'start' },
      { label: 'end', value: 'end' },
    ])
  })

  it('number/booleanプロパティを正しく変換する / 正确转换 number/boolean 属性', () => {
    const schema = {
      type: 'object',
      properties: {
        index: { type: 'number', minimum: 0, maximum: 100 },
        caseSensitive: { type: 'boolean', default: false },
      },
    }
    const fields = jsonSchemaToFormFields(schema)
    expect(fields).toHaveLength(2)
    const numField = fields.find(f => f.key === 'index')
    expect(numField?.type).toBe('number')
    expect(numField?.min).toBe(0)
    expect(numField?.max).toBe(100)
    const boolField = fields.find(f => f.key === 'caseSensitive')
    expect(boolField?.type).toBe('boolean')
    expect(boolField?.default).toBe(false)
  })

  it('prefixを使用してネストされたキーを生成する / 使用 prefix 生成嵌套键', () => {
    const schema = {
      type: 'object',
      properties: {
        pattern: { type: 'string' },
      },
    }
    const fields = jsonSchemaToFormFields(schema, 'config')
    expect(fields[0]?.key).toBe('config.pattern')
  })
})

describe('buildParamsFromForm / フォーム値からパラメータを構築', () => {
  it('フォーム値を正しい型に変換する / 将表单值转换为正确的类型', () => {
    const fields: FormField[] = [
      { key: 'index', label: 'Index', type: 'number' },
      { key: 'caseSensitive', label: 'Case', type: 'boolean' },
      { key: 'pattern', label: 'Pattern', type: 'string' },
    ]
    const formData = { index: '5', caseSensitive: true, pattern: '\\d+' }
    const result = buildParamsFromForm(fields, formData)
    expect(result.index).toBe(5)
    expect(result.caseSensitive).toBe(true)
    expect(result.pattern).toBe('\\d+')
  })

  it('空の値はスキップし、デフォルト値を使用する / 跳过空值，使用默认值', () => {
    const fields: FormField[] = [
      { key: 'separator', label: 'Sep', type: 'string', default: ',' },
    ]
    const formData = { separator: '' }
    const result = buildParamsFromForm(fields, formData)
    expect(result.separator).toBe(',')
  })

  it('ドット区切りのキーをネストされたオブジェクトに展開する / 将点分隔键展开为嵌套对象', () => {
    const fields: FormField[] = [
      { key: 'config.pattern', label: 'Pattern', type: 'string' },
    ]
    const formData = { 'config.pattern': '\\d+' }
    const result = buildParamsFromForm(fields, formData)
    expect(result.config.pattern).toBe('\\d+')
  })

  it('fieldsに含まれない非一時フィールドを保持する / 保留不在 fields 中的非临时字段', () => {
    const fields: FormField[] = [
      { key: 'pattern', label: 'Pattern', type: 'string' },
    ]
    const formData = { pattern: '\\d+', cases: [{ k: 'v' }], _entryIds: ['x'] }
    const result = buildParamsFromForm(fields, formData)
    expect(result.pattern).toBe('\\d+')
    expect(result.cases).toEqual([{ k: 'v' }])
    // _entryIds は除外される / _entryIds is excluded
    expect(result._entryIds).toBeUndefined()
  })
})
