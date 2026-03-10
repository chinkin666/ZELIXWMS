/**
 * Frontend transform runner - executes transform pipelines in the browser
 * This mirrors the backend runner but runs in the frontend for CSV import
 */

import type {
  TransformMapping,
  TransformPipeline,
  TransformStep,
  InputSource,
  CombineConfig,
  TransformContext,
} from '@/api/mappingConfig'
import { getNestedValue, setNestedValue } from './nestedObject'

// 辅助函数：按格式解析日期
function parseDateByFormat(value: string, format: string): Date | null {
  // 简化版：只支持常见格式
  const formatMap: Record<string, RegExp> = {
    'YYYY-MM-DD': /^(\d{4})-(\d{2})-(\d{2})$/,
    'YYYY/MM/DD': /^(\d{4})\/(\d{2})\/(\d{2})$/,
    'MM/DD/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
    'DD/MM/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
    'YYYY-MM-DD HH:mm:ss': /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
    'YYYY/MM/DD HH:mm:ss': /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
  }
  
  const regex = formatMap[format]
  if (!regex) {
    // 如果没有匹配的格式，尝试直接解析
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  
  const match = value.match(regex)
  if (!match) return null
  
  if (format.includes('HH:mm:ss')) {
    // 包含时间的格式
    const parts = match as RegExpMatchArray
    const year = parts[1] || ''
    const month = parts[2] || ''
    const day = parts[3] || ''
    const hour = parts[4] || ''
    const minute = parts[5] || ''
    const second = parts[6] || ''
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10),
    )
  } else {
    // 只有日期的格式
    const parts = match as RegExpMatchArray
    if (format === 'MM/DD/YYYY') {
      const month = parts[1] || ''
      const day = parts[2] || ''
      const year = parts[3] || ''
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
    } else if (format === 'DD/MM/YYYY') {
      const day = parts[1] || ''
      const month = parts[2] || ''
      const year = parts[3] || ''
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
    } else {
      const year = parts[1] || ''
      const month = parts[2] || ''
      const day = parts[3] || ''
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
    }
  }
}

// 辅助函数：格式化日期
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
}

// 辅助函数：格式化时间
function formatTime(date: Date, format: string): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return format
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

// 导入插件定义
import { transformPlugins as pluginDefs } from './transforms/plugins/core'
import { combinePlugins as combineDefs } from './transforms/plugins/combine'

// 将插件定义转换为执行函数
const transformPlugins: Record<string, (args: { value: any; params: any; context: TransformContext }) => any> = {}
for (const [name, plugin] of Object.entries(pluginDefs)) {
  transformPlugins[name] = plugin.run
}


// 将 combine 插件定义转换为执行函数
const combinePlugins: Record<string, (values: any[], params: any, context: TransformContext) => any> = {}
for (const [name, plugin] of Object.entries(combineDefs)) {
  combinePlugins[name] = plugin.run
}

const defaultOnError = { mode: 'fail' as const }

async function runStep(
  step: TransformStep,
  value: any,
  context: TransformContext,
): Promise<any> {
  if (step.enabled === false) return value
  
  const plugin = transformPlugins[step.plugin]
  if (!plugin) {
    throw new Error(`Transform plugin not found: ${step.plugin}`)
  }
  
  const onError = step.onError ?? defaultOnError
  try {
    // 确保 context 包含 row 信息
    const contextWithRow = {
      ...context,
      meta: {
        ...context.meta,
        row: context.meta?.row || {},
      },
    }
    const result = plugin({ value, params: step.params || {}, context: contextWithRow })
    // Handle both sync and async results
    return result instanceof Promise ? await result : result
  } catch (err) {
    if (onError.mode === 'skip') return value
    if (onError.mode === 'fallback') return onError.value
    throw err
  }
}

export async function runPipeline(
  pipeline: TransformPipeline | undefined,
  value: any,
  context: TransformContext = {},
): Promise<any> {
  if (!pipeline || !pipeline.steps || pipeline.steps.length === 0) return value
  
  let current = value
  for (const step of pipeline.steps) {
    current = await runStep(step, current, context)
  }
  return current
}

async function runCombine(
  combine: CombineConfig,
  values: any[],
  context: TransformContext,
): Promise<any> {
  const plugin = combinePlugins[combine.plugin]
  if (!plugin) {
    throw new Error(`Combine plugin not found: ${combine.plugin}`)
  }
  const result = plugin(values, combine.params || {}, context)
  return result instanceof Promise ? await result : result
}

async function resolveInputSource(
  input: InputSource,
  row: Record<string, any>,
  context: TransformContext,
): Promise<any> {
  let base: any
  if (input.type === 'column') {
    const col = input.column
    // First check if the key exists as a direct property (for flattened rows like {'recipient.phone': '...'})
    // Then fallback to nested access (for original nested structures like {recipient: {phone: '...'}})
    if (col in row) {
      base = row[col]
    } else {
      base = getNestedValue(row, col)
    }
  } else if (input.type === 'literal') {
    base = input.value
  }

  return runPipeline(input.pipeline, base, context)
}

export async function runTransformMapping(
  mapping: TransformMapping,
  row: Record<string, any>,
  context: TransformContext = {},
): Promise<any> {
  // 确保 context 包含 row 信息，供插件使用（如 http.fetchJson 的 bodyParams）
  const contextWithRow = {
    ...context,
    meta: {
      ...context.meta,
      row,
    },
  }
  
  const inputValues: any[] = []
  for (const input of mapping.inputs) {
    const v = await resolveInputSource(input, row, contextWithRow)
    inputValues.push(v)
  }
  
  let combined = await runCombine(mapping.combine, inputValues, contextWithRow)
  combined = await runPipeline(mapping.outputPipeline, combined, contextWithRow)
  
  if (combined === undefined || combined === null || combined === '') {
    return mapping.defaultValue ?? combined
  }
  return combined
}

/**
 * Apply all mappings from a mapping config to a source row
 */
export async function applyTransformMappings(
  mappings: TransformMapping[],
  sourceRow: Record<string, any>,
  context: TransformContext = {},
): Promise<Record<string, any>> {
  const result: Record<string, any> = {}

  for (const mapping of mappings) {
    try {
      const value = await runTransformMapping(mapping, sourceRow, context)
      // 使用 setNestedValue 支持嵌套字段（如 carrierData.yamato.hatsuBaseNo1）
      if (mapping.targetField.includes('.')) {
        setNestedValue(result, mapping.targetField, value)
      } else {
        result[mapping.targetField] = value
      }
    } catch (error) {
      console.error(`Error applying mapping for ${mapping.targetField}:`, error)
      // Use default value or empty string on error
      const defaultVal = mapping.defaultValue ?? ''
      if (mapping.targetField.includes('.')) {
        setNestedValue(result, mapping.targetField, defaultVal)
      } else {
        result[mapping.targetField] = defaultVal
      }
    }
  }

  return result
}

