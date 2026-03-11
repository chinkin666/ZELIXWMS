import type { Ref } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import type { TableColumn } from '@/types/table'
import type { OrderProduct } from '@/types/order'
import { validateCell } from '@/utils/orderValidation'

export function useOrderValidation(
  baseColumns: Ref<TableColumn[]>,
  backendErrorsByRowId: Ref<Record<string, Record<string, string[]>>>,
) {
  // 行にフロントエンドまたはバックエンドのエラーがあるか確認
  const hasRowErrors = (row: UserOrderRow): boolean => {
    const hasFrontend = baseColumns.value.some((col) => !validateCell(row, col))
    const backend = backendErrorsByRowId.value?.[row.id]
    const hasBackend = backend ? Object.keys(backend).length > 0 : false
    return hasFrontend || hasBackend
  }

  // 行にフロントエンドのみのエラーがあるか確認
  const hasFrontendRowErrors = (row: UserOrderRow): boolean => {
    return baseColumns.value.some((col) => !validateCell(row, col))
  }

  // セルにエラーがあるか確認
  const isCellError = (row: UserOrderRow, col: TableColumn): boolean => {
    const dataKey = (col.dataKey || col.key) as string
    const backendFieldErrors = backendErrorsByRowId.value?.[row.id]?.[dataKey]
    const hasBackendError = Array.isArray(backendFieldErrors) && backendFieldErrors.length > 0
    return !validateCell(row, col) || hasBackendError
  }

  // 未登録SKUを含む行か確認
  const hasUnregisteredSku = (row: UserOrderRow): boolean => {
    if (!Array.isArray(row.products) || row.products.length === 0) return false
    return row.products.some((p: OrderProduct) => !p.productId)
  }

  return { hasRowErrors, hasFrontendRowErrors, isCellError, hasUnregisteredSku }
}
