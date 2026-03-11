/**
 * 内置配送業者ID前缀
 */
export const BUILT_IN_CARRIER_PREFIX = '__builtin_'

/**
 * 检查是否为内置配送業者ID
 */
export function isBuiltInCarrierId(carrierId: string | undefined | null): boolean {
  if (!carrierId) return false
  return String(carrierId).startsWith(BUILT_IN_CARRIER_PREFIX)
}
