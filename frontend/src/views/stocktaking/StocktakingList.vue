<template>
  <div class="stocktaking-list">
    <ControlPanel title="棚卸一覧" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <select v-model="filterStatus" class="o-input o-input-sm" style="width:120px;" @change="currentPage = 1; loadData()">
            <option value="">全状態</option>
            <option value="draft">下書き</option>
            <option value="in_progress">進行中</option>
            <option value="completed">完了</option>
            <option value="adjusted">調整済</option>
            <option value="cancelled">キャンセル</option>
          </select>
          <select v-model="filterType" class="o-input o-input-sm" style="width:130px;" @change="currentPage = 1; loadData()">
            <option value="">全タイプ</option>
            <option value="full">全棚卸</option>
            <option value="cycle">循環棚卸</option>
            <option value="spot">スポット</option>
          </select>
          <OButton variant="primary" size="sm" @click="$router.push('/stocktaking/create')">新規作成</OButton>
        </div>
      </template>
    </ControlPanel>

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:170px;">棚卸番号</th>
            <th class="o-table-th" style="width:90px;">タイプ</th>
            <th class="o-table-th" style="width:90px;">状態</th>
            <th class="o-table-th o-table-th--right" style="width:80px;">明細数</th>
            <th class="o-table-th o-table-th--right" style="width:90px;">カウント済</th>
            <th class="o-table-th o-table-th--right" style="width:80px;">差異あり</th>
            <th class="o-table-th" style="width:110px;">予定日</th>
            <th class="o-table-th" style="width:110px;">作成日時</th>
            <th class="o-table-th" style="width:260px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="9" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="9" class="o-table-empty">データがありません</td>
          </tr>
          <tr v-for="row in rows" :key="row._id" class="o-table-row">
            <td class="o-table-td">
              <span class="order-number clickable" @click="$router.push(`/stocktaking/${row._id}`)">{{ row.orderNumber }}</span>
            </td>
            <td class="o-table-td">{{ typeLabel(row.type) }}</td>
            <td class="o-table-td">
              <span class="o-status-tag" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
            </td>
            <td class="o-table-td o-table-td--right">{{ row.lines.length }}</td>
            <td class="o-table-td o-table-td--right">{{ countedLines(row) }} / {{ row.lines.length }}</td>
            <td class="o-table-td o-table-td--right">
              <span :class="{ 'text-warning': varianceLines(row) > 0 }">{{ varianceLines(row) }}</span>
            </td>
            <td class="o-table-td">{{ row.scheduledDate ? formatDate(row.scheduledDate) : '-' }}</td>
            <td class="o-table-td">{{ formatDateTime(row.createdAt) }}</td>
            <td class="o-table-td o-table-td--actions">
              <div style="display:inline-flex;gap:4px;flex-wrap:wrap;">
                <OButton size="sm" variant="secondary" @click="$router.push(`/stocktaking/${row._id}`)">詳細</OButton>
                <OButton
                  v-if="row.status === 'draft'"
                  variant="primary" size="sm"
                  @click="handleStart(row)"
                >開始</OButton>
                <OButton
                  v-if="row.status === 'in_progress'"
                  variant="success" size="sm"
                  @click="handleComplete(row)"
                >完了</OButton>
                <OButton
                  v-if="row.status === 'completed'"
                  variant="primary" size="sm"
                  @click="handleAdjust(row)"
                >調整反映</OButton>
                <OButton
                  v-if="row.status !== 'adjusted' && row.status !== 'cancelled'"
                  variant="secondary" size="sm"
                  style="border-color:#f56c6c;color:#f56c6c;"
                  @click="handleCancel(row)"
                >取消</OButton>
                <OButton
                  v-if="row.status === 'draft' || row.status === 'cancelled'"
                  variant="secondary" size="sm"
                  style="border-color:#f56c6c;color:#f56c6c;"
                  @click="handleDelete(row)"
                >削除</OButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ total }} 件</span>
      <div class="o-table-pagination__controls">
        <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;" @change="currentPage = 1; loadData()">
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <OButton variant="secondary" size="sm" :disabled="currentPage <= 1" @click="currentPage--; loadData()">&lsaquo;</OButton>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <OButton variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++; loadData()">&rsaquo;</OButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import {
  fetchStocktakingOrders,
  startStocktakingOrder,
  completeStocktakingOrder,
  adjustStocktakingOrder,
  cancelStocktakingOrder,
  deleteStocktakingOrder,
} from '@/api/stocktakingOrder'
import type { StocktakingOrder } from '@/api/stocktakingOrder'

const toast = useToast()
const isLoading = ref(false)
const rows = ref<StocktakingOrder[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(25)
const filterStatus = ref('')
const filterType = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const typeLabel = (t: string) => ({ full: '全棚卸', cycle: '循環棚卸', spot: 'スポット' }[t] || t)
const statusLabel = (s: string) => ({ draft: '下書き', in_progress: '進行中', completed: '完了', adjusted: '調整済', cancelled: 'キャンセル' }[s] || s)
const statusClass = (s: string) => ({
  draft: 'o-status-tag--draft',
  in_progress: 'o-status-tag--printed',
  completed: 'o-status-tag--issued',
  adjusted: 'o-status-tag--confirmed',
  cancelled: 'o-status-tag--cancelled',
}[s] || '')

const countedLines = (row: StocktakingOrder) => row.lines.filter(l => l.status !== 'pending').length
const varianceLines = (row: StocktakingOrder) => row.lines.filter(l => l.variance && l.variance !== 0).length

const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP')
const formatDateTime = (d: string) => new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

const loadData = async () => {
  isLoading.value = true
  try {
    const res = await fetchStocktakingOrders({
      status: filterStatus.value || undefined,
      type: filterType.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    rows.value = res.data
    total.value = res.total
  } catch (e: any) {
    toast.showError(e?.message || 'データの取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

const handleStart = async (row: StocktakingOrder) => {
  if (!confirm(`棚卸 ${row.orderNumber} を開始しますか？`)) return
  try {
    await startStocktakingOrder(row._id)
    toast.showSuccess('棚卸を開始しました')
    await loadData()
  } catch (e: any) { toast.showError(e?.message || '開始に失敗しました') }
}

const handleComplete = async (row: StocktakingOrder) => {
  try {
    await completeStocktakingOrder(row._id)
    toast.showSuccess('棚卸を完了しました')
    await loadData()
  } catch (e: any) { toast.showError(e?.message || '完了に失敗しました') }
}

const handleAdjust = async (row: StocktakingOrder) => {
  if (!confirm(`棚卸 ${row.orderNumber} の差異を在庫に反映しますか？この操作は取り消せません。`)) return
  try {
    const res = await adjustStocktakingOrder(row._id)
    toast.showSuccess(`${res.adjustedCount}件の差異を調整しました`)
    if (res.errors.length > 0) {
      toast.showError(`エラー: ${res.errors.join(', ')}`)
    }
    await loadData()
  } catch (e: any) { toast.showError(e?.message || '調整に失敗しました') }
}

const handleCancel = async (row: StocktakingOrder) => {
  if (!confirm(`棚卸 ${row.orderNumber} をキャンセルしますか？`)) return
  try {
    await cancelStocktakingOrder(row._id)
    toast.showSuccess('棚卸をキャンセルしました')
    await loadData()
  } catch (e: any) { toast.showError(e?.message || 'キャンセルに失敗しました') }
}

const handleDelete = async (row: StocktakingOrder) => {
  if (!confirm(`棚卸 ${row.orderNumber} を削除しますか？`)) return
  try {
    await deleteStocktakingOrder(row._id)
    toast.showSuccess('棚卸を削除しました')
    await loadData()
  } catch (e: any) { toast.showError(e?.message || '削除に失敗しました') }
}

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.stocktaking-list { display: flex; flex-direction: column; padding: 1rem; }
.order-number { font-family: monospace; font-weight: 600; color: var(--o-brand-primary, #714b67); }
.clickable { cursor: pointer; }
.clickable:hover { text-decoration: underline; }
.text-warning { color: #e6a23c; font-weight: 600; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
.o-status-tag--draft { background: #f4f4f5; color: #909399; }
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>
