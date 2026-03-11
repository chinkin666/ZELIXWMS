import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import type { TableColumn } from '@/types/table'
import type { OrderProduct } from '@/types/order'
import { getOrderFieldDefinitions } from '@/types/order'
import type { Carrier } from '@/types/carrier'
import { getNestedValue } from '@/utils/nestedObject'
// 送付先関連の仮想列定義
export const recipientAddrColumn: TableColumn = {
  key: '__recipient_addr__',
  dataKey: '__recipient_addr__',
  title: '送付先',
  width: 260,
  fieldType: 'string',
  searchType: 'string',
}
export const recipientNameColumn: TableColumn = {
  key: '__recipient_name__',
  dataKey: '__recipient_name__',
  title: '送付先名',
  width: 180,
  fieldType: 'string',
  searchType: 'string',
}
export const senderNameColumn: TableColumn = {
  key: '__sender_name__',
  dataKey: '__sender_name__',
  title: 'ご依頼主氏名',
  width: 150,
  fieldType: 'string',
  searchType: 'string',
}
export const ordererNameColumn: TableColumn = {
  key: '__orderer_name__',
  dataKey: '__orderer_name__',
  title: '注文者氏名',
  width: 150,
  fieldType: 'string',
  searchType: 'string',
}

const TIME_SLOT_LABELS: Record<string, string> = {
  '0812': '午前中', '1416': '14-16時', '1618': '16-18時', '1820': '18-20時', '1921': '19-21時',
}

const COOL_TYPE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  '0': { label: '通常', color: '#666', bg: 'transparent' },
  '1': { label: 'クール冷凍', color: '#1d4ed8', bg: '#dbeafe' },
  '2': { label: 'クール冷蔵', color: '#0e7490', bg: '#cffafe' },
}

export function useOrderTable(
  allRows: Ref<UserOrderRow[]>,
  pendingWaybillRows: Ref<UserOrderRow[]>,
  carriers: Ref<Carrier[]>,
  bundleModeEnabled: Ref<boolean>,
  bundleFilterKeys: Ref<string[]>,
  displayFilter: Ref<'new' | 'error' | 'pending_waybill' | 'held'>,
  isHeld: (id: string | number) => boolean,
  hasRowErrors: (row: UserOrderRow) => boolean,
) {
  // 列定義
  const carrierOptions = computed(() =>
    (carriers.value || [])
      .filter((c) => c && c.enabled !== false)
      .map((c) => ({ label: c.name, value: c._id }))
  )

  const allFieldDefinitions = computed(() => getOrderFieldDefinitions({
    carrierOptions: carrierOptions.value,
  }))

  const baseColumns = computed(() => {
    const excludedDataKeys = new Set([
      'orderNumber', 'createdAt', 'updatedAt', 'sourceRawRows', 'carrierRawRow',
      'status.carrierReceipt.isReceived', 'status.confirm.isConfirmed', 'status.printed.isPrinted',
      'handlingTags', 'coolType', 'deliveryTimeSlot',
      'recipient.postalCode', 'recipient.prefecture', 'recipient.city', 'recipient.street', 'recipient.name', 'recipient.phone',
      'honorific',
      'sender.postalCode', 'sender.prefecture', 'sender.city', 'sender.street', 'sender.name', 'sender.phone',
      'carrierData.yamato.hatsuBaseNo1', 'carrierData.yamato.hatsuBaseNo2',
      'orderer.postalCode', 'orderer.prefecture', 'orderer.city', 'orderer.street', 'orderer.name', 'orderer.phone',
    ])
    return (allFieldDefinitions.value || []).filter((col) => {
      if (col.tableVisible === false) return false
      const dataKey = col.dataKey ?? undefined
      if (!dataKey) return false
      if (String(dataKey).startsWith('__mappingExample_')) return false
      if (col.formEditable === false) return false
      if (excludedDataKeys.has(String(dataKey))) return false
      return true
    })
  })

  const formColumns = computed(() =>
    allFieldDefinitions.value.filter(
      (col) => col.formEditable !== false && col.dataKey !== undefined
    )
  )

  // 送り状未発行タブ用列
  const pendingWaybillColumns = computed(() => {
    const showKeys = new Set([
      'orderNumber', 'customerManagementNumber', 'carrierId', 'invoiceType',
      'shipPlanDate', 'deliveryDatePreference', 'trackingId', 'products', 'createdAt', 'updatedAt',
      'status.printed.printedAt', 'status.confirm.confirmedAt', 'status.carrierReceipt.receivedAt',
      'status.shipped.shippedAt', 'internalRecord',
    ])
    const cols = (allFieldDefinitions.value || []).filter((col) => {
      const dataKey = col.dataKey ?? undefined
      return dataKey && showKeys.has(String(dataKey))
    })
    const keyOrder = [...showKeys]
    cols.sort((a, b) => keyOrder.indexOf(String(a.dataKey)) - keyOrder.indexOf(String(b.dataKey)))
    const deliveryIdx = cols.findIndex(c => (c.dataKey || c.key) === 'deliveryDatePreference')
    if (deliveryIdx >= 0) {
      cols.splice(deliveryIdx + 1, 0, recipientNameColumn, recipientAddrColumn)
    } else {
      cols.push(recipientNameColumn, recipientAddrColumn)
    }
    return cols as TableColumn[]
  })

  // フラット列（通常モード）
  const flatColumns = computed(() => {
    const cols = [...baseColumns.value]
    const productsIdx = cols.findIndex(c => (c.dataKey || c.key) === 'products')
    const productsCol = productsIdx >= 0 ? cols.splice(productsIdx, 1)[0] : null
    const insertAfter = cols.findIndex(c => (c.dataKey || c.key) === 'deliveryDatePreference')
    const virtualCols = [
      ...(productsCol ? [productsCol] : []),
      recipientNameColumn, recipientAddrColumn, senderNameColumn, ordererNameColumn,
    ]
    if (insertAfter >= 0) {
      cols.splice(insertAfter + 1, 0, ...virtualCols)
    } else {
      cols.push(...virtualCols)
    }
    return cols as TableColumn[]
  })

  // タブに応じた列切り替え
  const displayColumns = computed(() =>
    displayFilter.value === 'pending_waybill' ? pendingWaybillColumns.value : flatColumns.value
  )

  // --- 列リサイズ ---
  const columnWidths = ref<Record<string, number>>({})
  const resizingCol = ref<string | null>(null)
  const resizeStartX = ref(0)
  const resizeStartW = ref(0)

  const getColWidth = (col: TableColumn): string | undefined => {
    const key = (col.dataKey || col.key) as string
    if (columnWidths.value[key]) return `${columnWidths.value[key]}px`
    return col.width ? `${col.width}px` : undefined
  }

  const onResizeStart = (e: MouseEvent, col: TableColumn) => {
    e.preventDefault()
    e.stopPropagation()
    const key = (col.dataKey || col.key) as string
    resizingCol.value = key
    resizeStartX.value = e.clientX
    const th = (e.target as HTMLElement).parentElement
    resizeStartW.value = th ? th.offsetWidth : 100
    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const onResizeMove = (e: MouseEvent) => {
    if (!resizingCol.value) return
    const diff = e.clientX - resizeStartX.value
    const newWidth = Math.max(50, resizeStartW.value + diff)
    columnWidths.value = { ...columnWidths.value, [resizingCol.value]: newWidth }
  }

  const onResizeEnd = () => {
    resizingCol.value = null
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
  })

  // --- ソート・ページネーション ---
  const currentPage = ref(1)
  const pageSize = ref(50)
  const sortKey = ref('id')
  const sortOrder = ref<'asc' | 'desc'>('asc')

  const handleSortClick = (col: TableColumn) => {
    if (bundleModeEnabled.value) return
    const key = (col.dataKey || col.key) as string
    if (sortKey.value === key) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortKey.value = key
      sortOrder.value = 'asc'
    }
    currentPage.value = 1
  }

  // --- 検索 ---
  const globalSearchText = ref<string>('')

  // products メタ情報を付加（検索最適化）
  const calculateProductsMetaForRow = (row: UserOrderRow) => {
    const products = Array.isArray(row.products) ? row.products : []
    const skus = [...new Set(products.map((p: OrderProduct) => p.inputSku || p.productSku).filter((s): s is string => Boolean(s)))]
    const names = [...new Set(products.map((p: OrderProduct) => p.productName).filter((name): name is string => Boolean(name && typeof name === 'string' && name.trim())))]
    const barcodes = [...new Set(products.flatMap((p: OrderProduct) => p.barcode || []).filter((b): b is string => Boolean(b)))]
    const totalQuantity = products.reduce((sum, p: OrderProduct) => sum + (p.quantity || 0), 0)
    const totalPrice = products.reduce((sum, p: OrderProduct) => sum + (p.subtotal || 0), 0)
    return { skus, names, barcodes, skuCount: skus.length, totalQuantity, totalPrice }
  }

  const enrichRowWithProductsMeta = (row: UserOrderRow): UserOrderRow => {
    const meta: any = (row as any)._productsMeta
    const needsRecalc = !meta || !Array.isArray(meta.skus) || typeof meta.skuCount !== 'number' ||
      typeof meta.totalQuantity !== 'number' || typeof meta.totalPrice !== 'number' ||
      !Array.isArray(meta.names) || !Array.isArray(meta.barcodes)
    if (!needsRecalc) return row
    return { ...row, _productsMeta: calculateProductsMetaForRow(row) }
  }

  const searchedRows = computed(() => {
    const enriched = allRows.value.map(enrichRowWithProductsMeta)
    const q = globalSearchText.value.trim().toLowerCase()
    if (!q) return enriched
    return enriched.filter((row: UserOrderRow) => {
      const fields = [
        row.customerManagementNumber, row.orderNumber,
        row.recipient?.name, row.recipient?.phone, row.recipient?.postalCode,
        row.recipient?.prefecture, row.recipient?.city, row.recipient?.street,
        row.sender?.name, row.sender?.phone, row.orderer?.name, row.orderer?.phone,
        ...(row.products || []).flatMap((p: any) => [p.inputSku, p.productSku, p.productName]),
      ]
      return fields.some(f => f && String(f).toLowerCase().includes(q))
    })
  })

  // --- フィルタリング ---
  const filteredRows = computed(() => {
    if (displayFilter.value === 'pending_waybill') {
      // バックエンドで保留済みの注文を除外
      let rows = pendingWaybillRows.value.filter((row: any) => !row.status?.held?.isHeld)
      const q = globalSearchText.value.trim().toLowerCase()
      if (q) {
        rows = rows.filter((row: UserOrderRow) => {
          const fields = [
            row.customerManagementNumber, row.orderNumber,
            row.recipient?.name, row.recipient?.phone,
            row.sender?.name, row.orderer?.name,
          ]
          return fields.some(f => f && String(f).toLowerCase().includes(q))
        })
      }
      return rows
    }

    if (displayFilter.value === 'held') {
      // ローカル保留行 + バックエンド保留行
      const localHeld = searchedRows.value.filter((row: UserOrderRow) => isHeld(row.id))
      const backendHeld = pendingWaybillRows.value.filter((row: UserOrderRow) => (row as any).status?.held?.isHeld)
      return [...localHeld, ...backendHeld]
    }

    let result = searchedRows.value.filter((row: UserOrderRow) => !isHeld(row.id))
    if (displayFilter.value === 'new') {
      result = result.filter((row: UserOrderRow) => !hasRowErrors(row))
    } else if (displayFilter.value === 'error') {
      result = result.filter((row: UserOrderRow) => hasRowErrors(row))
    }
    return result
  })

  // バンドルモード時のグループ化表示
  const displayRows = computed(() => {
    if (bundleModeEnabled.value && bundleFilterKeys.value.length > 0) {
      const groups = new Map<string, UserOrderRow[]>()
      const bundledRows: UserOrderRow[] = []

      for (const row of filteredRows.value) {
        if (Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0) {
          bundledRows.push(row)
          continue
        }
        const keyParts = bundleFilterKeys.value.map((k) => getNestedValue(row, k) ?? '')
        const groupKey = JSON.stringify(keyParts)
        if (!groups.has(groupKey)) groups.set(groupKey, [])
        groups.get(groupKey)!.push(row)
      }

      const groupedEntries = Array.from(groups.entries()).filter(([, rows]) => rows.length >= 2)
      groupedEntries.sort(([a], [b]) => a.localeCompare(b))

      const result: any[] = []
      for (const row of bundledRows) {
        result.push({ ...row, _bundleGroupKey: '__bundled__', _bundleGroupSize: 1, _bundleGroupFirst: true, _isBundled: true })
      }
      for (const [key, rows] of groupedEntries) {
        const sortedGroup = [...rows].sort((a, b) => {
          const aKey = String((a as any)?.orderNumber || (a as any)?.id || '')
          const bKey = String((b as any)?.orderNumber || (b as any)?.id || '')
          return aKey.localeCompare(bKey)
        })
        sortedGroup.forEach((row, idx) => {
          result.push({ ...row, _bundleGroupKey: key, _bundleGroupSize: sortedGroup.length, _bundleGroupFirst: idx === 0, _isBundled: false })
        })
      }
      return result
    }
    return [...filteredRows.value]
  })

  const sortedRows = computed(() => {
    const data = [...displayRows.value]
    if (bundleModeEnabled.value) return data
    const key = sortKey.value
    const order = sortOrder.value === 'asc' ? 1 : -1
    data.sort((a, b) => {
      const va = getNestedValue(a, key) ?? ''
      const vb = getNestedValue(b, key) ?? ''
      if (va < vb) return -1 * order
      if (va > vb) return 1 * order
      return 0
    })
    return data
  })

  const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / pageSize.value)))

  watch([displayRows, pageSize], () => {
    if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  })

  const paginatedRows = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return sortedRows.value.slice(start, start + pageSize.value)
  })

  // --- 選択 ---
  const tableSelectedKeys = ref<Array<string | number>>([])

  const isAllCurrentPageSelected = computed(() => {
    if (paginatedRows.value.length === 0) return false
    return paginatedRows.value.every((r) => tableSelectedKeys.value.includes(r.id))
  })

  const isSomeCurrentPageSelected = computed(() =>
    paginatedRows.value.some((r) => tableSelectedKeys.value.includes(r.id))
  )

  // イミュータブルパターン：push/splice の代わりに filter/spread を使用
  const toggleSelectAll = () => {
    const pageIds = paginatedRows.value.map((r) => r.id)
    if (isAllCurrentPageSelected.value) {
      const pageSet = new Set(pageIds)
      tableSelectedKeys.value = tableSelectedKeys.value.filter((id) => !pageSet.has(id as string))
    } else {
      const existingSet = new Set(tableSelectedKeys.value)
      const newIds = pageIds.filter(id => !existingSet.has(id))
      tableSelectedKeys.value = [...tableSelectedKeys.value, ...newIds]
    }
  }

  const toggleRowSelection = (row: UserOrderRow) => {
    if (tableSelectedKeys.value.includes(row.id)) {
      tableSelectedKeys.value = tableSelectedKeys.value.filter(id => id !== row.id)
    } else {
      tableSelectedKeys.value = [...tableSelectedKeys.value, row.id]
    }
  }

  // --- セルヘルパー ---
  const getCellValue = (row: UserOrderRow, col: TableColumn): string => {
    const key = (col.dataKey || col.key) as string
    const val = getNestedValue(row, key)
    if (val === null || val === undefined || val === '') {
      if (key === 'coolType') return '通常'
      if (key === 'deliveryDatePreference') return '最短'
      return '-'
    }
    if (col.cellRenderer) return String(col.cellRenderer({ rowData: row } as any) ?? '-')
    if (col.searchOptions && col.searchOptions.length > 0) {
      const hit = col.searchOptions.find((opt) => String(opt.value) === String(val))
      if (hit) return hit.label
    }
    if (col.fieldType === 'date' && typeof val === 'string') {
      try { return new Date(val).toLocaleString('ja-JP') } catch { /* fall through */ }
    }
    if (Array.isArray(val)) return val.join(', ')
    return String(val)
  }

  const getTimeSlotLabel = (row: UserOrderRow): string => {
    const val = (row as any).deliveryTimeSlot
    if (!val) return '時間指定なし'
    return TIME_SLOT_LABELS[val] || val
  }

  const fmtPostal = (val?: string): string => {
    if (!val) return ''
    const d = val.replace(/[^0-9]/g, '')
    return d.length === 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : val
  }

  const getCoolTypeInfo = (row: UserOrderRow) => {
    const val = (row as any).coolType
    return COOL_TYPE_MAP[val] || COOL_TYPE_MAP['0']!
  }

  const formatProductsSku = (row: UserOrderRow): string => {
    const prods = row.products
    if (!Array.isArray(prods) || prods.length === 0) return '-'
    return prods.map((p: any) => `${p.inputSku || p.productSku || '?'} x${p.quantity || 0}`).join(', ')
  }

  const formatProductsName = (row: UserOrderRow): string => {
    const prods = row.products
    if (!Array.isArray(prods) || prods.length === 0) return ''
    const names = prods.map((p: any) => p.productName || '').filter(Boolean)
    return names.length > 0 ? names.join(', ') : '-'
  }

  return {
    carrierOptions,
    allFieldDefinitions,
    baseColumns,
    formColumns,
    displayColumns,
    flatColumns,
    pendingWaybillColumns,
    columnWidths,
    resizingCol,
    getColWidth,
    onResizeStart,
    currentPage,
    pageSize,
    sortKey,
    sortOrder,
    handleSortClick,
    globalSearchText,
    filteredRows,
    displayRows,
    sortedRows,
    totalPages,
    paginatedRows,
    tableSelectedKeys,
    isAllCurrentPageSelected,
    isSomeCurrentPageSelected,
    toggleSelectAll,
    toggleRowSelection,
    getCellValue,
    getTimeSlotLabel,
    fmtPostal,
    getCoolTypeInfo,
    formatProductsSku,
    formatProductsName,
  }
}
