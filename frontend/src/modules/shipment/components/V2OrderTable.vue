<template>
  <WmsDataTable
    ref="wmsTableRef"
    :columns="columns"
    :data="paginatedRows"
    :height="tableHeight"
    :row-class-name="getRowClassName"
    :selectable="true"
    :pagination="true"
    :total="filteredRowsTotal"
    :page-sizes="[50, 100, 200, 500]"
    v-model:current-page="currentPageModel"
    v-model:page-size="pageSizeModel"
    v-loading="loading"
    stripe
    border
    style="width: 100%"
    @selection-change="$emit('selection-change', $event)"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { WmsDataTable } from '@/core/datatable'
import { createShipmentColumns, type ShipmentColumnDeps } from '../columns'

const props = defineProps<{
  paginatedRows: any[]
  loading: boolean
  tableHeight: number
  activeTab: string
  currentPage: number
  pageSize: number
  filteredRowsTotal: number
  b2ValidationErrors: Map<string, string[]>
  getRowClassName: (args: { row: any }) => string
  hasFrontendRowErrors: (row: any) => boolean
  isHeld: (row: any) => boolean
  hasDeliverySpec: (row: any) => boolean
  isOkinawa: (row: any) => boolean
  isRemoteIsland: (row: any) => boolean
  getCarrierLabel: (row: any) => string
  getInvoiceTypeLabel: (row: any) => string
  getCoolTypeLabel: (row: any) => string
  getCoolTypeColor: (row: any) => string
  getTimeSlotLabel: (slot?: string) => string
}>()

const emit = defineEmits<{
  'selection-change': [rows: any[]]
  'edit-row': [row: any]
  'update:currentPage': [page: number]
  'update:pageSize': [size: number]
}>()

const currentPageModel = defineModel<number>('currentPage', { default: 1 })
const pageSizeModel = defineModel<number>('pageSize', { default: 50 })

/** 列定義（依存関数を注入） */
const columns = computed(() => {
  const deps: ShipmentColumnDeps = {
    activeTab: () => props.activeTab,
    hasFrontendRowErrors: props.hasFrontendRowErrors,
    b2ValidationErrors: () => props.b2ValidationErrors,
    isHeld: props.isHeld,
    hasDeliverySpec: props.hasDeliverySpec,
    isOkinawa: props.isOkinawa,
    isRemoteIsland: props.isRemoteIsland,
    getCarrierLabel: props.getCarrierLabel,
    getInvoiceTypeLabel: props.getInvoiceTypeLabel,
    getCoolTypeLabel: props.getCoolTypeLabel,
    getCoolTypeColor: props.getCoolTypeColor,
    getTimeSlotLabel: props.getTimeSlotLabel,
    onEditRow: (row) => emit('edit-row', row),
  }
  return createShipmentColumns(deps)
})

const wmsTableRef = ref<InstanceType<typeof WmsDataTable>>()

defineExpose({
  tableRef: computed(() => wmsTableRef.value?.tableRef),
})
</script>

<style scoped>
:deep(.wms-pagination) {
  border-top: 1px solid #ebeef5;
}

:deep(.row--error) {
  --el-table-tr-bg-color: #fef0f0;
}

:deep(.el-table .cell) {
  padding: 4px 8px;
  font-size: 13px;
}
:deep(.el-table th .cell) {
  font-weight: 600;
  font-size: 12px;
}
</style>
