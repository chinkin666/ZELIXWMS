import { ref } from 'vue'
import type { Ref } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import type { useToast } from '@/composables/useToast'

export function useOrderBulkActions(
  allRows: Ref<UserOrderRow[]>,
  tableSelectedKeys: Ref<Array<string | number>>,
  orderSourceCompanies: Ref<OrderSourceCompany[]>,
  saveStorage: (rows: UserOrderRow[], heldIds: (string | number)[]) => void,
  heldRowIds: Ref<(string | number)[]>,
  toast: ReturnType<typeof useToast>,
) {
  // ご依頼主一括設定
  const senderBulkDialogVisible = ref(false)
  const senderBulkCompanyId = ref<string | null>(null)
  const senderBulkOverwriteBaseNo = ref(false)

  // 配送業者一括設定
  const carrierBulkDialogVisible = ref(false)
  const carrierBulkId = ref<string | null>(null)

  // 出荷予定日一括設定
  const shipPlanDateDialogVisible = ref(false)
  const shipPlanDateSelected = ref<string>('')
  const todayDate = new Date().toISOString().slice(0, 10)

  // 出荷予定日を選択行に一括設定
  const applyShipPlanDateToSelected = () => {
    if (!tableSelectedKeys.value.length) {
      toast.showWarning('左側のチェックで編集対象の行を選択してください')
      return
    }
    if (!shipPlanDateSelected.value) {
      toast.showWarning('出荷予定日を選択してください')
      return
    }

    const keySet = new Set(tableSelectedKeys.value)
    const nowIso = new Date().toISOString()
    let changed = 0

    // イミュータブルパターン：map で新しい配列・オブジェクトを生成
    allRows.value = allRows.value.map(row => {
      if (!keySet.has(row.id)) return row
      changed++
      return { ...row, shipPlanDate: shipPlanDateSelected.value, updatedAt: nowIso }
    })

    saveStorage(allRows.value, heldRowIds.value)
    toast.showSuccess(`出荷予定日を${shipPlanDateSelected.value}に設定しました（${changed}件）`)
    shipPlanDateDialogVisible.value = false
  }

  // ご依頼主を選択行に一括設定
  const applySenderBulkCompany = () => {
    if (!senderBulkCompanyId.value) {
      toast.showWarning('ご依頼主を選択してください')
      return
    }
    if (!tableSelectedKeys.value.length) {
      toast.showWarning('左側のチェックで編集対象の行を選択してください')
      return
    }

    const company = orderSourceCompanies.value.find((c) => c._id === senderBulkCompanyId.value) || null
    if (!company) {
      toast.showError('ご依頼主が見つかりません')
      return
    }

    const keySet = new Set(tableSelectedKeys.value)
    const nowIso = new Date().toISOString()
    let changed = 0

    // イミュータブルパターン：ネストした carrierData も展開して新しいオブジェクトを生成
    allRows.value = allRows.value.map(row => {
      if (!keySet.has(row.id)) return row
      changed++

      const existingYamato = row.carrierData?.yamato ?? {}
      const newYamato = senderBulkOverwriteBaseNo.value
        ? {
            ...existingYamato,
            hatsuBaseNo1: company.hatsuBaseNo1 || '',
            hatsuBaseNo2: company.hatsuBaseNo2 || '',
          }
        : {
            ...existingYamato,
            hatsuBaseNo1: existingYamato.hatsuBaseNo1 || company.hatsuBaseNo1 || '',
            hatsuBaseNo2: existingYamato.hatsuBaseNo2 || company.hatsuBaseNo2 || '',
          }

      return {
        ...row,
        orderSourceCompanyId: company._id,
        sender: {
          postalCode: company.senderPostalCode || '',
          prefecture: company.senderAddressPrefecture || '',
          city: company.senderAddressCity || '',
          street: company.senderAddressStreet || '',
          building: (company as any).senderAddressBuilding || '',
          name: company.senderName || '',
          phone: company.senderPhone || '',
        },
        carrierData: { ...row.carrierData, yamato: newYamato },
        updatedAt: nowIso,
      }
    })

    saveStorage(allRows.value, heldRowIds.value)
    toast.showSuccess(`ご依頼主一括設定しました（${changed}件）`)
    senderBulkDialogVisible.value = false
    senderBulkOverwriteBaseNo.value = false
  }

  // 配送業者を選択行に一括設定
  const applyCarrierBulk = () => {
    if (!carrierBulkId.value) {
      toast.showWarning('配送業者を選択してください')
      return
    }
    if (!tableSelectedKeys.value.length) {
      toast.showWarning('左側のチェックで編集対象の行を選択してください')
      return
    }

    const keySet = new Set(tableSelectedKeys.value)
    const nowIso = new Date().toISOString()
    let changed = 0

    allRows.value = allRows.value.map(row => {
      if (!keySet.has(row.id)) return row
      changed++
      return { ...row, carrierId: carrierBulkId.value!, updatedAt: nowIso }
    })

    saveStorage(allRows.value, heldRowIds.value)
    toast.showSuccess(`配送業者一括設定しました（${changed}件）`)
    carrierBulkDialogVisible.value = false
  }

  return {
    senderBulkDialogVisible,
    senderBulkCompanyId,
    senderBulkOverwriteBaseNo,
    carrierBulkDialogVisible,
    carrierBulkId,
    shipPlanDateDialogVisible,
    shipPlanDateSelected,
    todayDate,
    applyShipPlanDateToSelected,
    applySenderBulkCompany,
    applyCarrierBulk,
  }
}
