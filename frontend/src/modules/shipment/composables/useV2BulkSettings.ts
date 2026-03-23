import { toast } from 'vue-sonner'
import type { V2State } from './useV2State'

interface BulkSettingsDeps {
  state: V2State
  allRows: any
}

export function useV2BulkSettings({ state, allRows }: BulkSettingsDeps) {
  const applyShipPlanDate = () => {
    if (!state.shipPlanDateSelected.value) {
      toast.warning('出荷予定日を選択してください')
      return
    }
    if (state.selectedRows.value.length === 0) return
    const selectedIds = new Set(state.selectedRows.value.map(r => r.id || r._id))
    const nowIso = new Date().toISOString()
    let changed = 0
    allRows.value = allRows.value.map((row: any) => {
      if (!selectedIds.has(row.id)) return row
      changed++
      return { ...row, shipPlanDate: state.shipPlanDateSelected.value, updatedAt: nowIso }
    })
    toast.success(`出荷予定日を${state.shipPlanDateSelected.value}に設定しました（${changed}件）`)
    state.shipPlanDateDialogVisible.value = false
  }

  const applySenderBulk = () => {
    if (!state.senderBulkCompanyId.value) {
      toast.warning('ご依頼主を選択してください')
      return
    }
    if (state.selectedRows.value.length === 0) return
    const company = state.orderSourceCompanies.value.find(c => c._id === state.senderBulkCompanyId.value)
    if (!company) {
      toast.error('ご依頼主が見つかりません')
      return
    }
    const selectedIds = new Set(state.selectedRows.value.map(r => r.id || r._id))
    const nowIso = new Date().toISOString()
    let changed = 0
    allRows.value = allRows.value.map((row: any) => {
      if (!selectedIds.has(row.id)) return row
      changed++
      const existingYamato = row.carrierData?.yamato ?? {}
      const newYamato = state.senderBulkOverwrite.value
        ? { ...existingYamato, hatsuBaseNo1: (company as any).hatsuBaseNo1 || '', hatsuBaseNo2: (company as any).hatsuBaseNo2 || '' }
        : { ...existingYamato, hatsuBaseNo1: existingYamato.hatsuBaseNo1 || (company as any).hatsuBaseNo1 || '', hatsuBaseNo2: existingYamato.hatsuBaseNo2 || (company as any).hatsuBaseNo2 || '' }
      return {
        ...row,
        orderSourceCompanyId: company._id,
        sender: {
          postalCode: (company as any).senderPostalCode || '',
          prefecture: (company as any).senderAddressPrefecture || '',
          city: (company as any).senderAddressCity || '',
          street: (company as any).senderAddressStreet || '',
          building: (company as any).senderAddressBuilding || '',
          name: company.senderName || '',
          phone: (company as any).senderPhone || '',
        },
        carrierData: { ...row.carrierData, yamato: newYamato },
        updatedAt: nowIso,
      }
    })
    toast.success(`ご依頼主一括設定しました（${changed}件）`)
    state.senderBulkDialogVisible.value = false
    state.senderBulkOverwrite.value = false
  }

  const applyCarrierBulk = () => {
    if (!state.carrierBulkId.value) {
      toast.warning('配送業者を選択してください')
      return
    }
    if (state.selectedRows.value.length === 0) return
    const selectedIds = new Set(state.selectedRows.value.map(r => r.id || r._id))
    const nowIso = new Date().toISOString()
    let changed = 0
    allRows.value = allRows.value.map((row: any) => {
      if (!selectedIds.has(row.id)) return row
      changed++
      return { ...row, carrierId: state.carrierBulkId.value, updatedAt: nowIso }
    })
    toast.success(`配送業者一括設定しました（${changed}件）`)
    state.carrierBulkDialogVisible.value = false
  }

  return { applyShipPlanDate, applySenderBulk, applyCarrierBulk }
}
