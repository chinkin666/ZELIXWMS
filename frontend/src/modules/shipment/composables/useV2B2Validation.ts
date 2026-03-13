import { ElMessage, ElMessageBox } from 'element-plus'
import { updateShipmentOrderStatusBulk } from '@/api/shipmentOrders'
import { yamatoB2Validate, fetchCarrierAutomationConfig } from '@/api/carrierAutomation'
import type { AutoValidationConfig } from '@/types/carrierAutomation'
import type { V2State } from './useV2State'

interface B2ValidationDeps {
  state: V2State
  loadBackendOrders: () => Promise<void>
}

export function useV2B2Validation({ state, loadBackendOrders }: B2ValidationDeps) {
  const FALLBACK_RETRY_DELAY_MS = 8_000
  const FALLBACK_MAX_RETRIES = 2
  let autoValidateRetryCount = 0
  let cachedAutoValidationConfig: AutoValidationConfig | null = null
  let autoValidateRetryTimer: ReturnType<typeof setTimeout> | null = null

  const isYamatoB2Carrier = (carrierId: string): boolean => {
    const carrier = state.carriers.value.find((c) => c._id === carrierId)
    return carrier?.automationType === 'yamato-b2'
  }

  const doConfirmOrders = async (ids: string[]) => {
    if (ids.length === 0) return
    try {
      await updateShipmentOrderStatusBulk(ids, 'mark-print-ready')
      ElMessage.success(`${ids.length}件の出荷指示を確定しました`)
      state.selectedRows.value = []
      await loadBackendOrders()
    } catch (e: any) {
      ElMessage.error(e?.message || '出荷指示確定に失敗しました')
    }
  }

  const handleConfirmPrintReady = async () => {
    if (state.selectedRows.value.length === 0) {
      ElMessage.warning('確認する行を選択してください')
      return
    }

    try {
      await ElMessageBox.confirm(
        `選択した${state.selectedRows.value.length}件の出荷指示を確定しますか？`,
        '出荷指示確定',
        { confirmButtonText: '確定', cancelButtonText: 'キャンセル', type: 'info' }
      )
    } catch { return }

    const rows = state.selectedRows.value
    const ids = rows.map((row) => String(row._id || row.id)).filter(Boolean)
    if (ids.length === 0) return

    const b2OrderIds = rows
      .filter((row) => isYamatoB2Carrier(row.carrierId))
      .map((row) => String(row._id || row.id))

    if (b2OrderIds.length > 0) {
      state.b2Validating.value = true
      const b2Rows = rows.filter((row) => isYamatoB2Carrier(row.carrierId))
      const orderMap = new Map<number, string>()
      b2Rows.forEach((row, i) => {
        orderMap.set(i, row.orderNumber || row.customerManagementNumber || '-')
      })
      state.b2ValidateOrderMap.value = orderMap
      try {
        const validateResult = await yamatoB2Validate(b2OrderIds)
        state.b2ValidateResult.value = validateResult
        state.b2PendingConfirmIds.value = ids
        state.b2PendingB2OrderIds.value = b2OrderIds
        state.b2Validating.value = false
        state.b2ValidateDialogVisible.value = true
      } catch (e: any) {
        state.b2Validating.value = false
        state.b2ApiErrorMessage.value = e?.message || 'B2 Cloud の検証中にエラーが発生しました'
        state.b2ApiErrorDialogVisible.value = true
      }
    } else {
      await doConfirmOrders(ids)
    }
  }

  const handleB2ValidateDialogCancel = () => {
    state.b2ValidateDialogVisible.value = false
    state.b2ValidateResult.value = null
    state.b2PendingConfirmIds.value = []
    state.b2PendingB2OrderIds.value = []
  }

  const handleB2ValidateDialogConfirm = async () => {
    state.b2ValidateDialogVisible.value = false

    const validB2Ids = new Set<string>()
    const invalidB2Ids = new Set<string>()
    if (state.b2ValidateResult.value) {
      for (const item of state.b2ValidateResult.value.results) {
        const orderId = state.b2PendingB2OrderIds.value[item.index]
        if (!orderId) continue
        if (item.valid) {
          validB2Ids.add(orderId)
        } else {
          invalidB2Ids.add(orderId)
        }
      }
    }

    const confirmIds = state.b2PendingConfirmIds.value.filter((id) => !invalidB2Ids.has(id))
    await doConfirmOrders(confirmIds)

    state.b2PendingConfirmIds.value = []
    state.b2PendingB2OrderIds.value = []
    state.b2ValidateResult.value = null
  }

  // --- Auto B2 Cloud validation ---
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
      await loadBackendOrders()
    }

    const processingOrders = state.backendRows.value.filter(
      (r: any) => !r.status?.held?.isHeld && !r.status?.confirm?.isConfirmed
        && (!scopeIds || scopeIds.has(String(r._id || r.id))),
    )
    if (processingOrders.length === 0) {
      state.isAutoValidating.value = false
      return
    }

    const b2Orders = processingOrders.filter((r) => isYamatoB2Carrier(r.carrierId))
    if (b2Orders.length === 0) {
      const nonB2Ids = processingOrders.map((r) => String(r._id || r.id)).filter(Boolean)
      if (nonB2Ids.length > 0) await doConfirmOrders(nonB2Ids)
      return
    }

    const b2OrderIds = b2Orders.map((r) => String(r._id || r.id)).filter(Boolean)
    const nonB2Ids = processingOrders
      .filter((r) => !isYamatoB2Carrier(r.carrierId))
      .map((r) => String(r._id || r.id)).filter(Boolean)

    state.isAutoValidating.value = true
    if (!isRetry) state.b2ValidationErrors.value = new Map()

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
      if (confirmIds.length > 0) await doConfirmOrders(confirmIds)

      if (newErrors.size > 0) {
        autoValidateRetryCount++
        if (autoValidateRetryCount < maxRetries) {
          autoValidateRetryTimer = setTimeout(() => {
            autoValidateRetryTimer = null
            const failedIds = new Set(newErrors.keys())
            autoValidateProcessingOrders(failedIds, true)
          }, retryDelayMs)
        } else {
          state.b2ValidationErrors.value = newErrors
          state.isAutoValidating.value = false
          ElMessage.warning(`${newErrors.size}件のデータにエラーがあります。修正後、再度確認してください。`)
        }
      } else {
        state.b2ValidationErrors.value = new Map()
        state.isAutoValidating.value = false
        if (validIds.length > 0) {
          ElMessage.success(`${validIds.length}件の検証が正常に完了しました`)
        }
      }
    } catch (e: any) {
      autoValidateRetryCount++
      if (autoValidateRetryCount < maxRetries) {
        autoValidateRetryTimer = setTimeout(() => {
          autoValidateRetryTimer = null
          autoValidateProcessingOrders(scopeIds, true)
        }, retryDelayMs)
      } else {
        state.isAutoValidating.value = false
        ElMessage.error(e?.message || 'B2 Cloud の検証中にエラーが発生しました')
      }
    }
  }

  const cleanupAutoValidate = () => {
    if (autoValidateRetryTimer) {
      clearTimeout(autoValidateRetryTimer)
      autoValidateRetryTimer = null
    }
  }

  return {
    isYamatoB2Carrier, doConfirmOrders,
    handleConfirmPrintReady, handleB2ValidateDialogCancel, handleB2ValidateDialogConfirm,
    autoValidateProcessingOrders, cleanupAutoValidate,
  }
}
