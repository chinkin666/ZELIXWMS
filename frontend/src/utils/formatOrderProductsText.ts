export type OrderProductLike = {
  name?: string | null
  sku?: string | null
  quantity?: number | string | null
}

export interface FormatOrderProductsTextOptions {
  /**
   * 商品同士の区切り文字
   * 例: ' / '
   */
  itemSeparator?: string
  /**
   * quantity 表示の区切り文字
   * 例: ' x '
   */
  quantitySeparator?: string
  /**
   * name が空の場合に sku で代替する
   */
  fallbackToSku?: boolean
}

/**
 * Order の商品配列を "{name} x {quantity} / ..." 形式に整形する。
 * - quantity === 1 の場合は "x1" を表示しない
 */
export function formatOrderProductsText(
  products: Array<OrderProductLike> | null | undefined,
  opts?: FormatOrderProductsTextOptions,
): string {
  if (!Array.isArray(products) || products.length === 0) return ''

  const itemSeparator = opts?.itemSeparator ?? ' / '
  const quantitySeparator = opts?.quantitySeparator ?? ' x '
  const fallbackToSku = opts?.fallbackToSku ?? true

  const parts = products
    .filter(Boolean)
    .map((p) => {
      const rawName = typeof p.name === 'string' ? p.name.trim() : ''
      const rawSku = typeof p.sku === 'string' ? p.sku.trim() : ''
      const name = rawName || (fallbackToSku ? rawSku : '')
      if (!name) return ''

      const qNum = p.quantity === null || p.quantity === undefined || p.quantity === '' ? NaN : Number(p.quantity)
      if (Number.isFinite(qNum) && qNum !== 1) {
        return `${name}${quantitySeparator}${qNum}`
      }
      return name
    })
    .filter(Boolean)

  return parts.join(itemSeparator)
}


