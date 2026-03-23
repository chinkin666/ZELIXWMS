import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { toast } from 'vue-sonner'
import { computed } from 'vue'
import { getNestedValue } from '@/utils/nestedObject'
import { determineCoolType, determineInvoiceType } from '@/utils/productMapUtils'
import { setCookie, getCookie, BUNDLE_FILTER_COOKIE_KEY, BUNDLE_MODE_COOKIE_KEY } from '@/views/shipment-orders/composables/useOrderStorage'
import type { V2State } from './useV2State'
import type { ComputedRef } from 'vue'

interface BundleDeps {
  state: V2State
  allRows: any
  draftNonHeldRows: ComputedRef<any[]>
}

export function useV2Bundle({ state, allRows, draftNonHeldRows }: BundleDeps) {
  const bundleFilterFields = computed(() => [
    { key: 'recipient.name', title: 'お届け先氏名', description: 'お届け先の氏名が一致する注文を同梱候補とする' },
    { key: 'recipient.postalCode', title: 'お届け先郵便番号', description: 'お届け先の郵便番号が一致する注文を同梱候補とする' },
    { key: 'recipient.street', title: 'お届け先住所', description: 'お届け先の住所が一致する注文を同梱候補とする' },
    { key: 'recipient.phone', title: 'お届け先電話番号', description: 'お届け先の電話番号が一致する注文を同梱候補とする' },
    { key: 'orderSourceCompanyId', title: '販売分類', description: '※ご依頼主を超えて同梱する時には「販売分類」のチェックを外してください' },
  ])

  const bundleFilterLabels = computed(() => {
    if (state.bundleFilterKeys.value.length === 0) return ''
    return state.bundleFilterKeys.value
      .map((key) => bundleFilterFields.value.find((f) => f.key === key)?.title || key)
      .filter(Boolean)
      .join(', ')
  })

  const hasUnbundleableRows = computed(() => {
    if (state.selectedRows.value.length === 0) return false
    const selectedIds = new Set(state.selectedRows.value.map(r => r.id || r._id))
    return allRows.value.some((row: any) => {
      if (!selectedIds.has(row.id)) return false
      return Array.isArray(row._bundleOriginalRows) && row._bundleOriginalRows.length > 0
    })
  })

  const handleOpenBundleMode = () => {
    if (state.bundleFilterKeys.value.length === 0) {
      state.showBundleFilterDialog.value = true
    } else {
      state.bundleModeEnabled.value = true
      setCookie(BUNDLE_MODE_COOKIE_KEY, '1', 30)
    }
  }

  const handleExitBundleMode = () => {
    state.bundleModeEnabled.value = false
    setCookie(BUNDLE_MODE_COOKIE_KEY, '0', 30)
  }

  const handleBundleFilterSave = (keys: string[]) => {
    state.bundleFilterKeys.value = keys
    setCookie(BUNDLE_FILTER_COOKIE_KEY, JSON.stringify(keys ?? []), 30)
    state.bundleModeEnabled.value = true
    setCookie(BUNDLE_MODE_COOKIE_KEY, '1', 30)
    toast.success('同梱設定を保存しました')
  }

  const handleBundleFilterUpdate = (keys: string[]) => {
    state.bundleFilterKeys.value = keys
    setCookie(BUNDLE_FILTER_COOKIE_KEY, JSON.stringify(keys ?? []), 30)
  }

  const mergeGroup = (targetGroup: any[]): any => {
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
    }
  }

  const handleBundleMerge = async () => {
    if (!state.bundleModeEnabled.value || state.bundleFilterKeys.value.length === 0) {
      toast.warning('同梱モードとフィルターを有効にしてください')
      return
    }
    if (state.selectedRows.value.length === 0) {
      toast.warning('同梱したい行を選択してください')
      return
    }

    const groups = new Map<string, any[]>()
    for (const row of draftNonHeldRows.value) {
      const keyParts = state.bundleFilterKeys.value.map((k) => getNestedValue(row, k) ?? '')
      const gk = JSON.stringify(keyParts)
      if (!groups.has(gk)) groups.set(gk, [])
      groups.get(gk)!.push(row)
    }

    const selectedIds = new Set(state.selectedRows.value.map(r => r.id || r._id))
    const groupKeysToMerge: string[] = []
    let totalRowsToMerge = 0
    for (const [gk, rows] of groups.entries()) {
      if (rows.length < 2) continue
      if (rows.some((r: any) => selectedIds.has(r.id))) {
        groupKeysToMerge.push(gk)
        totalRowsToMerge += rows.length
      }
    }

    if (groupKeysToMerge.length === 0) {
      toast.warning('選択した行に同梱可能なグループがありません')
      return
    }

    try {
      if (!confirm('この操作を実行しますか？')) return
    } catch { return }

    const mergedByFirstId = new Map<string, any>()
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
      .filter((row: any) => !idsToRemove.has(row.id))
      .map((row: any) => mergedByFirstId.get(row.id) ?? row)

    state.selectedRows.value = []
    toast.success(`全て同梱完了：${mergedGroupCount}グループを同梱しました`)
  }

  const handleUnbundle = async () => {
    if (state.selectedRows.value.length === 0) {
      toast.warning('解除する行を選択してください')
      return
    }

    const selectedIds = new Set(state.selectedRows.value.map(r => r.id || r._id))
    const bundledRows = allRows.value.filter((row: any) => {
      if (!selectedIds.has(row.id)) return false
      return Array.isArray(row._bundleOriginalRows) && row._bundleOriginalRows.length > 0
    })

    if (bundledRows.length === 0) {
      toast.warning('選択された行に同梱済みの行がありません')
      return
    }

    const totalOriginalRows = bundledRows.reduce((sum: number, row: any) => sum + (row._bundleOriginalRows?.length || 0), 0)

    try {
      if (!confirm('この操作を実行しますか？')) return
    } catch { return }

    const bundledIds = new Set(bundledRows.map((r: any) => r.id))
    const nextAll: any[] = []
    let restoredCount = 0

    for (const row of allRows.value) {
      if (bundledIds.has(row.id)) {
        const originalRows = row._bundleOriginalRows as any[]
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
    state.selectedRows.value = []
    toast.success(`同梱解除完了：${restoredCount}件の行を復元しました`)
  }

  const restoreBundleFromCookies = () => {
    const savedBundleKeys = getCookie(BUNDLE_FILTER_COOKIE_KEY)
    if (savedBundleKeys) {
      try { state.bundleFilterKeys.value = JSON.parse(savedBundleKeys) } catch { /* ignore */ }
    }
    const savedBundleMode = getCookie(BUNDLE_MODE_COOKIE_KEY)
    if (savedBundleMode === '1' && state.bundleFilterKeys.value.length > 0) {
      state.bundleModeEnabled.value = true
    }
  }

  return {
    bundleFilterFields, bundleFilterLabels, hasUnbundleableRows,
    handleOpenBundleMode, handleExitBundleMode,
    handleBundleFilterSave, handleBundleFilterUpdate,
    handleBundleMerge, handleUnbundle,
    restoreBundleFromCookies,
  }
}
