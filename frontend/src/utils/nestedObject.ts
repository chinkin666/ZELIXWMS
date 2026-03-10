/**
 * 嵌套对象工具函数
 * 用于处理类似 'refs.orderNo' 这样的嵌套键路径
 */

/**
 * 根据路径设置嵌套对象的值
 * @param obj 目标对象
 * @param path 路径，如 'refs.orderNo'
 * @param value 要设置的值
 */
export function setNestedValue(obj: Record<string, any>, path: string, value: any): void {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (key === undefined) continue
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    }
    current = current[key]
  }

  const lastKey = keys[keys.length - 1]
  if (lastKey !== undefined) {
    current[lastKey] = value
  }
}

/**
 * 根据路径获取嵌套对象的值
 * @param obj 源对象
 * @param path 路径，如 'refs.orderNo'
 * @returns 值，如果路径不存在返回 undefined
 */
export function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = current[key]
    if (current === undefined) {
      return undefined
    }
  }

  return current
}

/**
 * 检查嵌套路径是否存在
 * @param obj 源对象
 * @param path 路径
 * @returns 是否存在
 */
export function hasNestedValue(obj: Record<string, any>, path: string): boolean {
  return getNestedValue(obj, path) !== undefined
}

