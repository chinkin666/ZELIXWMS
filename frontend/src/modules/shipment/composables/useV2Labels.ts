import type { Ref } from 'vue'
import type { Carrier } from '@/types/carrier'

export const INVOICE_TYPE_LABELS: Record<string, string> = {
  '0': '発払い', '1': 'EAZY', '2': 'コレクト', '3': 'クロネコゆうメール',
  '4': 'タイム', '5': '着払い', '6': '発払い複数口', '7': 'クロネコゆうパケット',
  '8': '宅急便コンパクト', '9': 'コンパクトコレクト', 'A': 'ネコポス',
}

export const COOL_TYPE_MAP: Record<string, { label: string; color: string }> = {
  '0': { label: '通常', color: '#666' },
  '1': { label: 'クール冷凍', color: '#1d4ed8' },
  '2': { label: 'クール冷蔵', color: '#0e7490' },
}

export const TIME_SLOT_LABELS: Record<string, string> = {
  '0812': '午前中', '1416': '14-16時', '1618': '16-18時',
  '1820': '18-20時', '1921': '19-21時',
}

export function useV2Labels(carriers: Ref<Carrier[]>) {
  const getCarrierLabel = (row: any) => {
    const c = carriers.value.find(c => c._id === row.carrierId)
    return c?.name || '-'
  }

  const getInvoiceTypeLabel = (row: any) =>
    INVOICE_TYPE_LABELS[row.invoiceType] || row.invoiceType || '-'

  const getCoolTypeLabel = (row: any) =>
    COOL_TYPE_MAP[row.coolType]?.label || '通常'

  const getCoolTypeColor = (row: any) =>
    COOL_TYPE_MAP[row.coolType]?.color || '#666'

  const getTimeSlotLabel = (slot?: string) =>
    slot ? (TIME_SLOT_LABELS[slot] || slot) : '-'

  return { getCarrierLabel, getInvoiceTypeLabel, getCoolTypeLabel, getCoolTypeColor, getTimeSlotLabel }
}
