<template>
  <div class="stocktaking-detail">
    <ControlPanel :title="`${t('wms.stocktaking.detail', '棚卸詳細')} - ${order?.orderNumber || ''}`" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" @click="$router.push('/stocktaking/list')">{{ t('wms.stocktaking.toList', '一覧へ') }}</OButton>
          <OButton v-if="order?.status === 'draft'" variant="primary" size="sm" @click="handleStart">{{ t('wms.stocktaking.start', '開始') }}</OButton>
          <OButton v-if="order?.status === 'in_progress'" variant="success" size="sm" @click="handleSaveCount">{{ t('wms.stocktaking.saveCount', 'カウント保存') }}</OButton>
          <OButton v-if="order?.status === 'in_progress'" variant="primary" size="sm" @click="handleComplete">{{ t('wms.stocktaking.complete', '完了') }}</OButton>
          <OButton v-if="order?.status === 'completed'" variant="primary" size="sm" @click="handleAdjust">{{ t('wms.stocktaking.adjust', '調整反映') }}</OButton>
        </div>
      </template>
    </ControlPanel>

    <div v-if="isLoading" style="padding:2rem;text-align:center;color:var(--o-gray-500);">{{ t('wms.common.loading', '読み込み中...') }}</div>

    <template v-else-if="order">
      <div class="info-bar">
        <span><strong>{{ t('wms.stocktaking.type', 'タイプ') }}:</strong> {{ typeLabel(order.type) }}</span>
        <span><strong>{{ t('wms.stocktaking.state', '状態') }}:</strong> <span class="o-status-tag" :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span></span>
        <span v-if="order.scheduledDate"><strong>{{ t('wms.stocktaking.scheduledDate', '予定日') }}:</strong> {{ formatDate(order.scheduledDate) }}</span>
        <span><strong>{{ t('wms.stocktaking.lines', '明細') }}:</strong> {{ order.lines.length }}{{ t('wms.stocktaking.items', '件') }}</span>
      </div>

      <div class="o-table-wrapper">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width:40px;">#</th>
              <th class="o-table-th" style="width:130px;">{{ t('wms.stocktaking.location', 'ロケーション') }}</th>
              <th class="o-table-th" style="width:120px;">SKU</th>
              <th class="o-table-th">{{ t('wms.stocktaking.productName', '商品名') }}</th>
              <th class="o-table-th" style="width:80px;">{{ t('wms.stocktaking.lot', 'ロット') }}</th>
              <th class="o-table-th o-table-th--right" style="width:90px;">{{ t('wms.stocktaking.systemQty', 'システム数') }}</th>
              <th class="o-table-th o-table-th--right" style="width:100px;">{{ t('wms.stocktaking.actualQty', '実数量') }}</th>
              <th class="o-table-th o-table-th--right" style="width:80px;">{{ t('wms.stocktaking.variance', '差異') }}</th>
              <th class="o-table-th" style="width:80px;">{{ t('wms.stocktaking.lineStatus', '状態') }}</th>
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
import { useI18n } from '@/composables/useI18n'
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

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const isLoading = ref(true)
const order = ref<StocktakingOrder | null>(null)
const countInputs = ref<(number | undefined)[]>([])

const typeLabel = (tp: string) => ({
  full: t('wms.stocktaking.typeFull', '全棚卸'),
  cycle: t('wms.stocktaking.typeCycle', '循環棚卸'),
  spot: t('wms.stocktaking.typeSpot', 'スポット'),
}[tp] || tp)

const statusLabel = (s: string) => ({
  draft: t('wms.stocktaking.statusDraft', '下書き'),
  in_progress: t('wms.stocktaking.statusInProgress', '進行中'),
  completed: t('wms.stocktaking.statusCompleted', '完了'),
  adjusted: t('wms.stocktaking.statusAdjusted', '調整済'),
  cancelled: t('wms.stocktaking.statusCancelled', 'キャンセル'),
}[s] || s)

const statusClass = (s: string) => ({
  draft: 'o-status-tag--draft', in_progress: 'o-status-tag--printed',
  completed: 'o-status-tag--issued', adjusted: 'o-status-tag--confirmed', cancelled: 'o-status-tag--cancelled',
}[s] || '')

const lineStatusLabel = (s: string) => ({
  pending: t('wms.stocktaking.linePending', '未'),
  counted: t('wms.stocktaking.lineCounted', '済'),
  verified: t('wms.stocktaking.lineVerified', '確認済'),
}[s] || s)

const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP')

const loadData = async () => {
  isLoading.value = true
  try {
    const data = await fetchStocktakingOrder(route.params.id as string)
    order.value = data
    countInputs.value = data.lines.map(l => l.countedQuantity)
  } catch (e: any) {
    toast.showError(e?.message || t('wms.stocktaking.fetchFailed', '取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

const handleStart = async () => {
  try {
    await startStocktakingOrder(route.params.id as string)
    toast.showSuccess(t('wms.stocktaking.started', '棚卸を開始しました'))
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
  if (counts.length === 0) { toast.showError(t('wms.stocktaking.enterCount', 'カウント数量を入力してください')); return }
  try {
    const data = await recordStocktakingCount(route.params.id as string, counts)
    order.value = data
    countInputs.value = data.lines.map(l => l.countedQuantity)
    toast.showSuccess(t('wms.stocktaking.countSaved', `${counts.length}件のカウントを保存しました`))
  } catch (e: any) { toast.showError(e?.message) }
}

const handleComplete = async () => {
  try {
    await completeStocktakingOrder(route.params.id as string)
    toast.showSuccess(t('wms.stocktaking.completed', '棚卸を完了しました'))
    await loadData()
  } catch (e: any) { toast.showError(e?.message) }
}

const handleAdjust = async () => {
  if (!confirm(t('wms.stocktaking.adjustConfirm', '差異を在庫に反映しますか？この操作は取り消せません。'))) return
  try {
    const res = await adjustStocktakingOrder(route.params.id as string)
    toast.showSuccess(t('wms.stocktaking.adjusted', `${res.adjustedCount}件の差異を調整しました`))
    if (res.errors.length > 0) toast.showError(`${t('wms.stocktaking.error', 'エラー')}: ${res.errors.join(', ')}`)
    await loadData()
  } catch (e: any) { toast.showError(e?.message) }
}

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.stocktaking-detail { display: flex; flex-direction: column; gap: 16px; padding: 0 20px 20px; }
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
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
