<template>
  <div class="stocktaking-detail">
    <ControlPanel :title="`棚卸詳細 - ${order?.orderNumber || ''}`" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" @click="$router.push('/stocktaking/list')">一覧へ</OButton>
          <OButton v-if="order?.status === 'draft'" variant="primary" size="sm" @click="handleStart">開始</OButton>
          <OButton v-if="order?.status === 'in_progress'" variant="success" size="sm" @click="handleSaveCount">カウント保存</OButton>
          <OButton v-if="order?.status === 'in_progress'" variant="primary" size="sm" @click="handleComplete">完了</OButton>
          <OButton v-if="order?.status === 'completed'" variant="primary" size="sm" @click="handleAdjust">調整反映</OButton>
        </div>
      </template>
    </ControlPanel>

    <div v-if="isLoading" style="padding:2rem;text-align:center;color:var(--o-gray-500);">読み込み中...</div>

    <template v-else-if="order">
      <!-- ヘッダ情報 -->
      <div class="info-bar">
        <span><strong>タイプ:</strong> {{ typeLabel(order.type) }}</span>
        <span><strong>状態:</strong> <span class="o-status-tag" :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span></span>
        <span v-if="order.scheduledDate"><strong>予定日:</strong> {{ formatDate(order.scheduledDate) }}</span>
        <span><strong>明細:</strong> {{ order.lines.length }}件</span>
      </div>

      <!-- カウント一覧テーブル -->
      <div class="o-table-wrapper">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width:40px;">#</th>
              <th class="o-table-th" style="width:130px;">ロケーション</th>
              <th class="o-table-th" style="width:120px;">SKU</th>
              <th class="o-table-th">商品名</th>
              <th class="o-table-th" style="width:80px;">ロット</th>
              <th class="o-table-th o-table-th--right" style="width:90px;">システム数</th>
              <th class="o-table-th o-table-th--right" style="width:100px;">実数量</th>
              <th class="o-table-th o-table-th--right" style="width:80px;">差異</th>
              <th class="o-table-th" style="width:80px;">状態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, idx) in order.lines" :key="idx" class="o-table-row">
              <td class="o-table-td">{{ idx + 1 }}</td>
              <td class="o-table-td"><span class="location-badge">{{ line.locationName }}</span></td>
              <td class="o-table-td" style="font-family:monospace;">{{ line.productSku }}</td>
              <td class="o-table-td">{{ line.productName || '-' }}</td>
              <td class="o-table-td">{{ line.lotNumber || '-' }}</td>
              <td class="o-table-td o-table-td--right">{{ line.systemQuantity }}</td>
              <td class="o-table-td o-table-td--right">
                <input
                  v-if="order.status === 'in_progress'"
                  v-model.number="countInputs[idx]"
                  type="number"
                  min="0"
                  class="o-input o-input-sm"
                  style="width:80px;text-align:right;"
                />
                <span v-else>{{ line.countedQuantity ?? '-' }}</span>
              </td>
              <td class="o-table-td o-table-td--right">
                <span v-if="line.variance !== undefined && line.variance !== null" :class="{ 'text-danger': line.variance < 0, 'text-success': line.variance > 0 }">
                  {{ line.variance > 0 ? '+' : '' }}{{ line.variance }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="o-table-td">
                <span class="line-status" :class="`line-status--${line.status}`">{{ lineStatusLabel(line.status) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import {
  fetchStocktakingOrder,
  startStocktakingOrder,
  recordStocktakingCount,
  completeStocktakingOrder,
  adjustStocktakingOrder,
} from '@/api/stocktakingOrder'
import type { StocktakingOrder } from '@/api/stocktakingOrder'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const isLoading = ref(true)
const order = ref<StocktakingOrder | null>(null)
const countInputs = ref<(number | undefined)[]>([])

const typeLabel = (t: string) => ({ full: '全棚卸', cycle: '循環棚卸', spot: 'スポット' }[t] || t)
const statusLabel = (s: string) => ({ draft: '下書き', in_progress: '進行中', completed: '完了', adjusted: '調整済', cancelled: 'キャンセル' }[s] || s)
const statusClass = (s: string) => ({
  draft: 'o-status-tag--draft', in_progress: 'o-status-tag--printed',
  completed: 'o-status-tag--issued', adjusted: 'o-status-tag--confirmed', cancelled: 'o-status-tag--cancelled',
}[s] || '')
const lineStatusLabel = (s: string) => ({ pending: '未', counted: '済', verified: '確認済' }[s] || s)
const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP')

const loadData = async () => {
  isLoading.value = true
  try {
    const data = await fetchStocktakingOrder(route.params.id as string)
    order.value = data
    countInputs.value = data.lines.map(l => l.countedQuantity)
  } catch (e: any) {
    toast.showError(e?.message || '取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

const handleStart = async () => {
  try {
    await startStocktakingOrder(route.params.id as string)
    toast.showSuccess('棚卸を開始しました')
    await loadData()
  } catch (e: any) { toast.showError(e?.message) }
}

const handleSaveCount = async () => {
  const counts: Array<{ lineIndex: number; countedQuantity: number }> = []
  countInputs.value.forEach((val, idx) => {
    if (val !== undefined && val !== null && !isNaN(val)) {
      counts.push({ lineIndex: idx, countedQuantity: val })
    }
  })
  if (counts.length === 0) { toast.showError('カウント数量を入力してください'); return }
  try {
    const data = await recordStocktakingCount(route.params.id as string, counts)
    order.value = data
    countInputs.value = data.lines.map(l => l.countedQuantity)
    toast.showSuccess(`${counts.length}件のカウントを保存しました`)
  } catch (e: any) { toast.showError(e?.message) }
}

const handleComplete = async () => {
  try {
    await completeStocktakingOrder(route.params.id as string)
    toast.showSuccess('棚卸を完了しました')
    await loadData()
  } catch (e: any) { toast.showError(e?.message) }
}

const handleAdjust = async () => {
  if (!confirm('差異を在庫に反映しますか？この操作は取り消せません。')) return
  try {
    const res = await adjustStocktakingOrder(route.params.id as string)
    toast.showSuccess(`${res.adjustedCount}件の差異を調整しました`)
    if (res.errors.length > 0) toast.showError(`エラー: ${res.errors.join(', ')}`)
    await loadData()
  } catch (e: any) { toast.showError(e?.message) }
}

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.stocktaking-detail { display: flex; flex-direction: column; padding: 1rem; }
.info-bar { display: flex; gap: 1.5rem; padding: 0.75rem 1rem; background: var(--o-gray-50, #fafafa); border-radius: 6px; margin-bottom: 1rem; font-size: 13px; flex-wrap: wrap; }
.location-badge { font-family: monospace; font-size: 12px; background: var(--o-gray-100, #f5f7fa); padding: 2px 6px; border-radius: 3px; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
.text-danger { color: #f56c6c; font-weight: 600; }
.text-success { color: #67c23a; font-weight: 600; }
.line-status { font-size: 12px; padding: 2px 6px; border-radius: 3px; }
.line-status--pending { background: #f4f4f5; color: #909399; }
.line-status--counted { background: #f0f9ff; color: #409eff; }
.line-status--verified { background: #f0f9eb; color: #67c23a; }
.o-status-tag--draft { background: #f4f4f5; color: #909399; }
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>
