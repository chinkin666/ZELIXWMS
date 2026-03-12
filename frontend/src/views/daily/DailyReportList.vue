<template>
  <div class="daily-report-list">
    <ControlPanel title="日次レポート" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <input v-model="generateDate" type="date" class="o-input o-input-sm" style="width:150px;" />
          <OButton variant="primary" size="sm" :disabled="isGenerating" @click="handleGenerate">
            {{ isGenerating ? '生成中...' : 'レポート生成' }}
          </OButton>
        </div>
      </template>
    </ControlPanel>

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:120px;">日付</th>
            <th class="o-table-th" style="width:80px;">状態</th>
            <th class="o-table-th o-table-th--right" style="width:80px;">出荷指示</th>
            <th class="o-table-th o-table-th--right" style="width:80px;">出荷完了</th>
            <th class="o-table-th o-table-th--right" style="width:80px;">入庫指示</th>
            <th class="o-table-th o-table-th--right" style="width:80px;">入庫完了</th>
            <th class="o-table-th o-table-th--right" style="width:70px;">返品</th>
            <th class="o-table-th o-table-th--right" style="width:80px;">在庫SKU</th>
            <th class="o-table-th o-table-th--right" style="width:80px;">在庫総数</th>
            <th class="o-table-th o-table-th--right" style="width:70px;">棚卸</th>
            <th class="o-table-th" style="width:110px;">締め日時</th>
            <th class="o-table-th" style="width:180px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="12" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="12" class="o-table-empty">データがありません</td>
          </tr>
          <tr v-for="row in rows" :key="row._id" class="o-table-row">
            <td class="o-table-td">
              <span class="date-link clickable" @click="$router.push(`/daily/${row.date}`)">{{ row.date }}</span>
            </td>
            <td class="o-table-td">
              <span class="o-status-tag" :class="dailyStatusClass(row.status)">{{ dailyStatusLabel(row.status) }}</span>
            </td>
            <td class="o-table-td o-table-td--right">{{ row.summary.shipments.totalOrders }}</td>
            <td class="o-table-td o-table-td--right">{{ row.summary.shipments.shippedOrders }}</td>
            <td class="o-table-td o-table-td--right">{{ row.summary.inbound.totalOrders }}</td>
            <td class="o-table-td o-table-td--right">{{ row.summary.inbound.receivedOrders }}</td>
            <td class="o-table-td o-table-td--right">{{ row.summary.returns.totalOrders }}</td>
            <td class="o-table-td o-table-td--right">{{ row.summary.inventory.totalSkus }}</td>
            <td class="o-table-td o-table-td--right">{{ row.summary.inventory.totalQuantity.toLocaleString() }}</td>
            <td class="o-table-td o-table-td--right">{{ row.summary.stocktaking.totalSessions }}</td>
            <td class="o-table-td">{{ row.closedAt ? formatDateTime(row.closedAt) : '-' }}</td>
            <td class="o-table-td o-table-td--actions">
              <div style="display:inline-flex;gap:4px;">
                <OButton size="sm" variant="secondary" @click="$router.push(`/daily/${row.date}`)">詳細</OButton>
                <OButton v-if="row.status === 'open'" variant="primary" size="sm" @click="handleClose(row)">締め</OButton>
                <OButton v-if="row.status === 'closed'" variant="secondary" size="sm" @click="handleLock(row)">ロック</OButton>
                <OButton v-if="row.status === 'open'" variant="secondary" size="sm" @click="handleRefresh(row)">更新</OButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ total }} 件</span>
      <div class="o-table-pagination__controls">
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
  fetchDailyReports,
  generateDailyReport,
  closeDailyReport,
  lockDailyReport,
} from '@/api/dailyReport'
import type { DailyReport } from '@/api/dailyReport'

const toast = useToast()
const isLoading = ref(false)
const isGenerating = ref(false)
const rows = ref<DailyReport[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(30)
const generateDate = ref(new Date().toISOString().slice(0, 10))

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const dailyStatusLabel = (s: string) => ({ open: '営業中', closed: '締め済', locked: 'ロック済' }[s] || s)
const dailyStatusClass = (s: string) => ({
  open: 'o-status-tag--printed',
  closed: 'o-status-tag--issued',
  locked: 'o-status-tag--confirmed',
}[s] || '')

const formatDateTime = (d: string) => new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

const loadData = async () => {
  isLoading.value = true
  try {
    const res = await fetchDailyReports({ page: currentPage.value, limit: pageSize.value })
    rows.value = res.data
    total.value = res.total
  } catch (e: any) { toast.showError(e?.message || '取得に失敗') } finally { isLoading.value = false }
}

const handleGenerate = async () => {
  if (!generateDate.value) { toast.showError('日付を選択してください'); return }
  isGenerating.value = true
  try {
    await generateDailyReport(generateDate.value)
    toast.showSuccess(`${generateDate.value} のレポートを生成しました`)
    await loadData()
  } catch (e: any) { toast.showError(e?.message) } finally { isGenerating.value = false }
}

const handleClose = async (row: DailyReport) => {
  if (!confirm(`${row.date} の日次を締めますか？`)) return
  try { await closeDailyReport(row.date); toast.showSuccess('日次を締めました'); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}

const handleLock = async (row: DailyReport) => {
  if (!confirm(`${row.date} の日次をロックしますか？ロック後は更新できません。`)) return
  try { await lockDailyReport(row.date); toast.showSuccess('日次をロックしました'); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}

const handleRefresh = async (row: DailyReport) => {
  try { await generateDailyReport(row.date); toast.showSuccess('レポートを更新しました'); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.daily-report-list { display: flex; flex-direction: column; padding: 1rem; }
.date-link { font-family: monospace; font-weight: 600; color: var(--o-brand-primary, #714b67); }
.clickable { cursor: pointer; }
.clickable:hover { text-decoration: underline; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
</style>
