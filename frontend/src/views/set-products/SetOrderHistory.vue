<template>
  <div class="set-order-history">
    <PageHeader :title="t('wms.setProduct.orderHistory', 'セット組指示履歴')" :show-search="false">
      <template #actions>
        <Button variant="outline" size="sm" @click="exportCsv">{{ t('wms.setProduct.csvDownload', 'CSVダウンロード') }}</Button>
      </template>
    </PageHeader>

      :columns="searchColumns"
      :show-save="false"
      storage-key="setOrderHistorySearch"
      @search="handleSearch"
    />

    <div class="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('wms.setProduct.orderNumber', '指示番号') }}</TableHead>
            <TableHead style="width:70px;">{{ t('wms.setProduct.type', '種別') }}</TableHead>
            <TableHead style="width:120px;">{{ t('wms.setProduct.sku', '品番') }}</TableHead>
            <TableHead style="width:150px;">{{ t('wms.setProduct.name', '名称') }}</TableHead>
            <TableHead style="width:80px;">{{ t('wms.setProduct.orderQuantity', '指示数') }}</TableHead>
            <TableHead style="width:80px;">{{ t('wms.setProduct.completedQuantity', '完成数') }}</TableHead>
            <TableHead style="width:100px;">{{ t('wms.setProduct.stockCategory', '在庫区分') }}</TableHead>
            <TableHead style="width:90px;">{{ t('wms.setProduct.lot', 'ロット') }}</TableHead>
            <TableHead style="width:100px;">{{ t('wms.setProduct.expiryDate', '消費期限') }}</TableHead>
            <TableHead style="width:80px;">{{ t('wms.setProduct.status', 'ステータス') }}</TableHead>
            <TableHead style="width:110px;">{{ t('wms.setProduct.completedDate', '完成日') }}</TableHead>
            <TableHead style="width:110px;">{{ t('wms.setProduct.createdDate', '作成日') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="12">
              <div class="space-y-3 p-4">
                <Skeleton class="h-4 w-[250px] mx-auto" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="orders.length === 0">
            <TableCell colspan="12" class="text-center py-8 text-muted-foreground">{{ t('wms.setProduct.noHistory', '履歴がありません') }}</TableCell>
          </TableRow>
          <TableRow v-for="order in orders" :key="order._id">
            <TableCell><strong>{{ order.orderNumber }}</strong></TableCell>
            <TableCell>
              <span class="type-tag" :class="'type--' + order.type">
                {{ order.type === 'assembly' ? t('wms.setProduct.assemblyType', '組立') : t('wms.setProduct.disassemblyType', 'バラシ') }}
              </span>
            </TableCell>
            <TableCell>{{ order.setSku }}</TableCell>
            <TableCell>{{ order.setName }}</TableCell>
            <TableCell>{{ order.quantity }}</TableCell>
            <TableCell>{{ order.completedQuantity }}</TableCell>
            <TableCell>{{ order.stockCategory || '-' }}</TableCell>
            <TableCell>{{ order.lotNumber || '-' }}</TableCell>
            <TableCell>{{ order.expiryDate ? formatDate(order.expiryDate) : '-' }}</TableCell>
            <TableCell>
              <span class="status-tag" :class="'status--' + order.status">{{ statusLabel(order.status) }}</span>
            </TableCell>
            <TableCell>{{ order.completedAt ? formatDate(order.completedAt) : '-' }}</TableCell>
            <TableCell>{{ formatDate(order.createdAt) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div v-if="totalPages > 1" class="pagination-bar">
      <Button variant="outline" size="sm" :disabled="page <= 1" @click="page--; loadData()">前へ</Button>
      <span style="font-size:13px;color:#606266;">{{ page }} / {{ totalPages }}</span>
      <Button variant="outline" size="sm" :disabled="page >= totalPages" @click="page++; loadData()">次へ</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { fetchSetOrders } from '@/api/setProduct'
import type { SetOrder, SetOrderStatus } from '@/types/setProduct'
import type { TableColumn, Operator } from '@/types/table'
import { useI18n } from '@/composables/useI18n'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const { t } = useI18n()

const searchColumns = computed<TableColumn[]>(() => [
  {
    key: 'search',
    title: t('wms.setProduct.skuName', '品番・名称'),
    width: 220,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'type',
    title: t('wms.setProduct.type', '種別'),
    width: 120,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: t('wms.setProduct.assemblyType', '組立'), value: 'assembly' },
      { label: t('wms.setProduct.disassemblyType', 'バラシ'), value: 'disassembly' },
    ],
  },
  {
    key: 'status',
    title: t('wms.setProduct.status', 'ステータス'),
    width: 120,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: t('wms.setProduct.statusPending', '未着手'), value: 'pending' },
      { label: t('wms.setProduct.statusInProgress', '作業中'), value: 'in_progress' },
      { label: t('wms.setProduct.statusCompleted', '完了'), value: 'completed' },
      { label: t('wms.setProduct.statusCancelled', 'キャンセル'), value: 'cancelled' },
    ],
  },
])

const orders = ref<SetOrder[]>([])
const isLoading = ref(false)
const searchText = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const total = ref(0)
const limit = 50
const totalPages = computed(() => Math.ceil(total.value / limit))

function handleSearch(payload: Record<string, { operator: Operator; value: any }>) {
  searchText.value = payload.search?.value ? String(payload.search.value).trim() : ''
  typeFilter.value = payload.type?.value ? String(payload.type.value) : ''
  statusFilter.value = payload.status?.value ? String(payload.status.value) : ''
  page.value = 1
  loadData()
}

async function loadData() {
  isLoading.value = true
  try {
    const res = await fetchSetOrders({
      type: typeFilter.value || undefined,
      status: statusFilter.value || undefined,
      search: searchText.value || undefined,
      page: page.value,
      limit,
    })
    orders.value = res.items
    total.value = res.total
  } catch {
    // silent
  } finally {
    isLoading.value = false
  }
}

function handlePageChange(p: number) {
  page.value = p
  loadData()
}

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('ja-JP') : ''
}

function statusLabel(s: SetOrderStatus): string {
  const map: Record<SetOrderStatus, string> = {
    pending: t('wms.setProduct.statusPending', '未着手'),
    in_progress: t('wms.setProduct.statusInProgress', '作業中'),
    completed: t('wms.setProduct.statusCompleted', '完了'),
    cancelled: t('wms.setProduct.statusCancelled', 'キャンセル'),
  }
  return map[s] || s
}

function exportCsv() {
  const rows: string[] = [
    [
      t('wms.setProduct.orderNumber', '指示番号'),
      t('wms.setProduct.type', '種別'),
      t('wms.setProduct.sku', '品番'),
      t('wms.setProduct.name', '名称'),
      t('wms.setProduct.orderQuantity', '指示数'),
      t('wms.setProduct.completedQuantity', '完成数'),
      t('wms.setProduct.stockCategory', '在庫区分'),
      t('wms.setProduct.lot', 'ロット'),
      t('wms.setProduct.expiryDate', '消費期限'),
      t('wms.setProduct.status', 'ステータス'),
      t('wms.setProduct.completedDate', '完成日'),
      t('wms.setProduct.createdDate', '作成日'),
    ].join(','),
  ]
  for (const o of orders.value) {
    rows.push([
      `"${o.orderNumber}"`,
      o.type === 'assembly' ? t('wms.setProduct.assemblyType', '組立') : t('wms.setProduct.disassemblyType', 'バラシ'),
      `"${o.setSku}"`,
      `"${o.setName}"`,
      o.quantity,
      o.completedQuantity,
      `"${o.stockCategory || ''}"`,
      `"${o.lotNumber || ''}"`,
      o.expiryDate ? formatDate(o.expiryDate) : '',
      statusLabel(o.status),
      o.completedAt ? formatDate(o.completedAt) : '',
      formatDate(o.createdAt),
    ].join(','))
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `set_order_history_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.set-order-history {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}
.o-table-wrapper { overflow-x: auto; margin-top: 8px; }
.o-table { width: 100%; border-collapse: collapse; background: var(--o-view-background, #fff); border: 1px solid var(--o-border-color, #e4e7ed); border-radius: 8px; overflow: hidden; }
.o-table-th { text-align: left; padding: 10px 12px; background: var(--o-gray-100, #f5f7fa); font-weight: 600; font-size: 13px; color: var(--o-gray-600, #606266); border-bottom: 1px solid var(--o-border-color, #e4e7ed); white-space: nowrap; }
.o-table-row:hover { background: var(--o-gray-50, #fafafa); }
.o-table-td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid var(--o-border-color-light, #ebeef5); color: var(--o-gray-700, #303133); }
.o-table-empty { text-align: center; padding: 40px; color: var(--o-gray-400, #c0c4cc); }

.type-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.type--assembly { background: var(--o-info-bg, #ecf5ff); color: var(--o-info, #409eff); }
.type--disassembly { background: var(--o-warning-bg, #fdf6ec); color: var(--o-warning, #e6a23c); }

.status-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.status--pending { background: var(--o-gray-200, #f5f5f5); color: var(--o-gray-500, #909399); }
.status--in_progress { background: var(--o-info-bg, #ecf5ff); color: var(--o-info, #409eff); }
.status--completed { background: var(--o-success-bg, #e1f3d8); color: var(--o-success, #67c23a); }
.status--cancelled { background: var(--o-danger-bg, #fde2e2); color: var(--o-danger, #f56c6c); }

.pagination-bar { display: flex; justify-content: center; padding: 16px 0; }
</style>
