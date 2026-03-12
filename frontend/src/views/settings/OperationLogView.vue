<template>
  <div class="operation-log-view">
    <ControlPanel title="WMS操作ログ" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <OButton variant="secondary" size="sm" @click="showFilters = !showFilters">
            {{ showFilters ? 'フィルター非表示' : 'フィルター表示' }}
          </OButton>
          <OButton variant="secondary" size="sm" @click="exportCsv">CSV出力</OButton>
        </div>
      </template>
    </ControlPanel>

    <!-- Filter Bar -->
    <div v-if="showFilters" class="filter-bar">
      <div class="filter-row">
        <div class="filter-item">
          <label class="filter-label">開始日</label>
          <input type="date" class="o-input o-input-sm" v-model="filterDateFrom" />
        </div>
        <div class="filter-item">
          <label class="filter-label">終了日</label>
          <input type="date" class="o-input o-input-sm" v-model="filterDateTo" />
        </div>
        <div class="filter-item">
          <label class="filter-label">カテゴリ</label>
          <select class="o-input o-input-sm" v-model="filterCategory">
            <option value="">全て</option>
            <option value="inbound">入庫</option>
            <option value="outbound">出庫</option>
            <option value="inventory">在庫</option>
            <option value="master">マスタ</option>
            <option value="return">返品</option>
          </select>
        </div>
        <div class="filter-item">
          <label class="filter-label">アクション</label>
          <select class="o-input o-input-sm" v-model="filterAction">
            <option value="">全て</option>
            <option v-for="a in actionOptions" :key="a.value" :value="a.value">{{ a.label }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label class="filter-label">検索 (SKU/品名/参照番号)</label>
          <input
            type="text"
            class="o-input o-input-sm"
            v-model="filterSearch"
            placeholder="キーワード..."
            @keydown.enter="doSearch"
          />
        </div>
        <div class="filter-item filter-actions">
          <OButton variant="primary" size="sm" @click="doSearch">検索</OButton>
          <OButton variant="secondary" size="sm" @click="resetFilters">リセット</OButton>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:150px;">日時</th>
            <th class="o-table-th" style="width:80px;">カテゴリ</th>
            <th class="o-table-th" style="width:130px;">アクション</th>
            <th class="o-table-th" style="width:100px;">SKU</th>
            <th class="o-table-th" style="width:150px;">商品名</th>
            <th class="o-table-th o-table-th--right" style="width:70px;">数量</th>
            <th class="o-table-th" style="width:110px;">ロケーション</th>
            <th class="o-table-th" style="width:130px;">参照番号</th>
            <th class="o-table-th" style="width:90px;">ユーザー</th>
            <th class="o-table-th">説明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="10" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="10" class="o-table-empty">データがありません</td>
          </tr>
          <tr v-for="row in rows" :key="row._id" class="o-table-row">
            <td class="o-table-td">{{ formatDateTime(row.createdAt) }}</td>
            <td class="o-table-td">
              <span class="category-badge" :class="'category--' + row.category">{{ categoryLabel(row.category) }}</span>
            </td>
            <td class="o-table-td">
              <span class="action-label">{{ actionLabel(row.action) }}</span>
            </td>
            <td class="o-table-td">{{ row.productSku || '-' }}</td>
            <td class="o-table-td">{{ row.productName || '-' }}</td>
            <td class="o-table-td o-table-td--right">{{ row.quantity != null ? row.quantity : '-' }}</td>
            <td class="o-table-td">
              <span v-if="row.locationCode" class="location-badge">{{ row.locationCode }}</span>
              <span v-else>-</span>
            </td>
            <td class="o-table-td">
              <span v-if="row.referenceNumber" class="ref-number">{{ row.referenceNumber }}</span>
              <span v-else>-</span>
            </td>
            <td class="o-table-td">{{ row.userName || '-' }}</td>
            <td class="o-table-td">{{ row.description }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ total }} 件中 {{ rows.length }} 件表示</span>
      <div class="o-table-pagination__controls">
        <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;" @change="onPageSizeChange">
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <OButton variant="secondary" size="sm" :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">&lsaquo;</OButton>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <OButton variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">&rsaquo;</OButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { fetchOperationLogs, exportOperationLogs } from '@/api/operationLog'
import type { OperationLogItem } from '@/api/operationLog'

const toast = useToast()
const isLoading = ref(false)
const rows = ref<OperationLogItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const showFilters = ref(false)

const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterCategory = ref('')
const filterAction = ref('')
const filterSearch = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const actionOptions: ReadonlyArray<{ readonly value: string; readonly label: string }> = [
  { value: 'inbound_receive', label: '入庫検品' },
  { value: 'inbound_putaway', label: '棚入れ' },
  { value: 'outbound_pick', label: 'ピッキング' },
  { value: 'outbound_inspect', label: '出荷検品' },
  { value: 'outbound_ship', label: '出荷完了' },
  { value: 'transfer', label: '在庫移動' },
  { value: 'adjustment', label: '在庫調整' },
  { value: 'stocktaking', label: '棚卸' },
  { value: 'return_receive', label: '返品入荷' },
  { value: 'return_inspect', label: '返品検品' },
  { value: 'lot_update', label: 'ロット更新' },
  { value: 'product_update', label: '商品更新' },
  { value: 'location_update', label: 'ロケーション更新' },
  { value: 'order_create', label: '指示作成' },
  { value: 'order_update', label: '指示更新' },
  { value: 'order_cancel', label: '指示取消' },
]

const categoryLabel = (c: string) => {
  const map: Record<string, string> = {
    inbound: '入庫',
    outbound: '出庫',
    inventory: '在庫',
    master: 'マスタ',
    return: '返品',
  }
  return map[c] || c
}

const actionLabel = (a: string) => {
  const found = actionOptions.find(o => o.value === a)
  return found ? found.label : a
}

const formatDateTime = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const buildParams = () => ({
  dateFrom: filterDateFrom.value || undefined,
  dateTo: filterDateTo.value || undefined,
  action: filterAction.value || undefined,
  category: filterCategory.value || undefined,
  search: filterSearch.value || undefined,
  page: currentPage.value,
  limit: pageSize.value,
})

const loadData = async () => {
  isLoading.value = true
  try {
    const res = await fetchOperationLogs(buildParams())
    rows.value = res.data
    total.value = res.total
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'データの取得に失敗しました'
    toast.showError(message)
  } finally {
    isLoading.value = false
  }
}

const doSearch = () => {
  currentPage.value = 1
  loadData()
}

const resetFilters = () => {
  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterCategory.value = ''
  filterAction.value = ''
  filterSearch.value = ''
  currentPage.value = 1
  loadData()
}

const onPageSizeChange = () => {
  currentPage.value = 1
  loadData()
}

const goPage = (p: number) => {
  currentPage.value = p
  loadData()
}

const exportCsv = async () => {
  try {
    const data = await exportOperationLogs({
      dateFrom: filterDateFrom.value || undefined,
      dateTo: filterDateTo.value || undefined,
      action: filterAction.value || undefined,
      category: filterCategory.value || undefined,
      search: filterSearch.value || undefined,
    })

    const csvRows: string[] = ['日時,カテゴリ,アクション,SKU,商品名,数量,ロケーション,参照番号,ユーザー,説明']
    for (const r of data) {
      csvRows.push([
        `"${formatDateTime(r.createdAt)}"`,
        `"${categoryLabel(r.category)}"`,
        `"${actionLabel(r.action)}"`,
        `"${r.productSku || ''}"`,
        `"${r.productName || ''}"`,
        r.quantity != null ? r.quantity : '',
        `"${r.locationCode || ''}"`,
        `"${r.referenceNumber || ''}"`,
        `"${r.userName || ''}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`,
      ].join(','))
    }

    const bom = '\uFEFF'
    const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `operation_logs_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'エクスポートに失敗しました'
    toast.showError(message)
  }
}

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.operation-log-view {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.filter-bar {
  background: var(--o-gray-50, #fafafa);
  border: 1px solid var(--o-gray-200, #e4e7ed);
  border-radius: 4px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 12px;
  color: var(--o-gray-600, #606266);
  font-weight: 500;
}

.filter-actions {
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: flex-end;
}

.category-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
}

.category--inbound { background: #e1f3d8; color: #67c23a; }
.category--outbound { background: #fef0f0; color: #f56c6c; }
.category--inventory { background: #d9ecff; color: #409eff; }
.category--master { background: #fdf6ec; color: #e6a23c; }
.category--return { background: #f4f4f5; color: #909399; }

.action-label {
  font-size: 12px;
  color: var(--o-gray-700, #303133);
}

.location-badge {
  font-family: monospace;
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 6px;
  border-radius: 3px;
}

.ref-number {
  font-family: monospace;
  font-size: 12px;
  color: var(--o-brand-primary, #714b67);
  font-weight: 600;
}

.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
</style>
