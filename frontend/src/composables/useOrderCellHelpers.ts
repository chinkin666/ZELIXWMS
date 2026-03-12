import type { Ref } from 'vue'
import { computed } from 'vue'
import type { Carrier } from '@/types/carrier'
import { getOrderFieldDefinitions } from '@/types/order'

const TIME_SLOT_LABELS: Record<string, string> = {
  '0812': '午前中', '1416': '14-16時', '1618': '16-18時', '1820': '18-20時', '1921': '19-21時',
}

const COOL_TYPE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  '0': { label: '通常', color: '#666', bg: 'transparent' },
  '1': { label: 'クール冷凍', color: '#1d4ed8', bg: '#dbeafe' },
  '2': { label: 'クール冷蔵', color: '#0e7490', bg: '#cffafe' },
}

export function useOrderCellHelpers(carriers: Ref<Carrier[]>) {
  const carrierOptions = computed(() =>
    (carriers.value || []).map((c) => ({ label: c.name, value: c._id })),
  )

  const allFieldDefinitions = computed(() =>
    getOrderFieldDefinitions({ carrierOptions: carrierOptions.value }),
  )

  const getCarrierLabel = (row: any): string => {
    const id = row?.carrierId
    if (!id) return '-'
    const hit = carrierOptions.value.find(opt => String(opt.value) === String(id))
    return hit ? hit.label : String(id)
  }

  const getInvoiceTypeLabel = (row: any): string => {
    const col = (allFieldDefinitions.value || []).find(c => String(c.dataKey) === 'invoiceType')
    const val = row?.invoiceType
    if (!val && val !== '0') return '-'
    if (col?.searchOptions) {
      const hit = col.searchOptions.find(opt => String(opt.value) === String(val))
      if (hit) return hit.label
    }
    return String(val)
  }

  const getTimeSlotLabel = (row: any): string => {
    const val = row?.deliveryTimeSlot
    if (!val) return '時間指定なし'
    return TIME_SLOT_LABELS[val] || val
  }

  const getCoolTypeInfo = (row: any) => {
    const val = row?.coolType
    return COOL_TYPE_MAP[val] || COOL_TYPE_MAP['0']!
  }

  const fmtDateTime = (val?: string): string => {
    if (!val) return '-'
    try { return new Date(val).toLocaleString('ja-JP') } catch { return val }
  }

  const fmtPostal = (val?: string): string => {
    if (!val) return ''
    const d = val.replace(/[^0-9]/g, '')
    return d.length === 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : val
  }

  return {
    carrierOptions,
    allFieldDefinitions,
    getCarrierLabel,
    getInvoiceTypeLabel,
    getTimeSlotLabel,
    getCoolTypeInfo,
    fmtDateTime,
    fmtPostal,
  }
}
