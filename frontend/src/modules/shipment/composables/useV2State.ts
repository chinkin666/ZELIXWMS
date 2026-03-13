import { ref } from 'vue'
import type { TableInstance } from 'element-plus'
import type { Carrier } from '@/types/carrier'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import type { Product } from '@/types/product'
import type { YamatoB2ValidateResult, YamatoB2ExportResult } from '@/types/carrierAutomation'
import type { MappingConfig } from '@/api/mappingConfig'

export type TabName = 'pending_confirm' | 'processing' | 'pending_waybill' | 'held'

export function useV2State() {
  // Core
  const globalSearchText = ref('')
  const activeTab = ref<TabName>('pending_confirm')
  const loading = ref(false)
  const tableRef = ref<TableInstance>()
  const selectedRows = ref<any[]>([])
  const currentPage = ref(1)
  const pageSize = ref(100)
  const tableHeight = ref(600)

  // Data
  const backendRows = ref<any[]>([])
  const carriers = ref<Carrier[]>([])
  const orderSourceCompanies = ref<OrderSourceCompany[]>([])
  const products = ref<Product[]>([])

  // Edit dialog
  const showEditDialog = ref(false)
  const showImportDialog = ref(false)
  const showCarrierImportDialog = ref(false)
  const editingRow = ref<any>(null)

  // Submit
  const isSubmitting = ref(false)
  const submitErrorDialogVisible = ref(false)
  const submitErrors = ref<Array<{ clientId?: string; field?: string; message: string }>>([])

  // Delete
  const deleteDialogVisible = ref(false)
  const deleteDialogMessage = ref('')
  const deleteTarget = ref<{
    type: 'local' | 'backend' | 'mixed'
    localIds: (string | number)[]
    backendIds: string[]
  } | null>(null)

  // B2 Cloud validate
  const b2Validating = ref(false)
  const b2ValidateDialogVisible = ref(false)
  const b2ValidateResult = ref<YamatoB2ValidateResult | null>(null)
  const b2PendingConfirmIds = ref<string[]>([])
  const b2PendingB2OrderIds = ref<string[]>([])
  const b2ValidateOrderMap = ref<Map<number, string>>(new Map())
  const b2ApiErrorDialogVisible = ref(false)
  const b2ApiErrorMessage = ref('')
  const b2ValidationErrors = ref<Map<string, string[]>>(new Map())
  const isAutoValidating = ref(false)

  // B2 Cloud export
  const b2Exporting = ref(false)
  const b2ExportResultDialogVisible = ref(false)
  const b2ExportResult = ref<YamatoB2ExportResult | null>(null)

  // Bulk settings
  const shipPlanDateDialogVisible = ref(false)
  const shipPlanDateSelected = ref<string>('')
  const senderBulkDialogVisible = ref(false)
  const senderBulkCompanyId = ref<string>('')
  const senderBulkOverwrite = ref(false)
  const carrierBulkDialogVisible = ref(false)
  const carrierBulkId = ref<string>('')

  // Carrier export
  const carrierExportDialogVisible = ref(false)
  const carrierExportCarrierLabel = ref('')
  const carrierExportFileNameBase = ref('')
  const carrierExportHeaders = ref<string[]>([])
  const carrierExportOutputRows = ref<Array<Record<string, any>>>([])
  const carrierExportMappingOptions = ref<Array<{ label: string; value: string }>>([])
  const carrierExportSelectedMappingId = ref<string>('')
  const carrierExportMappingConfigsById = ref<Map<string, MappingConfig>>(new Map())
  const carrierExportSourceOrders = ref<any[]>([])

  // Bundle mode
  const bundleModeEnabled = ref(false)
  const bundleFilterKeys = ref<string[]>([])
  const showBundleFilterDialog = ref(false)

  return {
    globalSearchText, activeTab, loading, tableRef, selectedRows, currentPage, pageSize, tableHeight,
    backendRows, carriers, orderSourceCompanies, products,
    showEditDialog, showImportDialog, showCarrierImportDialog, editingRow,
    isSubmitting, submitErrorDialogVisible, submitErrors,
    deleteDialogVisible, deleteDialogMessage, deleteTarget,
    b2Validating, b2ValidateDialogVisible, b2ValidateResult,
    b2PendingConfirmIds, b2PendingB2OrderIds, b2ValidateOrderMap,
    b2ApiErrorDialogVisible, b2ApiErrorMessage, b2ValidationErrors, isAutoValidating,
    b2Exporting, b2ExportResultDialogVisible, b2ExportResult,
    shipPlanDateDialogVisible, shipPlanDateSelected,
    senderBulkDialogVisible, senderBulkCompanyId, senderBulkOverwrite,
    carrierBulkDialogVisible, carrierBulkId,
    carrierExportDialogVisible, carrierExportCarrierLabel, carrierExportFileNameBase,
    carrierExportHeaders, carrierExportOutputRows, carrierExportMappingOptions,
    carrierExportSelectedMappingId, carrierExportMappingConfigsById, carrierExportSourceOrders,
    bundleModeEnabled, bundleFilterKeys, showBundleFilterDialog,
  }
}

export type V2State = ReturnType<typeof useV2State>
