import type { UserOrderRow } from '@/types/orderRow'

// ストレージキー定数
export const TABLE_DATA_STORAGE_KEY = 'shipment_order_create_table_data'
export const HELD_ROWS_STORAGE_KEY = 'shipment_order_create_held_rows'
export const BUNDLE_FILTER_COOKIE_KEY = 'bundle_filter_keys'
export const BUNDLE_MODE_COOKIE_KEY = 'bundle_mode_enabled'

// Cookie ユーティリティ
export const setCookie = (name: string, value: string, days = 30) => {
  const expires = new Date()
  expires.setDate(expires.getDate() + days)
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`
}

export const getCookie = (name: string): string | null => {
  const pattern = `(?:^|; )${encodeURIComponent(name)}=([^;]*)`
  const match = document.cookie.match(new RegExp(pattern))
  const value = match?.[1]
  if (!value) return null
  return decodeURIComponent(value)
}

// テーブルデータのシリアライズ（不要なフィールドを除去してサイズを削減）
const serializeRows = (rows: UserOrderRow[]): UserOrderRow[] => {
  return rows.map((row: any) => {
    const base: any = { ...row, sourceRawRows: row.sourceRawRows }
    if (!Array.isArray(base.products)) return base
    return {
      ...base,
      products: base.products.map((p: any) => ({
        inputSku: p.inputSku,
        quantity: p.quantity,
        productId: p.productId,
        productSku: p.productSku,
        productName: p.productName,
        matchedSubSku: p.matchedSubSku,
        ...(p.barcode?.length ? { barcode: p.barcode } : {}),
      })),
    }
  })
}

// テーブルデータをlocalStorageに保存
export const saveTableDataToStorage = (
  rows: UserOrderRow[],
  heldRowIds: (string | number)[],
) => {
  try {
    localStorage.setItem(TABLE_DATA_STORAGE_KEY, JSON.stringify(serializeRows(rows)))
    localStorage.setItem(HELD_ROWS_STORAGE_KEY, JSON.stringify(heldRowIds))
  } catch (error) {
    // テーブルデータ保存失敗 / Failed to save table data to localStorage
  }
}

// localStorageからテーブルデータを読み込む
export const loadTableDataFromStorage = (): UserOrderRow[] => {
  try {
    const saved = localStorage.getItem(TABLE_DATA_STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? (parsed as UserOrderRow[]) : []
  } catch (error) {
    // テーブルデータ読み込み失敗 / Failed to load table data from localStorage
    return []
  }
}

// localStorageから保留行IDを読み込む
export const loadHeldRowsFromStorage = (): (string | number)[] => {
  try {
    const saved = localStorage.getItem(HELD_ROWS_STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// localStorageのテーブルデータをクリア
export const clearTableDataStorage = () => {
  try {
    localStorage.removeItem(TABLE_DATA_STORAGE_KEY)
    localStorage.removeItem(HELD_ROWS_STORAGE_KEY)
  } catch (error) {
    // テーブルデータクリア失敗 / Failed to clear table data from localStorage
  }
}
