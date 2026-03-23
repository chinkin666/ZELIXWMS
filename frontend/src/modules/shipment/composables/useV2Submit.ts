import { toast } from 'vue-sonner'
import {
  ShipmentOrderBulkApiError,
  createShipmentOrdersBulk,
} from '@/api/shipmentOrders'
import type { OrderProduct } from '@/types/order'
import { normalizeDateOnly } from '@/utils/dateNormalize'
import type { V2State } from './useV2State'

interface SubmitDeps {
  state: V2State
  draftStore: any
  allRows: any
  hasFrontendRowErrors: (row: any) => boolean
  loadBackendOrders: () => Promise<void>
  autoValidateProcessingOrders: (scopeIds?: Set<string>, isRetry?: boolean) => Promise<void>
}

export function useV2Submit({ state, draftStore, allRows, hasFrontendRowErrors, loadBackendOrders, autoValidateProcessingOrders }: SubmitDeps) {
  const buildBulkUploadPayload = (rows: any[]) => ({
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
        sourceRawRows: Array.isArray(row.sourceRawRows) ? row.sourceRawRows : undefined,
      },
    })),
  })

  const handleSubmit = async () => {
    if (state.isSubmitting.value) return

    if (state.selectedRows.value.length === 0) {
      toast.warning('登録する行を選択してください')
      return
    }

    const targetRows = state.selectedRows.value
    const invalidRows = targetRows.filter((r) => hasFrontendRowErrors(r))
    if (invalidRows.length > 0) {
      toast.error(`入力に誤りがある行が${invalidRows.length}件あります。修正してください。`)
      return
    }

    try {
      state.isSubmitting.value = true
      const payload = buildBulkUploadPayload(targetRows)
      const res = await createShipmentOrdersBulk(payload)
      toast.success(res?.message || '登録しました')

      const successes = Array.isArray((res as any)?.data?.successes) ? ((res as any).data.successes as any[]) : []
      const failures = Array.isArray((res as any)?.data?.failures) ? ((res as any).data.failures as any[]) : []

      if (successes.length > 0) {
        const successIds = new Set<string | number>(successes.map((s) => s?.clientId).filter(Boolean))
        draftStore.removeRows(successIds)
      }

      state.selectedRows.value = []

      if (failures.length > 0) {
        state.submitErrors.value = failures
        state.submitErrorDialogVisible.value = true
      } else {
        if (allRows.value.length === 0) {
          draftStore.clearAll()
        }
        await loadBackendOrders()
        state.activeTab.value = 'processing'
        const submittedIds = new Set(successes.map((s) => s?.insertedId).filter(Boolean))
        autoValidateProcessingOrders(submittedIds)
      }
    } catch (err: any) {
      if (err instanceof ShipmentOrderBulkApiError) {
        if (Array.isArray(err.errors) && err.errors.length > 0) {
          state.submitErrors.value = err.errors
          state.submitErrorDialogVisible.value = true
          toast.error('サーバー側のバリデーションエラーがあります。')
          return
        }
        toast.error(err.message || 'アップロードに失敗しました')
        return
      }
      toast.error(err?.message || 'アップロードに失敗しました')
    } finally {
      state.isSubmitting.value = false
    }
  }

  return { handleSubmit, buildBulkUploadPayload }
}
