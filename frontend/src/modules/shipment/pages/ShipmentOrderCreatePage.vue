<template>
  <div class="shipment-create-v2">
    <V2PageHeader
      :active-tab="state.activeTab.value"
      v-model:global-search-text="state.globalSearchText.value"
      :bundle-mode-enabled="state.bundleModeEnabled.value"
      @open-bundle-mode="bundle.handleOpenBundleMode"
      @exit-bundle-mode="bundle.handleExitBundleMode"
      @import-click="formActions.handleImportClick"
      @add-click="formActions.handleAdd"
      @show-carrier-import="state.showCarrierImportDialog.value = true"
    />

    <V2StatsCards
      v-model:active-tab="state.activeTab.value"
      :pending-confirm-count="counts.pendingConfirmCount.value"
      :processing-count="counts.processingCount.value"
      :pending-waybill-count="counts.pendingWaybillCount.value"
      :held-count="counts.heldCount.value"
    />

    <V2BundleBar
      v-if="state.bundleModeEnabled.value && state.activeTab.value === 'pending_confirm'"
      :bundle-filter-labels="bundle.bundleFilterLabels.value"
      :selected-count="state.selectedRows.value.length"
      :has-unbundleable-rows="bundle.hasUnbundleableRows.value"
      @open-filter="state.showBundleFilterDialog.value = true"
      @merge="bundle.handleBundleMerge"
      @unbundle="bundle.handleUnbundle"
    />

    <el-card shadow="never" class="table-card">
      <V2BatchActionBar
        :selected-count="state.selectedRows.value.length"
        :active-tab="state.activeTab.value"
        :is-submitting="state.isSubmitting.value"
        :b2-validating="state.b2Validating.value"
        :is-auto-validating="state.isAutoValidating.value"
        :b2-exporting="state.b2Exporting.value"
        @bulk-ship-plan-date="state.shipPlanDateDialogVisible.value = true"
        @bulk-sender="state.senderBulkDialogVisible.value = true"
        @bulk-carrier="state.carrierBulkDialogVisible.value = true"
        @hold="holdDelete.handleHold"
        @delete="holdDelete.handleDelete"
        @submit="submit.handleSubmit"
        @delete-backend="holdDelete.handleDeleteBackend"
        @confirm-print-ready="b2Validation.handleConfirmPrintReady"
        @b2-export="b2Export.handleB2Export"
        @carrier-export="carrierExport.handleCarrierExport"
        @hold-backend="holdDelete.handleHoldBackend"
        @unconfirm="holdDelete.handleUnconfirm"
        @release-hold="holdDelete.handleReleaseHold"
        @delete-held="holdDelete.handleDeleteHeld"
      />

      <V2OrderTable
        ref="orderTableRef"
        :paginated-rows="counts.paginatedRows.value"
        :loading="state.loading.value"
        :table-height="state.tableHeight.value"
        :active-tab="state.activeTab.value"
        v-model:current-page="state.currentPage.value"
        v-model:page-size="state.pageSize.value"
        :filtered-rows-total="counts.filteredRows.value.length"
        :b2-validation-errors="state.b2ValidationErrors.value"
        :get-row-class-name="validation.getRowClassName"
        :has-frontend-row-errors="validation.hasFrontendRowErrors"
        :is-held="statusHelpers.isHeld"
        :has-delivery-spec="statusHelpers.hasDeliverySpec"
        :is-okinawa="statusHelpers.isOkinawa"
        :is-remote-island="statusHelpers.isRemoteIsland"
        :get-carrier-label="labels.getCarrierLabel"
        :get-invoice-type-label="labels.getInvoiceTypeLabel"
        :get-cool-type-label="labels.getCoolTypeLabel"
        :get-cool-type-color="labels.getCoolTypeColor"
        :get-time-slot-label="labels.getTimeSlotLabel"
        @selection-change="handleSelectionChange"
        @edit-row="formActions.handleEdit"
      />
    </el-card>

    <V2DialogSection
      v-model:show-edit-dialog="state.showEditDialog.value"
      :editing-row="state.editingRow.value"
      :form-columns="counts.formColumns.value"
      v-model:show-import-dialog="state.showImportDialog.value"
      :order-source-companies="state.orderSourceCompanies.value"
      :carriers="state.carriers.value"
      v-model:show-carrier-import-dialog="state.showCarrierImportDialog.value"
      v-model:b2-validate-dialog-visible="state.b2ValidateDialogVisible.value"
      :b2-validate-result="state.b2ValidateResult.value"
      :b2-validate-order-map="state.b2ValidateOrderMap.value"
      v-model:b2-api-error-dialog-visible="state.b2ApiErrorDialogVisible.value"
      :b2-api-error-message="state.b2ApiErrorMessage.value"
      v-model:b2-export-result-dialog-visible="state.b2ExportResultDialogVisible.value"
      :b2-export-result="state.b2ExportResult.value"
      v-model:show-bundle-filter-dialog="state.showBundleFilterDialog.value"
      :bundle-filter-fields="bundle.bundleFilterFields.value"
      :bundle-filter-keys="state.bundleFilterKeys.value"
      v-model:carrier-export-dialog-visible="state.carrierExportDialogVisible.value"
      :carrier-export-carrier-label="state.carrierExportCarrierLabel.value"
      :carrier-export-mapping-options="state.carrierExportMappingOptions.value"
      v-model:carrier-export-selected-mapping-id="state.carrierExportSelectedMappingId.value"
      :carrier-export-headers="state.carrierExportHeaders.value"
      :carrier-export-output-rows="state.carrierExportOutputRows.value"
      :carrier-export-file-name-base="state.carrierExportFileNameBase.value"
      v-model:ship-plan-date-dialog-visible="state.shipPlanDateDialogVisible.value"
      v-model:ship-plan-date-selected="state.shipPlanDateSelected.value"
      v-model:sender-bulk-dialog-visible="state.senderBulkDialogVisible.value"
      v-model:sender-bulk-company-id="state.senderBulkCompanyId.value"
      v-model:sender-bulk-overwrite="state.senderBulkOverwrite.value"
      v-model:carrier-bulk-dialog-visible="state.carrierBulkDialogVisible.value"
      v-model:carrier-bulk-id="state.carrierBulkId.value"
      v-model:delete-dialog-visible="state.deleteDialogVisible.value"
      :delete-dialog-message="state.deleteDialogMessage.value"
      v-model:submit-error-dialog-visible="state.submitErrorDialogVisible.value"
      :submit-errors="state.submitErrors.value"
      :selected-count="state.selectedRows.value.length"
      @form-submit="formActions.handleFormSubmit"
      @import="formActions.handleImport"
      @carrier-imported="dataLoading.loadBackendOrders"
      @b2-validate-cancel="b2Validation.handleB2ValidateDialogCancel"
      @b2-validate-confirm="b2Validation.handleB2ValidateDialogConfirm"
      @b2-export-result-close="b2Export.handleB2ExportResultClose"
      @bundle-filter-update="bundle.handleBundleFilterUpdate"
      @bundle-filter-save="bundle.handleBundleFilterSave"
      @apply-ship-plan-date="bulkSettings.applyShipPlanDate"
      @apply-sender-bulk="bulkSettings.applySenderBulk"
      @apply-carrier-bulk="bulkSettings.applyCarrierBulk"
      @confirm-delete="holdDelete.confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

// Layout Components
import V2PageHeader from '../components/V2PageHeader.vue'
import V2StatsCards from '../components/V2StatsCards.vue'
import V2BundleBar from '../components/V2BundleBar.vue'
import V2BatchActionBar from '../components/V2BatchActionBar.vue'
import V2OrderTable from '../components/V2OrderTable.vue'
import V2DialogSection from '../components/V2DialogSection.vue'

// Composables
import { useV2State } from '../composables/useV2State'
import { useV2DataLoading } from '../composables/useV2DataLoading'
import { useV2Labels } from '../composables/useV2Labels'
import { useV2StatusHelpers } from '../composables/useV2StatusHelpers'
import { useV2Counts } from '../composables/useV2Counts'
import { useV2ProductDefaults } from '../composables/useV2ProductDefaults'
import { useV2Validation } from '../composables/useV2Validation'
import { validateCell } from '@/utils/orderValidation'
import { useV2FormActions } from '../composables/useV2FormActions'
import { useV2Submit } from '../composables/useV2Submit'
import { useV2HoldDelete } from '../composables/useV2HoldDelete'
import { useV2B2Validation } from '../composables/useV2B2Validation'
import { useV2B2Export } from '../composables/useV2B2Export'
import { useV2BulkSettings } from '../composables/useV2BulkSettings'
import { useV2CarrierExport } from '../composables/useV2CarrierExport'
import { useV2Bundle } from '../composables/useV2Bundle'

// --- Wire composables ---
const state = useV2State()
const dataLoading = useV2DataLoading(state)
const labels = useV2Labels(state.carriers)
const counts = useV2Counts(state)
const statusHelpers = useV2StatusHelpers(counts.heldRowIds)
const productDefaults = useV2ProductDefaults(counts.productMap)

const validation = useV2Validation(
  counts.formColumns,
  state.activeTab,
  state.b2ValidationErrors,
  statusHelpers.isHeld,
  (row: any) => counts.formColumns.value.some((col) => !validateCell(row, col)),
)

const formActions = useV2FormActions({
  state,
  draftStore: counts.draftStore,
  applyProductDefaults: productDefaults.applyProductDefaults,
  normalizeAddress: productDefaults.normalizeAddress,
  loadBackendOrders: dataLoading.loadBackendOrders,
})

const b2Validation = useV2B2Validation({ state, loadBackendOrders: dataLoading.loadBackendOrders })

const submit = useV2Submit({
  state,
  draftStore: counts.draftStore,
  allRows: counts.allRows,
  hasFrontendRowErrors: validation.hasFrontendRowErrors,
  loadBackendOrders: dataLoading.loadBackendOrders,
  autoValidateProcessingOrders: b2Validation.autoValidateProcessingOrders,
})

const holdDelete = useV2HoldDelete({
  state,
  draftStore: counts.draftStore,
  heldRowIds: counts.heldRowIds,
  allRows: counts.allRows,
  loadBackendOrders: dataLoading.loadBackendOrders,
})

const b2Export = useV2B2Export({ state, loadBackendOrders: dataLoading.loadBackendOrders })

const bulkSettings = useV2BulkSettings({ state, allRows: counts.allRows })

const carrierExport = useV2CarrierExport(state)

const bundle = useV2Bundle({
  state,
  allRows: counts.allRows,
  draftNonHeldRows: counts.draftNonHeldRows,
})

// --- Table ref & selection ---
const orderTableRef = ref<InstanceType<typeof V2OrderTable>>()

const handleSelectionChange = (rows: any[]) => {
  state.selectedRows.value = rows
}

// --- Lifecycle ---
onMounted(() => {
  counts.draftStore.loadFromStorage()
  dataLoading.loadCarriers()
  dataLoading.loadBackendOrders()
  dataLoading.loadOrderSourceCompanies()
  dataLoading.loadProducts()
  bundle.restoreBundleFromCookies()

  const updateHeight = () => {
    state.tableHeight.value = Math.max(400, window.innerHeight - 340)
  }
  updateHeight()
  window.addEventListener('resize', updateHeight)
})

onBeforeUnmount(() => {
  b2Validation.cleanupAutoValidate()
})
</script>

<style scoped>
.shipment-create-v2 {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.table-card {
  border-radius: 8px;
}
.table-card :deep(.el-card__body) {
  padding: 0;
}
</style>
