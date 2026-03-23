import { toast } from 'vue-sonner'
import { updateShipmentOrder } from '@/api/shipmentOrders'
import type { OrderProduct } from '@/types/order'
import { generateTempId } from '@/types/orderRow'
import { normalizeDateOnly } from '@/utils/dateNormalize'
import type { V2State } from './useV2State'

interface FormActionsDeps {
  state: V2State
  draftStore: any
  applyProductDefaults: (row: any) => any
  normalizeAddress: (addr: any) => any
  loadBackendOrders: () => Promise<void>
}

export function useV2FormActions({ state, draftStore, applyProductDefaults, normalizeAddress, loadBackendOrders }: FormActionsDeps) {
  const handleAdd = () => {
    state.editingRow.value = null
    state.showEditDialog.value = true
  }

  const handleImportClick = () => {
    state.showImportDialog.value = true
  }

  const handleEdit = (row: any) => {
    state.editingRow.value = row
    state.showEditDialog.value = true
  }

  const handleFormSubmit = async (data: Record<string, any>) => {
    const now = new Date().toISOString()

    if (state.editingRow.value) {
      const updated: any = {
        ...state.editingRow.value,
        sourceOrderAt: data.sourceOrderAt !== undefined ? data.sourceOrderAt : state.editingRow.value.sourceOrderAt,
        carrierId: typeof data.carrierId === 'string' ? data.carrierId : state.editingRow.value.carrierId || '',
        customerManagementNumber: data.customerManagementNumber || state.editingRow.value.customerManagementNumber || '',
        orderer: {
          postalCode: data.orderer?.postalCode || '', prefecture: data.orderer?.prefecture || '',
          city: data.orderer?.city || '', street: data.orderer?.street || '',
          building: data.orderer?.building || '', name: data.orderer?.name || '', phone: data.orderer?.phone || '',
        },
        recipient: {
          postalCode: data.recipient?.postalCode || '', prefecture: data.recipient?.prefecture || '',
          city: data.recipient?.city || '', street: data.recipient?.street || '',
          building: data.recipient?.building || '', name: data.recipient?.name || '', phone: data.recipient?.phone || '',
        },
        honorific: data.honorific !== undefined ? data.honorific : (state.editingRow.value.honorific ?? '様'),
        products: Array.isArray(data.products) && data.products.length > 0
          ? data.products.map((p: any): OrderProduct => ({
              inputSku: p.inputSku || p.sku || '',
              quantity: p.quantity ? Number(p.quantity) : 1,
              productName: p.productName || p.name || undefined,
            }))
          : state.editingRow.value.products || [],
        shipPlanDate: data.shipPlanDate || state.editingRow.value.shipPlanDate || '',
        deliveryTimeSlot: data.deliveryTimeSlot || '',
        deliveryDatePreference: data.deliveryDatePreference ? normalizeDateOnly(data.deliveryDatePreference) : (state.editingRow.value.deliveryDatePreference ? normalizeDateOnly(state.editingRow.value.deliveryDatePreference) : undefined),
        invoiceType: data.invoiceType || state.editingRow.value.invoiceType || '',
        coolType: data.coolType ?? state.editingRow.value.coolType,
        sender: {
          postalCode: data.sender?.postalCode || '', prefecture: data.sender?.prefecture || '',
          city: data.sender?.city || '', street: data.sender?.street || '',
          building: data.sender?.building || '', name: data.sender?.name || '', phone: data.sender?.phone || '',
        },
        handlingTags: Array.isArray(data.handlingTags) ? data.handlingTags : state.editingRow.value.handlingTags || [],
        updatedAt: now,
      }
      const updatedRow = applyProductDefaults(updated)

      const backendId = state.editingRow.value._id
      if (backendId) {
        try {
          const allowedFields = [
            'sourceOrderAt', 'carrierId', 'customerManagementNumber',
            'orderer', 'recipient', 'honorific', 'products',
            'shipPlanDate', 'invoiceType', 'coolType',
            'deliveryTimeSlot', 'deliveryDatePreference',
            'orderSourceCompanyId', 'carrierData', 'sender',
            'handlingTags', 'trackingId', 'updatedAt',
          ] as const
          const optionalSkipIfEmpty = new Set([
            'deliveryTimeSlot', 'deliveryDatePreference', 'orderSourceCompanyId',
            'honorific', 'trackingId', 'sourceOrderAt',
          ])
          const payload: Record<string, any> = {}
          for (const key of allowedFields) {
            const val = updatedRow[key]
            if (val === undefined || val === null) continue
            if (optionalSkipIfEmpty.has(key) && typeof val === 'string' && val.trim() === '') continue
            payload[key] = val
          }
          await updateShipmentOrder(String(backendId), payload)
          await loadBackendOrders()
          toast.success('出荷指示を更新しました')
        } catch (e: any) {
          toast.error(e?.message || '更新に失敗しました')
          return
        }
      } else {
        draftStore.updateRow(state.editingRow.value.id, updatedRow)
        toast.success('出荷指示を更新しました')
      }
    } else {
      const tempId = generateTempId()
      const newRow = applyProductDefaults({
        id: tempId,
        orderNumber: '',
        sourceOrderAt: data.sourceOrderAt,
        carrierId: typeof data.carrierId === 'string' ? data.carrierId : '',
        customerManagementNumber: data.customerManagementNumber || '',
        orderer: {
          postalCode: data.orderer?.postalCode || '', prefecture: data.orderer?.prefecture || '',
          city: data.orderer?.city || '', street: data.orderer?.street || '',
          building: data.orderer?.building || '', name: data.orderer?.name || '', phone: data.orderer?.phone || '',
        },
        recipient: {
          postalCode: data.recipient?.postalCode || '', prefecture: data.recipient?.prefecture || '',
          city: data.recipient?.city || '', street: data.recipient?.street || '',
          building: data.recipient?.building || '', name: data.recipient?.name || '', phone: data.recipient?.phone || '',
        },
        honorific: data.honorific ?? '様',
        products: Array.isArray(data.products) && data.products.length > 0
          ? data.products.map((p: any): OrderProduct => ({
              inputSku: p.inputSku || p.sku || '',
              quantity: p.quantity ? Number(p.quantity) : 1,
              productName: p.productName || p.name || undefined,
            }))
          : [],
        shipPlanDate: data.shipPlanDate || '',
        deliveryTimeSlot: data.deliveryTimeSlot || '',
        deliveryDatePreference: data.deliveryDatePreference ? normalizeDateOnly(data.deliveryDatePreference) : undefined,
        invoiceType: data.invoiceType || '',
        coolType: data.coolType ?? undefined,
        sender: {
          postalCode: data.sender?.postalCode || '', prefecture: data.sender?.prefecture || '',
          city: data.sender?.city || '', street: data.sender?.street || '',
          building: data.sender?.building || '', name: data.sender?.name || '', phone: data.sender?.phone || '',
        },
        handlingTags: Array.isArray(data.handlingTags) ? data.handlingTags : [],
        sourceRawRows: [],
        createdAt: now,
        updatedAt: now,
      })
      draftStore.addRows([newRow])
      toast.success('個別登録しました')
    }

    state.editingRow.value = null
  }

  const handleImport = (importedRows: any[]) => {
    const rowsWithDefaults = importedRows.map((row: any) => {
      const updatedRow = {
        ...row,
        recipient: normalizeAddress(row.recipient) as typeof row.recipient,
        sender: normalizeAddress(row.sender) as typeof row.sender,
        products: Array.isArray(row.products)
          ? row.products.map((p: any): OrderProduct => {
              const quantityNum = p?.quantity !== undefined ? Number(p.quantity) : 1
              return {
                inputSku: p?.inputSku || p?.sku || '',
                quantity: Number.isNaN(quantityNum) ? 1 : quantityNum,
                productName: p?.productName || p?.name || undefined,
                ...(p?.barcode?.length ? { barcode: p.barcode } : {}),
              }
            })
          : row.products,
      }
      return applyProductDefaults(updatedRow)
    })
    draftStore.addRows(rowsWithDefaults)
    toast.success(`${importedRows.length}件のデータを取り込みしました`)
  }

  return { handleAdd, handleImportClick, handleEdit, handleFormSubmit, handleImport }
}
