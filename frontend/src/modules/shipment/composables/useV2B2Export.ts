import { ElMessage } from 'element-plus'
import { yamatoB2Export } from '@/api/carrierAutomation'
import type { V2State } from './useV2State'

interface B2ExportDeps {
  state: V2State
  loadBackendOrders: () => Promise<void>
}

export function useV2B2Export({ state, loadBackendOrders }: B2ExportDeps) {
  const handleB2Export = async () => {
    if (state.selectedRows.value.length === 0) return

    const carrierIdSet = new Set(state.selectedRows.value.map((r) => String(r.carrierId || '')).filter(Boolean))
    if (carrierIdSet.size !== 1) {
      ElMessage.warning('選択した行の配送業者が一致しません。配送業者ごとに出力してください。')
      return
    }
    const carrierId = Array.from(carrierIdSet)[0]!
    const carrier = state.carriers.value.find((c) => c._id === carrierId)
    if (!carrier || carrier.automationType !== 'yamato-b2') {
      ElMessage.warning('選択した配送業者はB2 Cloud自動連携に対応していません')
      return
    }

    const orderIds = state.selectedRows.value.map((r) => String(r._id)).filter(Boolean)
    if (!orderIds.length) return

    state.b2Exporting.value = true
    try {
      const result = await yamatoB2Export(orderIds)
      state.b2ExportResult.value = result
      state.b2ExportResultDialogVisible.value = true
      if (result.success_count > 0) ElMessage.success(`${result.success_count}件の送信に成功しました`)
      if (result.error_count > 0) ElMessage.error(`${result.error_count}件の送信に失敗しました`)
    } catch (e: any) {
      state.b2ApiErrorMessage.value = e?.message || 'B2 Cloudへの送信に失敗しました'
      state.b2ApiErrorDialogVisible.value = true
    } finally {
      state.b2Exporting.value = false
    }
  }

  const handleB2ExportResultClose = async () => {
    state.b2ExportResultDialogVisible.value = false
    state.b2ExportResult.value = null
    state.selectedRows.value = []
    await loadBackendOrders()
  }

  return { handleB2Export, handleB2ExportResultClose }
}
