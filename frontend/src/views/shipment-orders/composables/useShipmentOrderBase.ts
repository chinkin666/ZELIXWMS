import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { fetchCarriers } from '@/api/carrier'
import { fetchProducts } from '@/api/product'
import type { Carrier } from '@/types/carrier'
import type { Product } from '@/types/product'
import type { TableColumn, Operator } from '@/types/table'
import type { HeaderGroupingConfig } from '@/components/table/tableHeaderGroup'
import { getOrderFieldDefinitions } from '@/types/order'
import { buildOrderHeaderGroupingConfig } from '@/utils/orderHeaderGrouping'
import { validateCell } from '@/utils/orderValidation'

type SelectOption = { label: string; value: string }
type SearchPayload = Record<string, { operator: Operator; value: any }>

export interface UseShipmentOrderBaseOptions {
  /**
   * Optional transform applied to field definitions after generation.
   * Use this for page-specific overrides (e.g., making trackingId visible).
   */
  fieldOverrides?: (columns: TableColumn[]) => TableColumn[]
  /**
   * When true, tableProps includes cellProps that highlight invalid cells.
   * Default: false.
   */
  enableCellValidation?: boolean
}

export interface UseShipmentOrderBaseReturn {
  carriers: Ref<Carrier[]>
  carrierOptions: ComputedRef<SelectOption[]>
  products: Ref<Product[]>
  loadCarriers: () => Promise<void>
  loadProducts: () => Promise<void>
  allFieldDefinitions: ComputedRef<TableColumn[]>
  baseColumns: ComputedRef<TableColumn[]>
  searchColumns: ComputedRef<TableColumn[]>
  headerGroupingConfig: ComputedRef<HeaderGroupingConfig>
  headerClass: () => string
  globalSearchText: Ref<string>
  currentSearchPayload: Ref<SearchPayload | null>
  updateSearchState: (payload: SearchPayload) => void
  handleSave: (payload: SearchPayload) => void
  tableProps: ComputedRef<Record<string, any>>
}

const SYSTEM_FIELD_KEYS = ['tenantId']

export function useShipmentOrderBase(
  options: UseShipmentOrderBaseOptions = {},
): UseShipmentOrderBaseReturn {
  const { fieldOverrides, enableCellValidation = false } = options
  const { showSuccess, showWarning } = useToast()

  // --- Master data ---

  const carriers = ref<Carrier[]>([])
  const products = ref<Product[]>([])

  const carrierOptions = computed<SelectOption[]>(() =>
    (carriers.value || [])
      .filter((c) => c && c.enabled !== false)
      .map((c) => ({ label: c.name, value: c._id })),
  )

  const loadCarriers = async (): Promise<void> => {
    try {
      carriers.value = await fetchCarriers({ enabled: true })
    } catch (e) {
      console.error(e)
      showWarning('配送業者マスタの取得に失敗しました')
    }
  }

  const loadProducts = async (): Promise<void> => {
    try {
      products.value = await fetchProducts()
    } catch (e) {
      console.error('Failed to load products:', e)
    }
  }

  // --- Field definitions ---

  const allFieldDefinitions = computed<TableColumn[]>(() => {
    const base = getOrderFieldDefinitions({ carrierOptions: carrierOptions.value })
    return fieldOverrides ? fieldOverrides(base) : base
  })

  const baseColumns = computed<TableColumn[]>(() =>
    allFieldDefinitions.value.filter(
      (col) => col.tableVisible !== false && !SYSTEM_FIELD_KEYS.includes(col.key),
    ),
  )

  const searchColumns = computed<TableColumn[]>(() =>
    allFieldDefinitions.value.filter((col) => col.searchType !== undefined),
  )

  // --- Header grouping ---

  const headerGroupingConfig = computed<HeaderGroupingConfig>(() =>
    buildOrderHeaderGroupingConfig(baseColumns.value as any),
  )

  const headerClass = (): string => ''

  // --- Search state ---

  const globalSearchText = ref<string>('')
  const currentSearchPayload = ref<SearchPayload | null>(null)

  const updateSearchState = (payload: SearchPayload): void => {
    const nextPayload = { ...payload }
    const keyword = (nextPayload as any)?.__global?.value
    globalSearchText.value = keyword ? String(keyword) : ''
    delete (nextPayload as any).__global
    currentSearchPayload.value = nextPayload
  }

  // --- Save (dummy) ---

  const handleSave = (_payload: SearchPayload): void => {
    showSuccess('検索条件を保存しました（ダミー）')
  }

  // --- Table props ---

  const tableProps = computed<Record<string, any>>(() => {
    if (!enableCellValidation) return {}
    return {
      cellProps: ({ rowData, column }: { rowData: any; column: any }) => {
        const columnConfig = baseColumns.value.find(
          (col) => col.key === column.key || col.dataKey === column.key,
        )
        if (!columnConfig) return {}
        const hasError = !validateCell(rowData, columnConfig)
        return hasError
          ? { class: 'error-cell', style: { backgroundColor: '#ffebee' } }
          : {}
      },
    }
  })

  return {
    carriers,
    carrierOptions,
    products,
    loadCarriers,
    loadProducts,
    allFieldDefinitions,
    baseColumns,
    searchColumns,
    headerGroupingConfig,
    headerClass,
    globalSearchText,
    currentSearchPayload,
    updateSearchState,
    handleSave,
    tableProps,
  }
}
