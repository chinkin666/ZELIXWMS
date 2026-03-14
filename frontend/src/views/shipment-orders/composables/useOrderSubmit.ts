import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import type { OrderProduct } from '@/types/order'
import type { TableColumn } from '@/types/table'
import { ShipmentOrderBulkApiError, createShipmentOrdersBulk, updateShipmentOrderStatusBulk } from '@/api/shipmentOrders'
import { normalizeDateOnly } from '@/utils/dateNormalize'

type BackendErrorByRow = Record<string, Record<string, string[]>>

export function useOrderSubmit(
  allRows: Ref<UserOrderRow[]>,
  pendingWaybillRows: Ref<UserOrderRow[]>,
  tableSelectedKeys: Ref<(string | number)[]>,
  heldRowIds: Ref<(string | number)[]>,
  baseColumns: ComputedRef<TableColumn[]>,
  displayFilter: Ref<string>,
  hasFrontendRowErrors: (row: UserOrderRow) => boolean,
  setHeldIds: (ids: (string | number)[]) => void,
  clearAllDraft: () => void,
  loadPendingWaybillOrders: () => Promise<void>,
  autoValidateProcessingOrders: (scopeIds?: Set<string>, isRetry?: boolean) => Promise<void>,
  toast: { showSuccess: (msg: string) => void; showWarning: (msg: string) => void; showError: (msg: string) => void },
) {
  const isSubmitting = ref(false)
  const submitErrorDialogVisible = ref(false)
  const backendErrorsByRowId = ref<BackendErrorByRow>({})

  const backendErrorCount = computed(() => {
    let count = 0
    for (const rowId of Object.keys(backendErrorsByRowId.value || {})) {
      const perField = backendErrorsByRowId.value[rowId] || {}
      for (const fieldKey of Object.keys(perField)) {
        count += (perField[fieldKey] || []).length
      }
    }
    return count
  })

  const columnTitleMap = computed(() => {
    const map = new Map<string, string>()
    for (const col of baseColumns.value) {
      const k = (col.dataKey || col.key) as string
      map.set(k, col.title)
    }
    return map
  })

  const backendErrorList = computed(() => {
    const list: Array<{ clientId?: string; field?: string; fieldTitle?: string; message: string; orderNumber?: string }> = []
    for (const rowId of Object.keys(backendErrorsByRowId.value || {})) {
      const row = allRows.value.find((r) => r.id === rowId)
      const perField = backendErrorsByRowId.value[rowId] || {}
      for (const fieldKey of Object.keys(perField)) {
        const msgs = perField[fieldKey] || []
        for (const msg of msgs) {
          list.push({
            clientId: rowId,
            field: fieldKey,
            fieldTitle: columnTitleMap.value.get(fieldKey),
            message: msg,
            orderNumber: row?.orderNumber,
          })
        }
      }
    }
    return list
  })

  const clearBackendErrors = () => {
    backendErrorsByRowId.value = {}
  }

  const buildBulkUploadPayload = (rows: UserOrderRow[]) => ({
    items: rows.map((row) => ({
      clientId: row.id,
      order: {
        ...(row.sourceOrderAt && { sourceOrderAt: row.sourceOrderAt }),
        carrierId: row.carrierId,
        customerManagementNumber: row.customerManagementNumber,
        orderer: (row.orderer?.postalCode || row.orderer?.name || row.orderer?.phone)
          ? { postalCode: row.orderer.postalCode || undefined, prefecture: row.orderer.prefecture || undefined, city: row.orderer.city || undefined, street: row.orderer.street || undefined, building: row.orderer.building || undefined, name: row.orderer.name || undefined, phone: row.orderer.phone || undefined }
          : undefined,
        recipient: { postalCode: row.recipient?.postalCode || '', prefecture: row.recipient?.prefecture || '', city: row.recipient?.city || '', street: row.recipient?.street || '', building: row.recipient?.building || '', name: row.recipient?.name || '', phone: row.recipient?.phone || '' },
        honorific: row.honorific ?? '様',
        products: Array.isArray(row.products)
          ? row.products.map((p: OrderProduct) => ({
              inputSku: p.inputSku || '', quantity: typeof p.quantity === 'number' ? p.quantity : Number(p.quantity ?? 1),
              productId: p.productId || undefined, productSku: p.productSku || undefined, productName: p.productName || undefined,
              matchedSubSku: p.matchedSubSku ? { code: p.matchedSubSku.code, price: p.matchedSubSku.price, description: p.matchedSubSku.description } : undefined,
              imageUrl: p.imageUrl || undefined, barcode: p.barcode, coolType: p.coolType,
              mailCalcEnabled: p.mailCalcEnabled, mailCalcMaxQuantity: p.mailCalcMaxQuantity, unitPrice: p.unitPrice, subtotal: p.subtotal,
            }))
          : [],
        shipPlanDate: row.shipPlanDate, invoiceType: row.invoiceType, coolType: row.coolType ?? undefined,
        deliveryTimeSlot: row.deliveryTimeSlot || undefined,
        deliveryDatePreference: row.deliveryDatePreference ? normalizeDateOnly(row.deliveryDatePreference) : undefined,
        orderSourceCompanyId: row.orderSourceCompanyId || undefined,
        carrierData: row.carrierData ? {
          yamato: row.carrierData.yamato ? { sortingCode: row.carrierData.yamato.sortingCode || undefined, hatsuBaseNo1: row.carrierData.yamato.hatsuBaseNo1 || undefined, hatsuBaseNo2: row.carrierData.yamato.hatsuBaseNo2 || undefined } : undefined,
        } : undefined,
        sender: { postalCode: row.sender?.postalCode || '', prefecture: row.sender?.prefecture || '', city: row.sender?.city || '', street: row.sender?.street || '', building: row.sender?.building || '', name: row.sender?.name || '', phone: row.sender?.phone || '' },
        handlingTags: Array.isArray(row.handlingTags) ? row.handlingTags : [],
        sourceRawRows: Array.isArray((row as any).sourceRawRows) ? (row as any).sourceRawRows : undefined,
      },
    })),
  })

  const applyBackendErrors = (errors: Array<{ clientId?: string; field?: string; message: string }>) => {
    const next: BackendErrorByRow = {}
    for (const e of errors) {
      const rowId = e.clientId
      if (!rowId) continue
      const rawField = e.field || ''
      const baseField = rawField ? String(rawField).split('.')[0] : ''
      const fieldKey = baseField || '__row__'
      if (!next[rowId]) next[rowId] = {}
      if (!next[rowId][fieldKey]) next[rowId][fieldKey] = []
      next[rowId][fieldKey].push(e.message)
    }
    backendErrorsByRowId.value = next
  }

  const handleSubmitClick = async () => {
    if (isSubmitting.value) return
    clearBackendErrors()

    if (!allRows.value.length) {
      toast.showWarning('登録するデータがありません')
      return
    }
    if (tableSelectedKeys.value.length === 0) {
      toast.showWarning('登録する行を選択してください')
      return
    }

    const selectedSet = new Set(tableSelectedKeys.value)
    const targetRows = allRows.value.filter((r) => selectedSet.has(r.id))
    const invalidRows = targetRows.filter((r) => hasFrontendRowErrors(r))

    if (invalidRows.length > 0) {
      displayFilter.value = 'pending_confirm'
      toast.showError(`入力に誤りがある行が${invalidRows.length}件あります。エラー行のみ表示に切り替えました。`)
      return
    }

    try {
      isSubmitting.value = true
      const payload = buildBulkUploadPayload(targetRows)
      const res = await createShipmentOrdersBulk(payload)
      toast.showSuccess(res?.message || '登録しました')

      const successes = Array.isArray((res as any)?.data?.successes) ? ((res as any).data.successes as any[]) : []
      const failures = Array.isArray((res as any)?.data?.failures) ? ((res as any).data.failures as any[]) : []

      if (successes.length > 0) {
        const successIds = new Set(successes.map((s) => s?.clientId).filter(Boolean))
        allRows.value = allRows.value.filter((r) => !successIds.has(r.id))
      }

      tableSelectedKeys.value = []

      if (failures.length > 0) {
        applyBackendErrors(failures)
        displayFilter.value = 'pending_confirm'
        submitErrorDialogVisible.value = true
      } else {
        clearBackendErrors()
        if (allRows.value.length === 0) {
          clearAllDraft()
        }
        await loadPendingWaybillOrders()
        displayFilter.value = 'processing'
        const submittedIds = new Set(successes.map((s) => s?.insertedId).filter(Boolean))
        autoValidateProcessingOrders(submittedIds)
      }
    } catch (err: any) {
      if (err instanceof ShipmentOrderBulkApiError) {
        if (Array.isArray(err.errors) && err.errors.length > 0) {
          applyBackendErrors(err.errors)
          submitErrorDialogVisible.value = true
          toast.showError('サーバー側のバリデーションエラーがあります。')
          return
        }
        toast.showError(err.message || 'アップロードに失敗しました')
        return
      }
      toast.showError(err?.message || 'アップロードに失敗しました')
    } finally {
      isSubmitting.value = false
    }
  }

  const handleReleaseHold = async () => {
    if (tableSelectedKeys.value.length === 0) {
      toast.showWarning('保留解除する行を選択してください')
      return
    }
    const backendIds: string[] = []
    const localIds: (string | number)[] = []
    for (const id of tableSelectedKeys.value) {
      const isPendingWaybill = pendingWaybillRows.value.some(r => r.id === id)
      if (isPendingWaybill) {
        backendIds.push(String(id))
      } else {
        localIds.push(id)
      }
    }
    if (localIds.length > 0) {
      const removeSet = new Set(localIds)
      heldRowIds.value = heldRowIds.value.filter(id => !removeSet.has(id))
      setHeldIds(heldRowIds.value)
    }
    if (backendIds.length > 0) {
      try {
        await updateShipmentOrderStatusBulk(backendIds, 'unhold')
        await loadPendingWaybillOrders()
      } catch (err) {
        toast.showError('保留解除に失敗しました')
        return
      }
    }
    const count = tableSelectedKeys.value.length
    tableSelectedKeys.value = []
    toast.showSuccess(`${count}件の保留を解除しました`)
  }

  return {
    isSubmitting,
    submitErrorDialogVisible,
    backendErrorsByRowId,
    backendErrorCount,
    backendErrorList,
    clearBackendErrors,
    handleSubmitClick,
    handleReleaseHold,
  }
}
