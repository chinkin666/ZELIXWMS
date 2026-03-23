import { ref, computed, onBeforeUnmount } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import type { Carrier } from '@/types/carrier'
import type { YamatoB2ValidateResult, YamatoB2ExportResult, AutoValidationConfig } from '@/types/carrierAutomation'
import { yamatoB2Validate, yamatoB2Export, fetchCarrierAutomationConfig } from '@/api/carrierAutomation'
import { updateShipmentOrderStatusBulk } from '@/api/shipmentOrders'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const { confirm: _defaultConfirm } = useConfirmDialog()

export function useOrderB2Cloud(
  pendingWaybillRows: Ref<UserOrderRow[]>,
  carriers: Ref<Carrier[]>,
  tableSelectedKeys: Ref<(string | number)[]>,
  sortedRows: ComputedRef<UserOrderRow[]>,
  loadPendingWaybillOrders: () => Promise<void>,
  toast: { showSuccess: (msg: string) => void; showWarning: (msg: string) => void; showError: (msg: string) => void },
  confirmFn: (message: string) => Promise<boolean> = (msg) => _defaultConfirm(msg),
) {
  // --- B2 Cloud バリデーション ---
  const b2Validating = ref(false)
  const b2ValidateDialogVisible = ref(false)
  const b2ValidateResult = ref<YamatoB2ValidateResult | null>(null)
  const b2PendingConfirmIds = ref<string[]>([])
  const b2PendingB2OrderIds = ref<string[]>([])
  const b2ValidateOrderMap = ref<Map<number, string>>(new Map())
  const b2ApiErrorDialogVisible = ref(false)
  const b2ApiErrorMessage = ref('')
  const b2ValidationErrors = ref<Map<string, string[]>>(new Map())
  const isAutoValidating = ref(false)
  let autoValidateRetryTimer: ReturnType<typeof setTimeout> | null = null

  // --- B2 Cloud 送信 ---
  const b2Exporting = ref(false)
  const b2ExportResultDialogVisible = ref(false)
  const b2ExportResult = ref<YamatoB2ExportResult | null>(null)

  // B2 エラー文字列からユーザー向けメッセージを抽出
  const parseB2Error = (err: string): string => {
    const descMatch = err.match(/['"]error_description['"]\s*:\s*['"](.+?)['"]/)
    if (descMatch) return descMatch[1] ?? err
    try {
      const parsed = JSON.parse(err)
      if (parsed?.error_description) return parsed.error_description
      if (parsed?.error_message) return parsed.error_message
    } catch { /* not JSON */ }
    return err
  }

  const getB2Errors = (row: any): string[] => {
    const id = String(row._id || row.id)
    const errors = b2ValidationErrors.value.get(id)
    if (!errors) return []
    return errors.map(parseB2Error)
  }

  const isYamatoB2Carrier = (carrierId: string): boolean => {
    const carrier = carriers.value.find((c) => c._id === carrierId)
    return carrier?.automationType === 'yamato-b2'
  }

  const doConfirmOrders = async (ids: string[]) => {
    if (ids.length === 0) return
    try {
      await updateShipmentOrderStatusBulk(ids, 'mark-print-ready')
      toast.showSuccess(`${ids.length}件の出荷指示を確定しました`)
      tableSelectedKeys.value = []
      await loadPendingWaybillOrders()
    } catch (e: any) {
      toast.showError(e?.message || '出荷指示確定に失敗しました')
    }
  }

  const handleConfirmPrintReady = async () => {
    if (tableSelectedKeys.value.length === 0) {
      toast.showWarning('確認する行を選択してください')
      return
    }

    const selectedRows = sortedRows.value.filter((row) =>
      tableSelectedKeys.value.includes(row.id),
    )

    const confirmed = await confirmFn(`選択した${selectedRows.length}件の出荷指示確定しますか？`)
    if (!confirmed) return

    const ids = selectedRows.map((row) => String((row as any)._id || row.id)).filter(Boolean)
    if (ids.length === 0) {
      toast.showWarning('有効なIDがありません')
      return
    }

    const b2OrderIds = selectedRows
      .filter((row) => isYamatoB2Carrier(row.carrierId))
      .map((row) => String((row as any)._id || row.id))

    if (b2OrderIds.length > 0) {
      b2Validating.value = true
      const b2Rows = selectedRows.filter((row) => isYamatoB2Carrier(row.carrierId))
      const orderMap = new Map<number, string>()
      b2Rows.forEach((row, i) => {
        orderMap.set(i, (row as any).orderNumber || row.customerManagementNumber || '-')
      })
      b2ValidateOrderMap.value = orderMap
      try {
        const validateResult = await yamatoB2Validate(b2OrderIds)
        b2ValidateResult.value = validateResult
        b2PendingConfirmIds.value = ids
        b2PendingB2OrderIds.value = b2OrderIds
        b2Validating.value = false
        b2ValidateDialogVisible.value = true
      } catch (e: any) {
        b2Validating.value = false
        b2ApiErrorMessage.value = e?.message || 'B2 Cloud の検証中にエラーが発生しました'
        b2ApiErrorDialogVisible.value = true
      }
    } else {
      await doConfirmOrders(ids)
    }
  }

  const handleB2ValidateDialogCancel = () => {
    b2ValidateDialogVisible.value = false
    b2ValidateResult.value = null
    b2PendingConfirmIds.value = []
    b2PendingB2OrderIds.value = []
  }

  const handleB2ValidateDialogConfirm = async () => {
    b2ValidateDialogVisible.value = false

    const validB2Ids = new Set<string>()
    const invalidB2Ids = new Set<string>()
    if (b2ValidateResult.value) {
      for (const item of b2ValidateResult.value.results) {
        const orderId = b2PendingB2OrderIds.value[item.index]
        if (!orderId) continue
        if (item.valid) {
          validB2Ids.add(orderId)
        } else {
          invalidB2Ids.add(orderId)
        }
      }
    }

    const confirmIds = b2PendingConfirmIds.value.filter((id) => !invalidB2Ids.has(id))
    await doConfirmOrders(confirmIds)

    b2PendingConfirmIds.value = []
    b2PendingB2OrderIds.value = []
    b2ValidateResult.value = null
  }

  // --- 自動 B2 Cloud 検証 ---
  const FALLBACK_RETRY_DELAY_MS = 8_000
  const FALLBACK_MAX_RETRIES = 2
  let autoValidateRetryCount = 0
  let cachedAutoValidationConfig: AutoValidationConfig | null = null

  const getAutoValidationConfig = async (): Promise<AutoValidationConfig> => {
    if (cachedAutoValidationConfig) return cachedAutoValidationConfig
    try {
      const config = await fetchCarrierAutomationConfig('yamato-b2')
      if (config.autoValidation?.enabled) {
        cachedAutoValidationConfig = config.autoValidation
        return config.autoValidation
      }
    } catch { /* use fallback */ }
    return { enabled: false, intervalMinutes: 0, maxRetries: FALLBACK_MAX_RETRIES }
  }

  const autoValidateProcessingOrders = async (scopeIds?: Set<string>, isRetry = false) => {
    if (autoValidateRetryTimer) {
      clearTimeout(autoValidateRetryTimer)
      autoValidateRetryTimer = null
    }

    if (!isRetry) {
      autoValidateRetryCount = 0
      cachedAutoValidationConfig = null
    }

    const avConfig = await getAutoValidationConfig()
    const maxRetries = avConfig.enabled ? avConfig.maxRetries : FALLBACK_MAX_RETRIES
    const retryDelayMs = avConfig.enabled ? avConfig.intervalMinutes * 60_000 : FALLBACK_RETRY_DELAY_MS

    if (isRetry) {
      await loadPendingWaybillOrders()
    }

    const processingOrders = pendingWaybillRows.value.filter(
      (r: any) => !r.status?.held?.isHeld && !r.status?.confirm?.isConfirmed
        && (!scopeIds || scopeIds.has(String(r._id || r.id))),
    )
    if (processingOrders.length === 0) {
      isAutoValidating.value = false
      return
    }

    const b2Orders = processingOrders.filter((r) => isYamatoB2Carrier(r.carrierId))
    if (b2Orders.length === 0) {
      const nonB2Ids = processingOrders.map((r) => String((r as any)._id || r.id)).filter(Boolean)
      if (nonB2Ids.length > 0) {
        await doConfirmOrders(nonB2Ids)
      }
      return
    }

    const b2OrderIds = b2Orders.map((r) => String((r as any)._id || r.id)).filter(Boolean)
    const nonB2Orders = processingOrders.filter((r) => !isYamatoB2Carrier(r.carrierId))
    const nonB2Ids = nonB2Orders.map((r) => String((r as any)._id || r.id)).filter(Boolean)

    isAutoValidating.value = true
    if (!isRetry) {
      b2ValidationErrors.value = new Map()
    }

    try {
      const validateResult = await yamatoB2Validate(b2OrderIds)

      const validIds: string[] = []
      const newErrors = new Map<string, string[]>()

      for (const item of validateResult.results) {
        const orderId = b2OrderIds[item.index]
        if (!orderId) continue
        if (item.valid) {
          validIds.push(orderId)
        } else {
          newErrors.set(orderId, item.errors)
        }
      }

      const confirmIds = [...validIds, ...nonB2Ids]
      if (confirmIds.length > 0) {
        await doConfirmOrders(confirmIds)
      }

      if (newErrors.size > 0) {
        autoValidateRetryCount++
        if (autoValidateRetryCount < maxRetries) {
          autoValidateRetryTimer = setTimeout(() => {
            autoValidateRetryTimer = null
            const failedIds = new Set(newErrors.keys())
            autoValidateProcessingOrders(failedIds, true)
          }, retryDelayMs)
        } else {
          b2ValidationErrors.value = newErrors
          isAutoValidating.value = false
          toast.showWarning(`${newErrors.size}件のデータにエラーがあります。修正後、再度確認してください。`)
        }
      } else {
        b2ValidationErrors.value = new Map()
        isAutoValidating.value = false
        if (validIds.length > 0) {
          toast.showSuccess(`${validIds.length}件の検証が正常に完了しました`)
        }
      }
      return
    } catch (e: any) {
      autoValidateRetryCount++
      if (autoValidateRetryCount < maxRetries) {
        autoValidateRetryTimer = setTimeout(() => {
          autoValidateRetryTimer = null
          autoValidateProcessingOrders(scopeIds, true)
        }, retryDelayMs)
      } else {
        isAutoValidating.value = false
        toast.showError(e?.message || 'B2 Cloud の検証中にエラーが発生しました')
      }
    }
  }

  // --- B2 Cloud 送信 ---
  const canSendToB2Cloud = computed(() => {
    if (tableSelectedKeys.value.length === 0) return false
    const keySet = new Set(tableSelectedKeys.value)
    const selectedRows = pendingWaybillRows.value.filter((r) => keySet.has(r.id))
    if (selectedRows.length === 0) return false
    return selectedRows.every((row) => {
      const carrierId = String(row.carrierId || '')
      if (!carrierId) return false
      const carrier = carriers.value.find((c) => c._id === carrierId)
      return carrier?.automationType === 'yamato-b2'
    })
  })

  const handleB2Export = async () => {
    if (tableSelectedKeys.value.length === 0) return
    const keySet = new Set(tableSelectedKeys.value)
    const selectedRows = pendingWaybillRows.value.filter((r) => keySet.has(r.id))
    if (!selectedRows.length) return

    const carrierIdSet = new Set(selectedRows.map((r) => String(r.carrierId || '')).filter(Boolean))
    if (carrierIdSet.size !== 1) {
      toast.showWarning('選択した行の配送業者が一致しません。配送業者ごとに出力してください。')
      return
    }
    const carrierId = Array.from(carrierIdSet)[0]!
    const carrier = carriers.value.find((c) => c._id === carrierId)
    if (!carrier || carrier.automationType !== 'yamato-b2') {
      toast.showWarning('選択した配送業者はB2 Cloud自動連携に対応していません')
      return
    }

    const orderIds = selectedRows.map((r) => String((r as any)._id)).filter(Boolean)
    if (!orderIds.length) return

    b2Exporting.value = true
    try {
      const result = await yamatoB2Export(orderIds)
      b2ExportResult.value = result
      b2ExportResultDialogVisible.value = true
      if (result.success_count > 0) toast.showSuccess(`${result.success_count}件の送信に成功しました`)
      if (result.error_count > 0) toast.showError(`${result.error_count}件の送信に失敗しました`)
    } catch (e: any) {
      b2ApiErrorMessage.value = e?.message || 'B2 Cloudへの送信に失敗しました'
      b2ApiErrorDialogVisible.value = true
    } finally {
      b2Exporting.value = false
    }
  }

  const handleB2ExportResultClose = async () => {
    b2ExportResultDialogVisible.value = false
    b2ExportResult.value = null
    tableSelectedKeys.value = []
    await loadPendingWaybillOrders()
  }

  const cleanup = () => {
    if (autoValidateRetryTimer) {
      clearTimeout(autoValidateRetryTimer)
      autoValidateRetryTimer = null
    }
  }

  return {
    // Validation state
    b2Validating,
    b2ValidateDialogVisible,
    b2ValidateResult,
    b2ValidateOrderMap,
    b2ApiErrorDialogVisible,
    b2ApiErrorMessage,
    b2ValidationErrors,
    isAutoValidating,
    getB2Errors,
    // Validation actions
    handleConfirmPrintReady,
    handleB2ValidateDialogCancel,
    handleB2ValidateDialogConfirm,
    autoValidateProcessingOrders,
    // Export state
    b2Exporting,
    b2ExportResultDialogVisible,
    b2ExportResult,
    canSendToB2Cloud,
    // Export actions
    handleB2Export,
    handleB2ExportResultClose,
    // Cleanup
    cleanup,
  }
}
