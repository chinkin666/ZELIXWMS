import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import type { Carrier } from '@/types/carrier'
import { getAllMappingConfigs, type MappingConfig } from '@/api/mappingConfig'
import { applyTransformMappings } from '@/utils/transformRunner'
import { formatOrderProductsText } from '@/utils/formatOrderProductsText'
import { getNestedValue } from '@/utils/nestedObject'

export function useOrderCarrierExport(
  pendingWaybillRows: Ref<UserOrderRow[]>,
  carriers: Ref<Carrier[]>,
  tableSelectedKeys: Ref<(string | number)[]>,
  toast: { showWarning: (msg: string) => void; showError: (msg: string) => void },
) {
  const carrierExportDialogVisible = ref(false)
  const carrierExportCarrierLabel = ref('')
  const carrierExportFileNameBase = ref('')
  const carrierExportHeaders = ref<string[]>([])
  const carrierExportOutputRows = ref<Array<Record<string, any>>>([])
  const carrierExportMappingOptions = ref<Array<{ label: string; value: string }>>([])
  const carrierExportSelectedMappingId = ref<string>('')
  const carrierExportMappingConfigsById = ref<Map<string, MappingConfig>>(new Map())
  const carrierExportSourceOrders = ref<any[]>([])

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
    const mappingId = carrierExportSelectedMappingId.value
    const cfg = carrierExportMappingConfigsById.value.get(String(mappingId || ''))
    if (!cfg) { carrierExportOutputRows.value = []; return }
    const headers = carrierExportHeaders.value
    const out = await Promise.all(
      carrierExportSourceOrders.value.map(async (order: any) => {
        const flatRow = buildFlatRowForMappings(order, cfg.mappings || [])
        const mapped = await applyTransformMappings(cfg.mappings || [], flatRow, { meta: { row: flatRow } })
        const row: Record<string, any> = {}
        for (const h of headers) row[h] = mapped?.[h] ?? ''
        return row
      }),
    )
    carrierExportOutputRows.value = out
  }

  const handleCarrierExport = async () => {
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
    if (!carrier) { toast.showError('配送業者情報が見つかりません'); return }

    const headers = (carrier.formatDefinition?.columns || []).map((c: any) => c.name).filter(Boolean)
    carrierExportHeaders.value = headers
    carrierExportSourceOrders.value = selectedRows

    try {
      const all = await getAllMappingConfigs('order-to-carrier')
      const filtered = (all || []).filter((c) => c?.configType === 'order-to-carrier' && c?.carrierCode === String(carrier.code || ''))
      filtered.sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault) || a.name.localeCompare(b.name))
      carrierExportMappingConfigsById.value = new Map(filtered.map((c) => [c._id, c]))
      carrierExportMappingOptions.value = filtered.map((c) => ({ label: `${c.name}${c.isDefault ? ' (default)' : ''}`, value: c._id }))

      if (!carrierExportMappingOptions.value.length) {
        toast.showWarning('この配送業者に出力レイアウトが未設定です（レイアウト設定で作成してください）。')
        return
      }

      carrierExportSelectedMappingId.value = carrierExportMappingOptions.value[0]!.value
      const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      carrierExportCarrierLabel.value = `${carrier.name} (${carrier.code})`
      carrierExportFileNameBase.value = `${carrier.code || 'carrier'}_${ymd}`
      await rebuildCarrierExportRows()
      carrierExportDialogVisible.value = true
    } catch (e: any) {
      toast.showError(e?.message || '配送業者データ出力に失敗しました')
    }
  }

  // Watch mapping selection changes
  watch(carrierExportSelectedMappingId, async () => {
    if (!carrierExportDialogVisible.value) return
    try { await rebuildCarrierExportRows() } catch (e: any) { toast.showError(e?.message || '出力レイアウトの適用に失敗しました') }
  })

  return {
    carrierExportDialogVisible,
    carrierExportCarrierLabel,
    carrierExportFileNameBase,
    carrierExportHeaders,
    carrierExportOutputRows,
    carrierExportMappingOptions,
    carrierExportSelectedMappingId,
    handleCarrierExport,
  }
}
