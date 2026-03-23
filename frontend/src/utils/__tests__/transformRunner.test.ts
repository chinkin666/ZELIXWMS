/**
 * transformRunner ユニットテスト / 转换运行器单元测试
 *
 * runPipeline, runTransformMapping, applyTransformMappings の検証
 * 验证 runPipeline, runTransformMapping, applyTransformMappings
 */
import { describe, it, expect, vi } from 'vitest'

// プラグインをモック / mock 插件
vi.mock('../transforms/plugins/core', () => ({
  transformPlugins: {
    'string.uppercase': {
      run: ({ value }: { value: any }) => String(value).toUpperCase(),
    },
    'string.trim': {
      run: ({ value }: { value: any }) => String(value).trim(),
    },
    'failing.plugin': {
      run: () => { throw new Error('plugin error') },
    },
  },
}))

vi.mock('../transforms/plugins/combine', () => ({
  combinePlugins: {
    'combine.first': {
      run: (values: any[]) => values[0],
    },
    'combine.join': {
      run: (values: any[], params: any) => values.join(params.separator || ''),
    },
  },
}))

import { runPipeline, runTransformMapping, applyTransformMappings } from '../transformRunner'

describe('runPipeline / パイプライン実行', () => {
  it('パイプラインが未定義の場合は値をそのまま返す / pipeline 为 undefined 时原样返回值', async () => {
    const result = await runPipeline(undefined, 'hello')
    expect(result).toBe('hello')
  })

  it('ステップが空の場合は値をそのまま返す / steps 为空时原样返回值', async () => {
    const result = await runPipeline({ steps: [] }, 'hello')
    expect(result).toBe('hello')
  })

  it('複数のステップを順番に実行する / 按顺序执行多个步骤', async () => {
    const pipeline = {
      steps: [
        { plugin: 'string.trim', params: {} },
        { plugin: 'string.uppercase', params: {} },
      ],
    }
    const result = await runPipeline(pipeline, '  hello  ')
    expect(result).toBe('HELLO')
  })

  it('disabled のステップをスキップする / 跳过 disabled 的步骤', async () => {
    const pipeline = {
      steps: [
        { plugin: 'string.uppercase', params: {}, enabled: false },
      ],
    }
    const result = await runPipeline(pipeline, 'hello')
    expect(result).toBe('hello')
  })
})

describe('runTransformMapping / マッピング実行', () => {
  it('column入力からマッピングを実行する / 从 column 输入执行映射', async () => {
    const mapping = {
      targetField: 'name',
      inputs: [{ type: 'column' as const, column: 'productName' }],
      combine: { plugin: 'combine.first', params: {} },
    }
    const row = { productName: 'Widget' }
    const result = await runTransformMapping(mapping, row)
    expect(result).toBe('Widget')
  })

  it('literal入力からマッピングを実行する / 从 literal 输入执行映射', async () => {
    const mapping = {
      targetField: 'type',
      inputs: [{ type: 'literal' as const, value: 'default' }],
      combine: { plugin: 'combine.first', params: {} },
    }
    const result = await runTransformMapping(mapping, {})
    expect(result).toBe('default')
  })

  it('空の結果にdefaultValueを使用する / 空结果使用 defaultValue', async () => {
    const mapping = {
      targetField: 'name',
      inputs: [{ type: 'column' as const, column: 'missing' }],
      combine: { plugin: 'combine.first', params: {} },
      defaultValue: 'N/A',
    }
    const result = await runTransformMapping(mapping, {})
    expect(result).toBe('N/A')
  })
})

describe('applyTransformMappings / マッピング一括適用', () => {
  it('複数のマッピングを適用して結果を返す / 应用多个映射并返回结果', async () => {
    const mappings = [
      {
        targetField: 'name',
        inputs: [{ type: 'column' as const, column: 'productName' }],
        combine: { plugin: 'combine.first', params: {} },
      },
      {
        targetField: 'code',
        inputs: [{ type: 'literal' as const, value: 'ABC' }],
        combine: { plugin: 'combine.first', params: {} },
      },
    ]
    const row = { productName: 'Widget' }
    const result = await applyTransformMappings(mappings, row)
    expect(result.name).toBe('Widget')
    expect(result.code).toBe('ABC')
  })

  it('エラー時にdefaultValueを使用する / 错误时使用 defaultValue', async () => {
    const mappings = [
      {
        targetField: 'broken',
        inputs: [{ type: 'column' as const, column: 'x' }],
        combine: { plugin: 'nonexistent', params: {} },
        defaultValue: 'fallback',
      },
    ]
    const result = await applyTransformMappings(mappings, {})
    expect(result.broken).toBe('fallback')
  })
})
