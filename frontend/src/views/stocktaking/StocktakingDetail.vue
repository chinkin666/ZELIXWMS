<template>
  <div class="stocktaking-detail">
    <PageHeader :title="`${t('wms.stocktaking.detail', '棚卸詳細')} - ${order?.orderNumber || ''}`" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <Button variant="secondary" size="sm" @click="$router.push('/stocktaking/list')">{{ t('wms.stocktaking.toList', '一覧へ') }}</Button>
          <Button v-if="order?.status === 'draft'" variant="default" size="sm" @click="handleStart">{{ t('wms.stocktaking.start', '開始') }}</Button>
          <Button v-if="order?.status === 'in_progress'" variant="default" size="sm" @click="handleSaveCount">{{ t('wms.stocktaking.saveCount', 'カウント保存') }}</Button>
          <Button v-if="order?.status === 'in_progress'" variant="default" size="sm" @click="handleComplete">{{ t('wms.stocktaking.complete', '完了') }}</Button>
          <Button v-if="order?.status === 'completed'" variant="default" size="sm" @click="handleAdjust">{{ t('wms.stocktaking.adjust', '調整反映') }}</Button>
        </div>
      </template>
    </PageHeader>

    <div v-if="isLoading" class="space-y-3 p-4">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>

    <template v-else-if="order">
      <div class="info-bar">
        <span><strong>{{ t('wms.stocktaking.type', 'タイプ') }}:</strong> {{ typeLabel(order.type) }}</span>
        <span><strong>{{ t('wms.stocktaking.state', '状態') }}:</strong> <Badge variant="secondary">{{ statusLabel(order.status) }}</Badge></span>
        <span v-if="order.scheduledDate"><strong>{{ t('wms.stocktaking.scheduledDate', '予定日') }}:</strong> {{ formatDate(order.scheduledDate) }}</span>
        <span><strong>{{ t('wms.stocktaking.lines', '明細') }}:</strong> {{ order.lines.length }}{{ t('wms.stocktaking.items', '件') }}</span>
      </div>

      <div class="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style="width:40px;">#</TableHead>
              <TableHead style="width:130px;">{{ t('wms.stocktaking.location', 'ロケーション') }}</TableHead>
              <TableHead style="width:120px;">SKU</TableHead>
              <TableHead>{{ t('wms.stocktaking.productName', '商品名') }}</TableHead>
              <TableHead style="width:80px;">{{ t('wms.stocktaking.lot', 'ロット') }}</TableHead>
              <TableHead class="text-right" style="width:90px;">{{ t('wms.stocktaking.systemQty', 'システム数') }}</TableHead>
              <TableHead class="text-right" style="width:100px;">{{ t('wms.stocktaking.actualQty', '実数量') }}</TableHead>
              <TableHead class="text-right" style="width:80px;">{{ t('wms.stocktaking.variance', '差異') }}</TableHead>
              <TableHead style="width:80px;">{{ t('wms.stocktaking.lineStatus', '状態') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(line, idx) in order.lines" :key="idx">
              <TableCell>{{ idx + 1 }}</TableCell>
              <TableCell><span class="location-badge">{{ line.locationName }}</span></TableCell>
              <TableCell style="font-family:monospace;">{{ line.productSku }}</TableCell>
              <TableCell>{{ line.productName || '-' }}</TableCell>
              <TableCell>{{ line.lotNumber || '-' }}</TableCell>
              <TableCell class="text-right">{{ line.systemQuantity }}</TableCell>
              <TableCell class="text-right">
                <Input
                  v-if="order.status === 'in_progress'"
                  v-model.number="countInputs[idx]"
                  type="number"
                  min="0"
                  class="h-8 text-sm"
                  style="width:80px;text-align:right;"
                />
                <span v-else>{{ line.countedQuantity ?? '-' }}</span>
              </TableCell>
              <TableCell class="text-right">
                <span v-if="line.variance !== undefined && line.variance !== null" :class="{ 'text-danger': line.variance < 0, 'text-success': line.variance > 0 }">
                  {{ line.variance > 0 ? '+' : '' }}{{ line.variance }}
                </span>
                <span v-else>-</span>
              </TableCell>
              <TableCell>
                <span class="line-status" :class="`line-status--${line.status}`">{{ lineStatusLabel(line.status) }}</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import {
  fetchStocktakingOrder,
  startStocktakingOrder,
  recordStocktakingCount,
  completeStocktakingOrder,
  adjustStocktakingOrder,
} from '@/api/stocktakingOrder'
import type { StocktakingOrder } from '@/api/stocktakingOrder'
import { onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
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
  if (!(await confirm('この操作を実行しますか？'))) return
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

/* モバイルレスポンシブ対応 / 移动端响应式适配 */
@media (max-width: 768px) {
  /* 全体パディング縮小 / 整体内边距缩小 */
  .stocktaking-detail { padding: 0 12px 12px; }

  /* 情報バー縦積み / 信息栏纵向排列 */
  .info-bar { flex-direction: column; gap: 6px; padding: 10px; }

  /* テーブル横スクロール / 表格横向滚动 */
  .o-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }

  /* 入力フィールド全幅 / 输入框全宽 */
  .o-input, .o-input-sm { width: 100% !important; }

  /* タッチターゲット拡大 / 触摸目标放大 */
  button, .o-btn, .el-button { min-height: 44px; min-width: 44px; }

  /* アクションボタン折り返し / 操作按钮换行 */
  .actions, [class*="action"] { flex-wrap: wrap; }
}
</style>
