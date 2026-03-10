import type { Operator, SearchType, TableColumn } from '@/types/table'

const getValueByPath = (obj: any, path?: string) => {
  if (!obj || !path) return undefined
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj)
}

const isEmptyValue = (value: any) => value === null || value === undefined || value === ''

const toNumber = (value: any): number | null => {
  if (typeof value === 'number') return value
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const toDate = (value: any): Date | null => {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

const normalizeString = (value: any): string => {
  if (Array.isArray(value)) return value.join(' ')
  if (value === null || value === undefined) return ''
  return String(value)
}

const matchesString = (value: any, operator: Operator, target: any) => {
  // 对于数组字段（如 _productsMeta.names, _productsMeta.skus），需要特殊处理
  // 检查数组中是否有任何元素匹配
  if (Array.isArray(value)) {
    if (value.length === 0) {
      // 空数组的处理
      if (operator === 'isEmpty') return true
      if (operator === 'hasAnyValue') return false
      // 其他操作符对空数组返回 false（不匹配）
      return false
    }
    
    const t = normalizeString(target)
    const tLower = t.toLowerCase().trim()
    if (!tLower) {
      // 目标为空时的处理
      if (operator === 'isEmpty') return false
      if (operator === 'hasAnyValue') return true
      return false
    }
    
    switch (operator) {
      case 'is':
        // 数组中有完全匹配的元素
        return value.some((item) => String(item).toLowerCase().trim() === tLower)
      case 'isNot':
        // 数组中没有任何完全匹配的元素
        return !value.some((item) => String(item).toLowerCase().trim() === tLower)
      case 'contains':
        // 数组中是否有任何元素包含目标字符串
        return value.some((item) => String(item).toLowerCase().includes(tLower))
      case 'notContains':
        // 数组中没有任何元素包含目标字符串
        return !value.some((item) => String(item).toLowerCase().includes(tLower))
      case 'hasAnyValue':
        return value.length > 0
      case 'isEmpty':
        return value.length === 0
      default:
        return false
    }
  }
  
  // 非数组字段的原有逻辑
  const v = normalizeString(value)
  const t = normalizeString(target)
  switch (operator) {
    case 'is':
      return v === t
    case 'isNot':
      return v !== t
    case 'contains':
      return v.includes(t)
    case 'notContains':
      return !v.includes(t)
    case 'hasAnyValue':
      return !isEmptyValue(value)
    case 'isEmpty':
      return isEmptyValue(value)
    default:
      return false
  }
}

const matchesNumber = (value: any, operator: Operator, target: any) => {
  const v = toNumber(value)
  if (v === null) return false

  if (operator === 'hasAnyValue') return true
  if (operator === 'isEmpty') return isEmptyValue(value)

  const t = Array.isArray(target) ? target.map(toNumber) : toNumber(target)

  switch (operator) {
    case 'equals':
      return v === t
    case 'notEquals':
      return v !== t
    case 'greaterThan':
      return v > (t as number)
    case 'greaterThanOrEqual':
      return v >= (t as number)
    case 'lessThan':
      return v < (t as number)
    case 'lessThanOrEqual':
      return v <= (t as number)
    case 'between': {
      const [min, max] = t as [number | null, number | null]
      if (min === null || max === null) return false
      return v >= min && v <= max
    }
    default:
      return false
  }
}

const sameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()

const matchesDate = (value: any, operator: Operator, target: any) => {
  const vDate = toDate(value)
  if (!vDate) return false

  const toTargetDate = (val: any) => toDate(val)

  // 将日期设置为当天结束时间 (23:59:59.999)
  const toEndOfDay = (date: Date): Date => {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d
  }

  // 将日期设置为当天开始时间 (00:00:00.000)
  const toStartOfDay = (date: Date): Date => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  if (Array.isArray(target)) {
    // between range
    const start = toTargetDate(target[0])
    const end = toTargetDate(target[1])
    if (!start || !end) return false
    if (operator === 'between') {
      // 开始日期使用当天开始，结束日期使用当天结束
      return vDate >= toStartOfDay(start) && vDate <= toEndOfDay(end)
    }
  } else {
    const tDate = toTargetDate(target)
    if (!tDate && operator !== 'hasAnyValue' && operator !== 'isEmpty') return false

    switch (operator) {
      case 'equals':
      case 'is':
        return tDate ? sameDay(vDate, tDate) : false
      case 'notEquals':
      case 'isNot':
        return tDate ? !sameDay(vDate, tDate) : false
      case 'before':
        return tDate ? vDate < tDate : false
      case 'after':
        return tDate ? vDate > tDate : false
      case 'hasAnyValue':
        return !isEmptyValue(value)
      case 'isEmpty':
        return isEmptyValue(value)
      default:
        return false
    }
  }

  return false
}

const matchesBoolean = (value: any, operator: Operator, target: any) => {
  const coerceBoolean = (val: any): boolean | null => {
    if (val === undefined || val === null) return null
    if (typeof val === 'boolean') return val
    if (typeof val === 'number') return val !== 0
    if (typeof val === 'string') {
      const toHalfWidthDigits = (input: string) =>
        input.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))

      const s = toHalfWidthDigits(val).trim().toLowerCase()
      if (!s || s === '-') return null
      if (s === 'true' || s === 'yes' || s === 'y' || s === 'はい') return true
      if (s === 'false' || s === 'no' || s === 'n' || s === 'いいえ') return false

      // numeric string: treat 0 as false, non-zero as true
      if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) {
        const n = Number(s)
        if (Number.isFinite(n)) return n !== 0
      }

      // fallback: keep previous behavior for other non-empty strings
      return Boolean(s)
    }
    return Boolean(val)
  }

  const v = coerceBoolean(value)
  const t = coerceBoolean(target)
  if (v === null || t === null) return false
  switch (operator) {
    case 'is':
      return v === t
    case 'isNot':
      return v !== t
    default:
      return false
  }
}

const matchesSelect = matchesString

export const filterDataBySearch = <T>(
  rows: T[],
  columns: TableColumn[],
  payload: Record<string, { operator: Operator; value: any }>,
): T[] => {
  const columnMap = new Map(columns.map((c) => [c.key, c]))

  const matchRow = (row: T): boolean => {
    for (const key of Object.keys(payload)) {
      const column = columnMap.get(key)
      if (!column) continue
      const entry = payload[key]
      if (!entry) continue
      const { operator, value } = entry
      const fieldType = column.fieldType
      const searchType = column.searchType
      let type: SearchType | undefined = searchType
      if (!type && fieldType) {
        // 将 fieldType 转换为 SearchType，过滤掉不兼容的类型
        if (fieldType === 'string' || fieldType === 'number' || fieldType === 'boolean' || fieldType === 'date' || fieldType === 'dateOnly' || fieldType === 'array') {
          type = fieldType === 'dateOnly' ? 'date' : fieldType === 'array' ? 'select' : fieldType as SearchType
        } else {
          type = 'string' // 默认 fallback
        }
      }
      if (!type) type = 'string'
      const dataValue = getValueByPath(row, column.dataKey || column.key)

      let ok = false
      switch (type) {
        case 'string':
          ok = matchesString(dataValue, operator, value)
          break
        case 'select':
          ok = matchesSelect(dataValue, operator, value)
          break
        case 'number':
          ok = matchesNumber(dataValue, operator, value)
          break
        case 'date':
        case 'daterange':
          ok = matchesDate(dataValue, operator, value)
          break
        case 'boolean':
          ok = matchesBoolean(dataValue, operator, value)
          break
        default:
          ok = matchesString(dataValue, operator, value)
          break
      }

      if (!ok) return false
    }
    return true
  }

  return rows.filter(matchRow)
}

export default filterDataBySearch

