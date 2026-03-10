/**
 * Combine plugins - 前端实现
 */

import type { TransformContext } from '@/api/mappingConfig'

export interface CombinePlugin {
  name: string
  nameJa?: string
  summary?: string
  run: (values: any[], params: any, context: TransformContext) => Promise<any> | any
}

export const combineConcat: CombinePlugin = {
  name: 'combine.concat',
  nameJa: '値を結合',
  summary: 'Join values into a string',
  run: (values, params) => {
    const sep = params?.separator ?? ''
    const ignoreEmpty = params?.ignoreEmpty !== false
    const filtered = ignoreEmpty
      ? values.filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
      : values
    return filtered.map((v) => (v === undefined || v === null ? '' : String(v))).join(sep)
  },
}

export const combineFirst: CombinePlugin = {
  name: 'combine.first',
  nameJa: '最初の非空値を取得',
  summary: 'Pick the first non-empty value',
  run: (values) => {
    for (const v of values) {
      if (v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '')) {
        return v
      }
    }
    return undefined
  },
}

export const combineArray: CombinePlugin = {
  name: 'combine.array',
  nameJa: '値を配列に結合',
  summary: 'Combine values into array',
  run: (values) => {
    return values.filter((v) => v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === ''))
  },
}

// 导出所有 combine 插件
export const combinePlugins: Record<string, CombinePlugin> = {
  'combine.concat': combineConcat,
  'combine.first': combineFirst,
  'combine.array': combineArray,
}

