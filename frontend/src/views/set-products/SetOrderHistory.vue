<template>
  <div class="set-order-history">
    <ControlPanel title="セット組指示履歴" :show-search="false">
      <template #center>
        <div style="display:flex;gap:6px;align-items:center;">
          <input v-model="searchText" type="text" class="o-input" placeholder="品番・名称で検索..." style="width:220px;" />
          <select v-model="typeFilter" class="o-input" style="width:120px;" @change="loadData">
            <option value="">全種別</option>
            <option value="assembly">組立</option>
            <option value="disassembly">バラシ</option>
          </select>
          <select v-model="statusFilter" class="o-input" style="width:120px;" @change="loadData">
            <option value="">全ステータス</option>
            <option value="pending">未着手</option>
            <option value="in_progress">作業中</option>
            <option value="completed">完了</option>
            <option value="cancelled">キャンセル</option>
          </select>
        </div>
      </template>
      <template #actions>
        <OButton variant="secondary" size="sm" @click="exportCsv">CSVダウンロード</OButton>
      </template>
    </ControlPanel>

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th">指示番号</th>
            <th class="o-table-th" style="width:70px;">種別</th>
            <th class="o-table-th" style="width:120px;">品番</th>
            <th class="o-table-th" style="width:150px;">名称</th>
            <th class="o-table-th" style="width:80px;">指示数</th>
            <th class="o-table-th" style="width:80px;">完成数</th>
            <th class="o-table-th" style="width:100px;">在庫区分</th>
            <th class="o-table-th" style="width:90px;">ロット</th>
            <th class="o-table-th" style="width:100px;">消費期限</th>
            <th class="o-table-th" style="width:80px;">ステータス</th>
            <th class="o-table-th" style="width:110px;">完成日</th>
            <th class="o-table-th" style="width:110px;">作成日</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="12" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="orders.length === 0">
            <td colspan="12" class="o-table-empty">履歴がありません</td>
          </tr>
          <tr v-for="order in orders" :key="order._id" class="o-table-row">
            <td class="o-table-td"><strong>{{ order.orderNumber }}</strong></td>
            <td class="o-table-td">
              <span class="type-tag" :class="'type--' + order.type">
                {{ order.type === 'assembly' ? '組立' : 'バラシ' }}
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
import { ref, computed, onMounted, watch } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import OPager from '@/components/odoo/OPager.vue'
import { fetchSetOrders } from '@/api/setProduct'
import type { SetOrder, SetOrderStatus } from '@/types/setProduct'

const orders = ref<SetOrder[]>([])
const isLoading = ref(false)
const searchText = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const total = ref(0)
const limit = 50
const totalPages = computed(() => Math.ceil(total.value / limit))

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchText, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadData()
  }, 300)
})

async function loadData() {
  isLoading.value = true
  try {
    const res = await fetchSetOrders({
      type: typeFilter.value || undefined,
      status: statusFilter.value || undefined,
      search: searchText.value.trim() || undefined,
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
    pending: '未着手',
    in_progress: '作業中',
    completed: '完了',
    cancelled: 'キャンセル',
  }
  return map[s] || s
}

function exportCsv() {
  const rows: string[] = ['指示番号,種別,品番,名称,指示数,完成数,在庫区分,ロット,消費期限,ステータス,完成日,作成日']
  for (const o of orders.value) {
    rows.push([
      `"${o.orderNumber}"`,
      o.type === 'assembly' ? '組立' : 'バラシ',
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
.set-order-history { max-width: 1600px; margin: 0 auto; }
.o-table-wrapper { overflow-x: auto; margin-top: 8px; }
.o-table { width: 100%; border-collapse: collapse; background: var(--o-view-background, #fff); border: 1px solid var(--o-border-color, #e4e7ed); border-radius: 8px; overflow: hidden; }
.o-table-th { text-align: left; padding: 10px 12px; background: var(--o-gray-100, #f5f7fa); font-weight: 600; font-size: 13px; color: var(--o-gray-600, #606266); border-bottom: 1px solid var(--o-border-color, #e4e7ed); white-space: nowrap; }
.o-table-row:hover { background: var(--o-gray-50, #fafafa); }
.o-table-td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid var(--o-border-color-light, #ebeef5); color: var(--o-gray-700, #303133); }
.o-table-empty { text-align: center; padding: 40px; color: var(--o-gray-400, #c0c4cc); }

.type-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.type--assembly { background: #ecf5ff; color: #409eff; }
.type--disassembly { background: #fdf6ec; color: #e6a23c; }

.status-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.status--pending { background: #f5f5f5; color: #909399; }
.status--in_progress { background: #ecf5ff; color: #409eff; }
.status--completed { background: #e1f3d8; color: #67c23a; }
.status--cancelled { background: #fde2e2; color: #f56c6c; }

.o-input { padding: 6px 10px; border: 1px solid var(--o-border-color, #dcdfe6); border-radius: 4px; font-size: 14px; outline: none; }
.o-input:focus { border-color: var(--o-brand-primary, #714b67); }

.pagination-bar { display: flex; justify-content: center; padding: 16px 0; }
</style>
