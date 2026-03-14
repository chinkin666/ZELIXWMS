import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import { generateTempId } from '@/types/orderRow'
import type { OrderProduct } from '@/types/order'
import type { Product } from '@/types/product'
import { updateShipmentOrder } from '@/api/shipmentOrders'
import { normalizeDateOnly } from '@/utils/dateNormalize'
import { getStringWidth, splitByWidth } from '@/utils/japaneseCharWidth'
import {
  createProductMap,
  resolveAndFillProduct,
  determineCoolType,
  determineInvoiceType,
} from '@/utils/productMapUtils'

export function useOrderForm(
  allRows: Ref<UserOrderRow[]>,
  products: Ref<Product[]>,
  getRowErrorMessages: (row: UserOrderRow) => string[],
  loadPendingWaybillOrders: () => Promise<void>,
  toast: { showSuccess: (msg: string) => void; showWarning: (msg: string) => void; showError: (msg: string) => void },
) {
  const showDialog = ref(false)
  const showImportDialog = ref(false)
  const editingRow = ref<UserOrderRow | null>(null)

  const productMap = computed(() => createProductMap(products.value))

  const applyProductDefaults = (row: UserOrderRow): UserOrderRow => {
    const next: UserOrderRow = { ...row }
    const pMap = productMap.value

    if (Array.isArray(next.products)) {
      next.products = next.products.map((p: any): OrderProduct => {
        const inputSku = (p.inputSku || p.sku || '').trim()
        const quantity = p.quantity ?? 1
        if (p.productId && p.inputSku) return p as OrderProduct
        const existingData: Partial<OrderProduct> = {}
        if (p.barcode?.length) existingData.barcode = p.barcode
        if (p.name || p.productName) existingData.productName = p.productName || p.name
        return resolveAndFillProduct(inputSku, quantity, pMap, existingData)
      })

      const matchedProducts = next.products.filter(p => p.productId)
      if (matchedProducts.length > 0) {
        const nextCoolType = determineCoolType(next.products)
        if (nextCoolType !== undefined) next.coolType = nextCoolType
        const calculatedInvoiceType = determineInvoiceType(next.products, next.invoiceType as '0' | '8' | 'A' | undefined)
        if (calculatedInvoiceType !== null) next.invoiceType = calculatedInvoiceType
      }
    }

    // クール便（冷凍・冷蔵）はメール便不可 → 発払いに強制変更
    if (next.coolType === '1' || next.coolType === '2') {
      const mailTypes = new Set(['3', '7', 'A'])
      if (mailTypes.has(next.invoiceType)) {
        next.invoiceType = '0'
      }
    }

    // ネコポス・ゆうメール・ゆうパケット等メール便はお届け日・時間帯指定不可
    const noDateTimeTypes = new Set(['3', '7', 'A'])
    if (noDateTimeTypes.has(next.invoiceType)) {
      next.deliveryDatePreference = undefined as any
      next.deliveryTimeSlot = ''
    }

    return next
  }

  const handleEdit = (row: UserOrderRow) => {
    editingRow.value = row
    showDialog.value = true
  }

  const handleAdd = () => {
    editingRow.value = null
    showDialog.value = true
  }

  const handleFormSubmit = async (data: Record<string, any>) => {
    const now = new Date().toISOString()

    if (editingRow.value) {
      let updatedRow: UserOrderRow = {
        ...editingRow.value,
        orderNumber: editingRow.value.orderNumber || '',
        sourceOrderAt: data.sourceOrderAt !== undefined ? data.sourceOrderAt : editingRow.value.sourceOrderAt,
        carrierId: typeof data.carrierId === 'string' ? data.carrierId : editingRow.value.carrierId || '',
        customerManagementNumber: data.customerManagementNumber || editingRow.value.customerManagementNumber || '',
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
        honorific: data.honorific !== undefined ? data.honorific : (editingRow.value.honorific ?? '様'),
        products: Array.isArray(data.products) && data.products.length > 0
          ? data.products.map((p: any): OrderProduct => ({
              inputSku: p.inputSku || p.sku || '',
              quantity: p.quantity ? Number(p.quantity) : 1,
              productName: p.productName || p.name || undefined,
            }))
          : editingRow.value.products || [],
        shipPlanDate: data.shipPlanDate || editingRow.value.shipPlanDate || '',
        deliveryTimeSlot: data.deliveryTimeSlot || '',
        deliveryDatePreference: data.deliveryDatePreference ? normalizeDateOnly(data.deliveryDatePreference) : (editingRow.value.deliveryDatePreference ? normalizeDateOnly(editingRow.value.deliveryDatePreference) : undefined),
        invoiceType: data.invoiceType || editingRow.value.invoiceType || '',
        coolType: data.coolType ?? editingRow.value.coolType,
        sender: {
          postalCode: data.sender?.postalCode || '', prefecture: data.sender?.prefecture || '',
          city: data.sender?.city || '', street: data.sender?.street || '',
          building: data.sender?.building || '', name: data.sender?.name || '', phone: data.sender?.phone || '',
        },
        handlingTags: Array.isArray(data.handlingTags) ? data.handlingTags : editingRow.value.handlingTags || [],
        updatedAt: now,
      }
      updatedRow = applyProductDefaults(updatedRow)

      const backendId = (editingRow.value as any)._id
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
            const val = (updatedRow as any)[key]
            if (val === undefined || val === null) continue
            if (optionalSkipIfEmpty.has(key) && typeof val === 'string' && val.trim() === '') continue
            payload[key] = val
          }
          await updateShipmentOrder(String(backendId), payload)
          await loadPendingWaybillOrders()
          toast.showSuccess('出荷指示を更新しました')
        } catch (e: any) {
          console.error('Order update failed:', e)
          toast.showError(e?.message || '更新に失敗しました')
          return
        }
      } else {
        allRows.value = allRows.value.map(r => r.id === editingRow.value!.id ? updatedRow : r)
        toast.showSuccess('出荷指示を更新しました')
      }
    } else {
      const tempId = generateTempId()
      let newRow: UserOrderRow = {
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
      }
      newRow = applyProductDefaults(newRow)
      allRows.value = [...allRows.value, newRow]
      toast.showSuccess('個別登録しました')
    }

    editingRow.value = null
  }

  // 住所フィールド文字数制限の正規化（半角幅ベース）
  const normalizeAddress = (addr: { city?: string; street?: string; building?: string } | undefined) => {
    if (!addr) return addr
    let city = addr.city || ''
    let street = addr.street || ''
    let building = addr.building || ''
    const cityWidth = getStringWidth(city)
    if (cityWidth > 24) {
      const [cityFit, cityOverflow] = splitByWidth(city, 24)
      city = cityFit
      street = cityOverflow + street
    }
    const streetWidth = getStringWidth(street)
    if (streetWidth > 32) {
      const [streetFit, streetOverflow] = splitByWidth(street, 32)
      street = streetFit
      building = streetOverflow + building
    }
    return { ...addr, city, street, building }
  }

  const handleImport = (importedRows: UserOrderRow[]) => {
    const rowsWithDefaults = importedRows.map((row: UserOrderRow) => {
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
    allRows.value = [...allRows.value, ...rowsWithDefaults]

    const errorRows = rowsWithDefaults.filter((r) => getRowErrorMessages(r).length > 0)
    if (errorRows.length > 0) {
      toast.showWarning(`${importedRows.length}件取り込み完了。${errorRows.length}件にエラーがあります。修正してください。`)
    } else {
      toast.showSuccess(`${importedRows.length}件のデータを取り込みしました`)
    }
  }

  const handleImportClick = () => { showImportDialog.value = true }

  /** Re-apply product defaults to all existing rows (call after products load) */
  const reapplyProductDefaults = () => {
    if (allRows.value.length > 0) {
      allRows.value = allRows.value.map((row) => applyProductDefaults(row))
    }
  }

  return {
    showDialog,
    showImportDialog,
    editingRow,
    productMap,
    applyProductDefaults,
    handleEdit,
    handleAdd,
    handleFormSubmit,
    handleImport,
    handleImportClick,
    reapplyProductDefaults,
  }
}
