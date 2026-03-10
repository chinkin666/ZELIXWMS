/**
 * Nested object utility functions
 * Used for handling nested key paths like 'refs.orderNo'
 */

/**
 * Set a value in a nested object by path
 * @param obj Target object
 * @param path Path like 'refs.orderNo'
 * @param value Value to set
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
 * Get a value from a nested object by path
 * @param obj Source object
 * @param path Path like 'refs.orderNo'
 * @returns Value or undefined if path doesn't exist
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
 * Check if a nested path exists
 * @param obj Source object
 * @param path Path
 * @returns Whether the path exists
 */
export function hasNestedValue(obj: Record<string, any>, path: string): boolean {
  return getNestedValue(obj, path) !== undefined
}
