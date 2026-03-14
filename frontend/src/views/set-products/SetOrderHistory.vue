<template>
  <div class="set-order-history">
    <ControlPanel :title="t('wms.setProduct.orderHistory', 'セット組指示履歴')" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" @click="exportCsv">{{ t('wms.setProduct.csvDownload', 'CSVダウンロード') }}</OButton>
      </template>
    </ControlPanel>

    <SearchForm
      :columns="searchColumns"
      :show-save="false"
      storage-key="setOrderHistorySearch"
      @search="handleSearch"
    />

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th">{{ t('wms.setProduct.orderNumber', '指示番号') }}</th>
            <th class="o-table-th" style="width:70px;">{{ t('wms.setProduct.type', '種別') }}</th>
            <th class="o-table-th" style="width:120px;">{{ t('wms.setProduct.sku', '品番') }}</th>
            <th class="o-table-th" style="width:150px;">{{ t('wms.setProduct.name', '名称') }}</th>
            <th class="o-table-th" style="width:80px;">{{ t('wms.setProduct.orderQuantity', '指示数') }}</th>
            <th class="o-table-th" style="width:80px;">{{ t('wms.setProduct.completedQuantity', '完成数') }}</th>
            <th class="o-table-th" style="width:100px;">{{ t('wms.setProduct.stockCategory', '在庫区分') }}</th>
            <th class="o-table-th" style="width:90px;">{{ t('wms.setProduct.lot', 'ロット') }}</th>
            <th class="o-table-th" style="width:100px;">{{ t('wms.setProduct.expiryDate', '消費期限') }}</th>
            <th class="o-table-th" style="width:80px;">{{ t('wms.setProduct.status', 'ステータス') }}</th>
            <th class="o-table-th" style="width:110px;">{{ t('wms.setProduct.completedDate', '完成日') }}</th>
            <th class="o-table-th" style="width:110px;">{{ t('wms.setProduct.createdDate', '作成日') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="12" class="o-table-empty">{{ t('wms.common.loading', '読み込み中...') }}</td>
          </tr>
          <tr v-else-if="orders.length === 0">
            <td colspan="12" class="o-table-empty">{{ t('wms.setProduct.noHistory', '履歴がありません') }}</td>
          </tr>
          <tr v-for="order in orders" :key="order._id" class="o-table-row">
            <td class="o-table-td"><strong>{{ order.orderNumber }}</strong></td>
            <td class="o-table-td">
              <span class="type-tag" :class="'type--' + order.type">
                {{ order.type === 'assembly' ? t('wms.setProduct.assemblyType', '組立') : t('wms.setProduct.disassemblyType', 'バラシ') }}
              </span>
            </td>
            <td class="o-table-td">{{ order.setSku }}</td>
            <td class="o-table-td">{{ order.setName }}</td>
            <td class="o-table-td">{{ order.quantity }}</td>
            <td class="o-table-td">{{ order.completedQuantity }}</td>
            <td class="o-table-td">{{ order.stockCategory || '-' }}</td>
            <td class="o-table-td">{{ order.lotNumber || '-' }}</td>
            <td class="o-table-td">{{ order.expiryDate ? formatDate(order.expiryDate) : '-' }}</td>
            <td class="o-table-td">
              <span class="status-tag" :class="'status--' + order.status">{{ statusLabel(order.status) }}</span>
            </td>
            <td class="o-table-td">{{ order.completedAt ? formatDate(order.completedAt) : '-' }}</td>
            <td class="o-table-td">{{ formatDate(order.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1" class="pagination-bar">
      <OPager :total="total" :offset="(page - 1) * limit" :limit="limit" @update:offset="(o: number) => { page = Math.floor(o / limit) + 1; loadData() }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import OPager from '@/components/odoo/OPager.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import { fetchSetOrders } from '@/api/setProduct'
import type { SetOrder, SetOrderStatus } from '@/types/setProduct'
import type { TableColumn, Operator } from '@/types/table'
import { useI18n } from '@/composables/useI18n'

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
