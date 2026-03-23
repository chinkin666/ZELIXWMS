import { toast } from 'vue-sonner'
import { watch } from 'vue'
import { getAllMappingConfigs } from '@/api/mappingConfig'
import { applyTransformMappings } from '@/utils/transformRunner'
import { formatOrderProductsText } from '@/utils/formatOrderProductsText'
import { getNestedValue } from '@/utils/nestedObject'
import type { MappingConfig } from '@/api/mappingConfig'
import type { V2State } from './useV2State'

export function useV2CarrierExport(state: V2State) {
  const normalizeOrderValueForExport = (sourcePath: string, raw: any): any => {
    if (sourcePath === 'products') {
      if (Array.isArray(raw)) return formatOrderProductsText(raw)
      if (raw && typeof raw === 'object') return formatOrderProductsText([raw])
    }
    return raw
  }

  const buildFlatRowForMappings = (order: any, mappings: MappingConfig['mappings']): Record<string, any> => {
    const flat: Record<string, any> = {}
    for (const m of mappings || []) {
      for (const input of (m as any)?.inputs || []) {
        if (input?.type !== 'column') continue
        const col = String(input.column || '')
        if (!col || col in flat) continue
        const raw = getNestedValue(order as any, col)
        flat[col] = normalizeOrderValueForExport(col, raw)
      }
    }
    return flat
  }

  const rebuildCarrierExportRows = async () => {
    const mappingId = state.carrierExportSelectedMappingId.value
    const cfg = state.carrierExportMappingConfigsById.value.get(String(mappingId || ''))
    if (!cfg) { state.carrierExportOutputRows.value = []; return }
    const headers = state.carrierExportHeaders.value
    const out = await Promise.all(
      state.carrierExportSourceOrders.value.map(async (order: any) => {
        const flatRow = buildFlatRowForMappings(order, cfg.mappings || [])
        const mapped = await applyTransformMappings(cfg.mappings || [], flatRow, { meta: { row: flatRow } })
        const row: Record<string, any> = {}
        for (const h of headers) row[h] = mapped?.[h] ?? ''
        return row
      }),
    )
    state.carrierExportOutputRows.value = out
  }

  const handleCarrierExport = async () => {
    if (state.selectedRows.value.length === 0) return

    const carrierIdSet = new Set(state.selectedRows.value.map((r) => String(r.carrierId || '')).filter(Boolean))
    if (carrierIdSet.size !== 1) {
      toast.warning('選択した行の配送業者が一致しません。配送業者ごとに出力してください。')
      return
    }

    const carrierId = Array.from(carrierIdSet)[0]!
    const carrier = state.carriers.value.find((c) => c._id === carrierId)
    if (!carrier) { toast.error('配送業者情報が見つかりません'); return }

    const headers = ((carrier as any).formatDefinition?.columns || []).map((c: any) => c.name).filter(Boolean)
    state.carrierExportHeaders.value = headers
    state.carrierExportSourceOrders.value = state.selectedRows.value

    try {
      const all = await getAllMappingConfigs('order-to-carrier')
      const filtered = (all || []).filter((c) => c?.configType === 'order-to-carrier' && c?.carrierCode === String((carrier as any).code || ''))
      filtered.sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault) || a.name.localeCompare(b.name))
      state.carrierExportMappingConfigsById.value = new Map(filtered.map((c) => [c._id, c]))
      state.carrierExportMappingOptions.value = filtered.map((c) => ({ label: `${c.name}${c.isDefault ? ' (default)' : ''}`, value: c._id }))

      if (!state.carrierExportMappingOptions.value.length) {
        toast.warning('この配送業者に出力レイアウトが未設定です（レイアウト設定で作成してください）。')
        return
      }

      state.carrierExportSelectedMappingId.value = state.carrierExportMappingOptions.value[0]!.value
      const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      state.carrierExportCarrierLabel.value = `${carrier.name} (${(carrier as any).code})`
      state.carrierExportFileNameBase.value = `${(carrier as any).code || 'carrier'}_${ymd}`
      await rebuildCarrierExportRows()
      state.carrierExportDialogVisible.value = true
    } catch (e: any) {
      toast.error(e?.message || '配送業者データ出力に失敗しました')
    }
  }

  // Watch mapping selection change
  watch(state.carrierExportSelectedMappingId, async () => {
    if (!state.carrierExportDialogVisible.value) return
    try { await rebuildCarrierExportRows() } catch (e: any) { toast.error(e?.message || '出力レイアウトの適用に失敗しました') }
  })

  return { handleCarrierExport }
}
