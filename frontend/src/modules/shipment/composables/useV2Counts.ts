import { computed, watch } from 'vue'
import type { V2State } from './useV2State'
import { useShipmentOrderDraftStore } from '@/stores/shipmentOrderDraft'
import { storeToRefs } from 'pinia'
import { getOrderFieldDefinitions } from '@/types/order'
import { createProductMap } from '@/utils/productMapUtils'

export function useV2Counts(state: V2State) {
  const draftStore = useShipmentOrderDraftStore()
  const { allRows, heldRowIds } = storeToRefs(draftStore)

  const formColumns = computed(() => {
    const carrierOptions = state.carriers.value.map(c => ({ value: c._id, label: c.name }))
    const allFieldDefs = getOrderFieldDefinitions({ carrierOptions })
    const FORM_READONLY_KEYS = new Set(['orderNumber', 'trackingId'])
    return allFieldDefs.filter(
      (col) => col.dataKey !== undefined &&
        (col.formEditable !== false || FORM_READONLY_KEYS.has(String(col.dataKey)))
    )
  })

  const productMap = computed(() => createProductMap(state.products.value))

  const draftNonHeldRows = computed(() =>
    allRows.value.filter(r => !heldRowIds.value.includes(r.id))
  )

  const pendingConfirmCount = computed(() => draftNonHeldRows.value.length)

  const processingCount = computed(() =>
    state.backendRows.value.filter(r =>
      !r.status?.held?.isHeld && !r.status?.confirm?.isConfirmed
    ).length
  )

  const pendingWaybillCount = computed(() =>
    state.backendRows.value.filter(r =>
      r.status?.confirm?.isConfirmed && !r.status?.held?.isHeld
    ).length
  )

  const heldCount = computed(() => {
    const localHeld = allRows.value.filter(r => heldRowIds.value.includes(r.id)).length
    const backendHeld = state.backendRows.value.filter(r => r.status?.held?.isHeld).length
    return localHeld + backendHeld
  })

  const filteredRows = computed(() => {
    let rows: any[]

    switch (state.activeTab.value) {
      case 'pending_confirm':
        rows = draftNonHeldRows.value
        break
      case 'processing':
        rows = state.backendRows.value.filter(r =>
          !r.status?.held?.isHeld && !r.status?.confirm?.isConfirmed
        )
        break
      case 'pending_waybill':
        rows = state.backendRows.value.filter(r =>
          r.status?.confirm?.isConfirmed && !r.status?.held?.isHeld
        )
        break
      case 'held': {
        const localHeld = allRows.value.filter(r => heldRowIds.value.includes(r.id))
        const backendHeld = state.backendRows.value.filter(r => r.status?.held?.isHeld)
        rows = [...localHeld, ...backendHeld]
        break
      }
      default:
        rows = []
    }

    if (state.globalSearchText.value.trim()) {
      const q = state.globalSearchText.value.trim().toLowerCase()
      rows = rows.filter(r => {
        const searchFields = [
          r.orderNumber, r.customerManagementNumber, r.trackingId,
          r.recipient?.name, r.recipient?.postalCode,
          r.recipient?.prefecture, r.recipient?.city, r.recipient?.street,
          r.sender?.name, r.internalRecord,
        ]
        return searchFields.some(f => f && String(f).toLowerCase().includes(q))
      })
    }

    return rows
  })

  const paginatedRows = computed(() => {
    const start = (state.currentPage.value - 1) * state.pageSize.value
    return filteredRows.value.slice(start, start + state.pageSize.value)
  })

  // Reset page on tab change
  watch(state.activeTab, () => {
    state.currentPage.value = 1
    state.selectedRows.value = []
  })

  return {
    formColumns, productMap, draftNonHeldRows,
    pendingConfirmCount, processingCount, pendingWaybillCount, heldCount,
    filteredRows, paginatedRows,
    allRows, heldRowIds, draftStore,
  }
}
