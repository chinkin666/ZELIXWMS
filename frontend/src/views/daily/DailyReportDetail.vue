<template>
  <div class="daily-detail">
    <ControlPanel :title="`${t('wms.daily.reportDetail', '日次レポート')} - ${date}`" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" @click="$router.push('/daily/list')">{{ t('wms.daily.toList', '一覧へ') }}</OButton>
          <OButton v-if="report?.status === 'open'" variant="primary" size="sm" @click="handleRefresh">{{ t('wms.daily.refreshData', 'データ更新') }}</OButton>
          <OButton v-if="report?.status === 'open'" variant="success" size="sm" @click="handleClose">{{ t('wms.daily.closeDay', '日次締め') }}</OButton>
          <OButton v-if="report?.status === 'closed'" variant="secondary" size="sm" @click="handleLock">{{ t('wms.daily.lock', 'ロック') }}</OButton>
        </div>
      </template>
    </ControlPanel>

    <div v-if="isLoading" style="padding:2rem;text-align:center;color:var(--o-gray-500);">{{ t('wms.common.loading', '読み込み中...') }}</div>

    <template v-else-if="report">
      <div class="info-bar">
        <span><strong>{{ t('wms.daily.state', '状態') }}:</strong> <span class="o-status-tag" :class="dailyStatusClass(report.status)">{{ dailyStatusLabel(report.status) }}</span></span>
        <span v-if="report.closedAt"><strong>{{ t('wms.daily.closedAt', '締め日時') }}:</strong> {{ new Date(report.closedAt).toLocaleString('ja-JP') }}</span>
        <span v-if="report.closedBy"><strong>{{ t('wms.daily.closedBy', '締め実行者') }}:</strong> {{ report.closedBy }}</span>
      </div>

      <div class="summary-grid">
        <!-- 出荷 -->
        <div class="summary-card">
          <h3 class="summary-title">{{ t('wms.daily.shipments', '出荷') }}</h3>
          <div class="summary-items">
            <div class="summary-item"><span>{{ t('wms.daily.totalShipmentOrders', '出荷指示数') }}</span><strong>{{ report.summary.shipments.totalOrders }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.shippedOrders', '出荷完了') }}</span><strong class="text-success">{{ report.summary.shipments.shippedOrders }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.totalItems', '商品点数') }}</span><strong>{{ report.summary.shipments.totalItems }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.shippedItems', '出荷済点数') }}</span><strong>{{ report.summary.shipments.shippedItems }}</strong></div>
          </div>
          <div class="progress-bar-mini" v-if="report.summary.shipments.totalOrders > 0">
            <div class="progress-bar-mini-fill" :style="{ width: (report.summary.shipments.shippedOrders / report.summary.shipments.totalOrders * 100) + '%' }"></div>
          </div>
        </div>

        <!-- 入庫 -->
        <div class="summary-card">
          <h3 class="summary-title">{{ t('wms.daily.inbound', '入庫') }}</h3>
          <div class="summary-items">
            <div class="summary-item"><span>{{ t('wms.daily.totalInboundOrders', '入庫指示数') }}</span><strong>{{ report.summary.inbound.totalOrders }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.receivedOrders', '入庫完了') }}</span><strong class="text-success">{{ report.summary.inbound.receivedOrders }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.scheduledItems', '予定点数') }}</span><strong>{{ report.summary.inbound.totalItems }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.receivedItems', '入庫済点数') }}</span><strong>{{ report.summary.inbound.receivedItems }}</strong></div>
          </div>
          <div class="progress-bar-mini" v-if="report.summary.inbound.totalOrders > 0">
            <div class="progress-bar-mini-fill" :style="{ width: (report.summary.inbound.receivedOrders / report.summary.inbound.totalOrders * 100) + '%' }"></div>
          </div>
        </div>

        <!-- 返品 -->
        <div class="summary-card">
          <h3 class="summary-title">{{ t('wms.daily.returns', '返品') }}</h3>
          <div class="summary-items">
            <div class="summary-item"><span>{{ t('wms.daily.totalReturnOrders', '返品受付数') }}</span><strong>{{ report.summary.returns.totalOrders }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.completedReturns', '完了') }}</span><strong class="text-success">{{ report.summary.returns.completedOrders }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.restockedItems', '再入庫点数') }}</span><strong>{{ report.summary.returns.restockedItems }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.disposedItems', '廃棄点数') }}</span><strong class="text-danger">{{ report.summary.returns.disposedItems }}</strong></div>
          </div>
          <div class="progress-bar-mini" v-if="report.summary.returns.totalOrders > 0">
            <div class="progress-bar-mini-fill" :style="{ width: (report.summary.returns.completedOrders / report.summary.returns.totalOrders * 100) + '%' }"></div>
          </div>
        </div>

        <!-- 在庫 -->
        <div class="summary-card">
          <h3 class="summary-title">{{ t('wms.daily.inventory', '在庫') }}</h3>
          <div class="summary-items">
            <div class="summary-item"><span>{{ t('wms.daily.totalSkus', '在庫SKU数') }}</span><strong>{{ report.summary.inventory.totalSkus }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.totalQuantity', '在庫総数') }}</span><strong>{{ report.summary.inventory.totalQuantity.toLocaleString() }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.reservedQuantity', '引当済数量') }}</span><strong>{{ report.summary.inventory.reservedQuantity }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.adjustmentCount', '調整件数') }}</span><strong>{{ report.summary.inventory.adjustmentCount }}</strong></div>
          </div>
        </div>

        <!-- 棚卸 -->
        <div class="summary-card">
          <h3 class="summary-title">{{ t('wms.daily.stocktaking', '棚卸') }}</h3>
          <div class="summary-items">
            <div class="summary-item"><span>{{ t('wms.daily.totalSessions', '実施数') }}</span><strong>{{ report.summary.stocktaking.totalSessions }}</strong></div>
            <div class="summary-item"><span>{{ t('wms.daily.varianceCount', '差異件数') }}</span><strong :class="{ 'text-warning': report.summary.stocktaking.varianceCount > 0 }">{{ report.summary.stocktaking.varianceCount }}</strong></div>
          </div>
        </div>
      </div>
    </template>

    <div v-else style="padding:2rem;text-align:center;color:var(--o-gray-500);">
      {{ t('wms.daily.noReport', 'レポートが見つかりません。一覧画面からレポートを生成してください。') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { fetchDailyReport, generateDailyReport, closeDailyReport, lockDailyReport } from '@/api/dailyReport'
import type { DailyReport } from '@/api/dailyReport'

const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const isLoading = ref(true)
const report = ref<DailyReport | null>(null)
const date = computed(() => route.params.date as string)

const dailyStatusLabel = (s: string) => ({
  open: t('wms.daily.statusOpen', '営業中'),
  closed: t('wms.daily.statusClosed', '締め済'),
  locked: t('wms.daily.statusLocked', 'ロック済'),
}[s] || s)

const dailyStatusClass = (s: string) => ({ open: 'o-status-tag--printed', closed: 'o-status-tag--issued', locked: 'o-status-tag--confirmed' }[s] || '')

const loadData = async () => {
  isLoading.value = true
  try { report.value = await fetchDailyReport(date.value) }
  catch { report.value = null }
  finally { isLoading.value = false }
}

const handleRefresh = async () => {
  try { report.value = await generateDailyReport(date.value); toast.showSuccess(t('wms.daily.dataUpdated', 'データを更新しました')) }
  catch (e: any) { toast.showError(e?.message) }
}
const handleClose = async () => {
  if (!confirm(t('wms.daily.closeConfirm', `${date.value} の日次を締めますか？`))) return
  try { report.value = await closeDailyReport(date.value); toast.showSuccess(t('wms.daily.dayClosed', '日次を締めました')) }
  catch (e: any) { toast.showError(e?.message) }
}
const handleLock = async () => {
  if (!confirm(t('wms.daily.lockConfirm', 'ロックすると更新できなくなります。'))) return
  try { report.value = await lockDailyReport(date.value); toast.showSuccess(t('wms.daily.locked', 'ロックしました')) }
  catch (e: any) { toast.showError(e?.message) }
}

onMounted(() => loadData())
</script>

<style scoped>
.daily-detail { display: flex; flex-direction: column; gap: 16px; padding: 0 20px 20px; }
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.info-bar { display: flex; gap: 1.5rem; padding: 0.75rem 1rem; background: var(--o-gray-50, #fafafa); border-radius: 6px; margin-bottom: 1rem; font-size: 13px; flex-wrap: wrap; }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.summary-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 1rem;
}
.summary-title { font-size: 15px; font-weight: 600; color: var(--o-gray-700); margin: 0 0 0.75rem 0; padding-bottom: 0.5rem; border-bottom: 1px solid var(--o-border-color, #e4e7ed); }
.summary-items { display: flex; flex-direction: column; gap: 0.5rem; }
.summary-item { display: flex; justify-content: space-between; font-size: 13px; color: var(--o-gray-600); }
.summary-item strong { color: var(--o-gray-800); font-size: 14px; }
.text-success { color: #67c23a; }
.text-danger { color: #f56c6c; }
.text-warning { color: #e6a23c; }
.progress-bar-mini { height: 4px; background: #ebeef5; border-radius: 2px; margin-top: 8px; overflow: hidden; }
.progress-bar-mini-fill { height: 100%; background: #67c23a; border-radius: 2px; transition: width 0.3s; }
</style>
