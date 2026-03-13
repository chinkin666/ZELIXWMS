import type { Ref } from 'vue'

export function useV2StatusHelpers(heldRowIds: Ref<(string | number)[]>) {
  const isHeld = (row: any): boolean => {
    const id = row._id || row.id
    if (heldRowIds.value.includes(id)) return true
    return !!row.status?.held?.isHeld
  }

  const hasDeliverySpec = (row: any): boolean => {
    const pref = row.deliveryDatePreference
    const slot = row.deliveryTimeSlot
    return (!!pref && pref !== '最短日' && pref !== '') || !!slot
  }

  const isOkinawa = (row: any): boolean => {
    const pref = row.recipient?.prefecture
    return pref === '沖縄' || pref === '沖縄県'
  }

  const isRemoteIsland = (row: any): boolean => {
    if (isOkinawa(row)) return false
    const postal = row.recipient?.postalCode?.replace(/[^0-9]/g, '')
    if (!postal) return false
    const prefixes = ['10001', '10002', '10004', '952', '685', '817', '8115', '853', '8574', '891', '89009']
    return prefixes.some(p => postal.startsWith(p))
  }

  return { isHeld, hasDeliverySpec, isOkinawa, isRemoteIsland }
}
