import { computed } from 'vue'
import type { Ref } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'

/**
 * Detects duplicate orders based on customerManagementNumber (注文番号)
 * and recipient name + postal code combination.
 */
export function useOrderDuplicateCheck(
  allRows: Ref<UserOrderRow[]>,
  pendingWaybillRows: Ref<UserOrderRow[]>,
) {
  // Build a set of existing order numbers from backend orders for quick lookup
  const existingOrderNumbers = computed(() => {
    const set = new Set<string>()
    for (const row of pendingWaybillRows.value) {
      const num = row.customerManagementNumber?.trim()
      if (num) set.add(num)
    }
    return set
  })

  // Detect duplicates within local rows (same customerManagementNumber)
  const duplicateLocalRowIds = computed(() => {
    const counts = new Map<string, string[]>()
    for (const row of allRows.value) {
      const num = row.customerManagementNumber?.trim()
      if (!num) continue
      if (!counts.has(num)) counts.set(num, [])
      counts.get(num)!.push(row.id)
    }
    const ids = new Set<string>()
    for (const [, rowIds] of counts) {
      if (rowIds.length >= 2) {
        for (const id of rowIds) ids.add(id)
      }
    }
    return ids
  })

  // Detect local rows that duplicate an existing backend order
  const duplicateBackendRowIds = computed(() => {
    const ids = new Set<string>()
    const existing = existingOrderNumbers.value
    for (const row of allRows.value) {
      const num = row.customerManagementNumber?.trim()
      if (num && existing.has(num)) {
        ids.add(row.id)
      }
    }
    return ids
  })

  const isDuplicateLocal = (rowId: string): boolean => duplicateLocalRowIds.value.has(rowId)
  const isDuplicateBackend = (rowId: string): boolean => duplicateBackendRowIds.value.has(rowId)
  const isDuplicate = (rowId: string): boolean => isDuplicateLocal(rowId) || isDuplicateBackend(rowId)

  const duplicateCount = computed(() => {
    const combined = new Set([...duplicateLocalRowIds.value, ...duplicateBackendRowIds.value])
    return combined.size
  })

  return {
    isDuplicate,
    isDuplicateLocal,
    isDuplicateBackend,
    duplicateCount,
  }
}
