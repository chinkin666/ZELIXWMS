import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import { getNestedValue } from '@/utils/nestedObject'
import { determineCoolType, determineInvoiceType } from '@/utils/productMapUtils'
import { setCookie, getCookie, BUNDLE_FILTER_COOKIE_KEY, BUNDLE_MODE_COOKIE_KEY } from './useOrderStorage'

export function useOrderBundle(
  allRows: Ref<UserOrderRow[]>,
  filteredRows: ComputedRef<UserOrderRow[]>,
  displayRows: ComputedRef<UserOrderRow[]>,
  tableSelectedKeys: Ref<(string | number)[]>,
  displayFilter: Ref<string>,
  toast: { showSuccess: (msg: string) => void; showWarning: (msg: string) => void },
) {
  const bundleFilterKeys = ref<string[]>([])
  const bundleModeEnabled = ref(false)
  const showBundleFilterDialog = ref(false)

  const bundleFilterFields = computed(() => [
    { key: 'recipient.name', title: 'お届け先氏名', description: 'お届け先の氏名が一致する注文を同梱候補とする' },
    { key: 'recipient.postalCode', title: 'お届け先郵便番号', description: 'お届け先の郵便番号が一致する注文を同梱候補とする' },
    { key: 'recipient.street', title: 'お届け先住所', description: 'お届け先の住所が一致する注文を同梱候補とする' },
    { key: 'recipient.phone', title: 'お届け先電話番号', description: 'お届け先の電話番号が一致する注文を同梱候補とする' },
    { key: 'orderSourceCompanyId', title: '販売分類', description: '※ご依頼主を超えて同梱する時には「販売分類」のチェックを外してください' },
  ])

  const bundleFilterLabels = computed(() => {
    if (bundleFilterKeys.value.length === 0) return ''
    return bundleFilterKeys.value
      .map((key) => bundleFilterFields.value.find((f) => f.key === key)?.title || key)
      .filter(Boolean)
      .join(', ')
  })

  const bundleableRowIds = computed(() => {
    const rows = displayFilter.value === 'pending_confirm' ? filteredRows.value : []
    if (rows.length < 2) return new Set<string>()
    const groupCounts = new Map<string, string[]>()
    for (const row of rows) {
      const name = getNestedValue(row, 'recipient.name') ?? ''
      const postal = getNestedValue(row, 'recipient.postalCode') ?? ''
      if (!name && !postal) continue
      const key = `${name}|${postal}`
      if (!groupCounts.has(key)) groupCounts.set(key, [])
      groupCounts.get(key)!.push(row.id)
    }
    const ids = new Set<string>()
    for (const [, rowIds] of groupCounts) {
      if (rowIds.length >= 2) {
        for (const id of rowIds) ids.add(id)
      }
    }
    return ids
  })

  const isBundleable = (row: any): boolean => bundleableRowIds.value.has(row.id)

  const hasUnbundleableRows = computed(() => {
    const selectedSet = new Set(tableSelectedKeys.value)
    if (selectedSet.size === 0) return false
    return allRows.value.some((row) => {
      if (!selectedSet.has(row.id)) return false
      return Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0
    })
  })

  const selectedBundleGroupKeys = computed(() => {
    if (!bundleModeEnabled.value || !bundleFilterKeys.value.length) return []
    const selectedSet = new Set(tableSelectedKeys.value)
    if (!selectedSet.size) return []
    const keys = new Set<string>()
    for (const row of displayRows.value as any[]) {
      const id = (row as any)?.id
      const gk = (row as any)?._bundleGroupKey
      const sz = (row as any)?._bundleGroupSize
      if (!id || !gk) continue
      if (typeof sz === 'number' && sz < 2) continue
      if (selectedSet.has(id)) keys.add(String(gk))
    }
    return Array.from(keys)
  })

  const mergeGroup = (targetGroup: UserOrderRow[]): UserOrderRow => {
    const [first, ...rest] = targetGroup
    const mergedProducts = [...((first!.products ?? []) as any[]), ...rest.flatMap((r) => (Array.isArray(r.products) ? r.products : []))]
    const mergedSourceRawRows = [...(((first as any).sourceRawRows ?? []) as any[]), ...rest.flatMap((r) => (((r as any).sourceRawRows ?? []) as any[]))]
    const mergedCoolType = determineCoolType(mergedProducts)
    const mergedInvoiceType = determineInvoiceType(mergedProducts, first!.invoiceType as '0' | '8' | 'A' | undefined)
    const originalRows = targetGroup.map((r) => { const { _bundleOriginalRows, ...cleanRow } = r as any; return cleanRow })

    return {
      ...first!,
      orderNumber: first!.orderNumber || '',
      recipient: {
        postalCode: first!.recipient?.postalCode || '', prefecture: first!.recipient?.prefecture || '',
        city: first!.recipient?.city || '', street: first!.recipient?.street || '',
        building: first!.recipient?.building || '', name: first!.recipient?.name || '', phone: first!.recipient?.phone || '',
      },
      sender: {
        postalCode: first!.sender?.postalCode || '', prefecture: first!.sender?.prefecture || '',
        city: first!.sender?.city || '', street: first!.sender?.street || '',
        building: first!.sender?.building || '', name: first!.sender?.name || '', phone: first!.sender?.phone || '',
      },
      handlingTags: first!.handlingTags || [],
      products: mergedProducts,
      sourceRawRows: mergedSourceRawRows,
      coolType: mergedCoolType ?? first!.coolType,
      invoiceType: mergedInvoiceType ?? first!.invoiceType,
      updatedAt: new Date().toISOString(),
      id: first!.id,
      _bundleOriginalRows: originalRows,
    } as any
  }

  const handleBundleMergeAllSelected = async () => {
    if (!bundleModeEnabled.value || bundleFilterKeys.value.length === 0) {
      toast.showWarning('同梱モードとフィルターを有効にしてください')
      return
    }
    if (!tableSelectedKeys.value.length) {
      toast.showWarning('左側のチェックで同梱したい行を選択してください')
      return
    }

    const groups = new Map<string, UserOrderRow[]>()
    for (const row of filteredRows.value) {
      const keyParts = bundleFilterKeys.value.map((k) => getNestedValue(row, k) ?? '')
      const gk = JSON.stringify(keyParts)
      if (!groups.has(gk)) groups.set(gk, [])
      groups.get(gk)!.push(row)
    }

    const selectedSet = new Set(tableSelectedKeys.value)
    const groupKeysToMerge: string[] = []
    let totalRowsToMerge = 0
    for (const [gk, rows] of groups.entries()) {
      if (rows.length < 2) continue
      if (rows.some((r) => selectedSet.has(r.id))) {
        groupKeysToMerge.push(gk)
        totalRowsToMerge += rows.length
      }
    }

    if (groupKeysToMerge.length === 0) {
      toast.showWarning('選択した行に同梱可能なグループがありません')
      return
    }

    if (!confirm(`選択行を含む${groupKeysToMerge.length}グループ（合計${totalRowsToMerge}件）を同梱しますか？`)) return

    const mergedByFirstId = new Map<string, UserOrderRow>()
    const idsToRemove = new Set<string>()
    let mergedGroupCount = 0

    for (const gk of groupKeysToMerge) {
      const targetGroup = groups.get(gk)
      if (!targetGroup || targetGroup.length < 2) continue
      const mergedRow = mergeGroup(targetGroup)
      mergedByFirstId.set(targetGroup[0]!.id, mergedRow)
      for (const r of targetGroup) {
        if (r.id !== targetGroup[0]!.id) idsToRemove.add(r.id)
      }
      mergedGroupCount += 1
    }

    allRows.value = allRows.value
      .filter(row => !idsToRemove.has(row.id))
      .map(row => mergedByFirstId.get(row.id) ?? row)

    tableSelectedKeys.value = []
    toast.showSuccess(`全て同梱完了：${mergedGroupCount}グループを同梱しました`)
  }

  const handleUnbundleSelected = async () => {
    const selectedSet = new Set(tableSelectedKeys.value)
    if (selectedSet.size === 0) {
      toast.showWarning('解除する行を選択してください')
      return
    }

    const bundledRows = allRows.value.filter((row) => {
      if (!selectedSet.has(row.id)) return false
      return Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0
    })

    if (bundledRows.length === 0) {
      toast.showWarning('選択された行に同梱済みの行がありません')
      return
    }

    const totalOriginalRows = bundledRows.reduce((sum, row) => sum + ((row as any)._bundleOriginalRows?.length || 0), 0)
    if (!confirm(`選択した${bundledRows.length}件の同梱を解除し、${totalOriginalRows}件の元の行に戻しますか？`)) return

    const bundledIds = new Set(bundledRows.map((r) => r.id))
    const nextAll: UserOrderRow[] = []
    let restoredCount = 0

    for (const row of allRows.value) {
      if (bundledIds.has(row.id)) {
        const originalRows = (row as any)._bundleOriginalRows as UserOrderRow[]
        if (Array.isArray(originalRows) && originalRows.length > 0) {
          for (const originalRow of originalRows) {
            nextAll.push({ ...originalRow, updatedAt: new Date().toISOString() })
            restoredCount++
          }
        } else {
          nextAll.push(row)
        }
      } else {
        nextAll.push(row)
      }
    }

    allRows.value = nextAll
    tableSelectedKeys.value = []
    toast.showSuccess(`同梱解除完了：${restoredCount}件の行を復元しました`)
  }

  const handleOpenBundleList = () => {
    if (bundleFilterKeys.value.length === 0) {
      showBundleFilterDialog.value = true
    } else {
      bundleModeEnabled.value = true
      setCookie(BUNDLE_MODE_COOKIE_KEY, '1', 30)
    }
  }

  const handleExitBundleMode = () => {
    bundleModeEnabled.value = false
    setCookie(BUNDLE_MODE_COOKIE_KEY, '0', 30)
  }

  const handleBundleFilterSave = (keys: string[]) => {
    bundleFilterKeys.value = keys
    setCookie(BUNDLE_FILTER_COOKIE_KEY, JSON.stringify(keys ?? []), 30)
    toast.showSuccess('同梱設定を保存しました')
  }

  const handleBundleFilterUpdate = (keys: string[]) => {
    bundleFilterKeys.value = keys
    setCookie(BUNDLE_FILTER_COOKIE_KEY, JSON.stringify(keys ?? []), 30)
  }

  const restoreFromCookies = () => {
    const savedFilter = getCookie(BUNDLE_FILTER_COOKIE_KEY)
    if (savedFilter) {
      try {
        const parsed = JSON.parse(savedFilter)
        if (Array.isArray(parsed)) bundleFilterKeys.value = parsed.filter((k) => typeof k === 'string')
      } catch (err) {
        // バンドルフィルターCookie解析失敗 / Failed to parse bundle filter cookie
      }
    }
    const savedMode = getCookie(BUNDLE_MODE_COOKIE_KEY)
    if (savedMode === '1') bundleModeEnabled.value = true
  }

  return {
    bundleFilterKeys,
    bundleModeEnabled,
    showBundleFilterDialog,
    bundleFilterFields,
    bundleFilterLabels,
    isBundleable,
    hasUnbundleableRows,
    selectedBundleGroupKeys,
    handleBundleMergeAllSelected,
    handleUnbundleSelected,
    handleOpenBundleList,
    handleExitBundleMode,
    handleBundleFilterSave,
    handleBundleFilterUpdate,
    restoreFromCookies,
  }
}
