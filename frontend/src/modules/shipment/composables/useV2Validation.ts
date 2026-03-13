import type { ComputedRef, Ref } from 'vue'
import { validateCell, validateDeliveryDate, validateAddressFields } from '@/utils/orderValidation'
import type { TabName } from './useV2State'

export function useV2Validation(
  formColumns: ComputedRef<any[]>,
  activeTab: Ref<TabName>,
  b2ValidationErrors: Ref<Map<string, string[]>>,
  isHeld: (row: any) => boolean,
  hasFrontendRowErrors: (row: any) => boolean,
) {
  const getRowValidationErrors = (row: any): string[] => {
    const messages: string[] = []
    const deliveryErr = validateDeliveryDate(row)
    if (deliveryErr) messages.push(deliveryErr)
    messages.push(...validateAddressFields(row))
    return messages
  }

  const checkFrontendRowErrors = (row: any): boolean => {
    return formColumns.value.some((col) => !validateCell(row, col))
  }

  const getRowClassName = ({ row }: { row: any }) => {
    if (row._validationError) return 'row--error'
    if (activeTab.value === 'pending_confirm' && hasFrontendRowErrors(row)) return 'row--error'
    if (b2ValidationErrors.value.has(String(row._id || row.id))) return 'row--error'
    if (isHeld(row)) return 'row--held'
    return ''
  }

  return { getRowValidationErrors, hasFrontendRowErrors: checkFrontendRowErrors, getRowClassName }
}
