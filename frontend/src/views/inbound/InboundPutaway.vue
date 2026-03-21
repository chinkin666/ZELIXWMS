<template>
  <div class="inbound-putaway">
    <ControlPanel :title="`${t('wms.inbound.putaway', '棚入れ')} - ${order?.orderNumber || ''}`" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" @click="$router.push('/inbound/orders')">{{ t('wms.inbound.back', '戻る') }}</OButton>
          <OButton
            v-if="order?.status === 'received'"
            variant="primary" size="sm"
            :disabled="!allPutaway"
            @click="handleComplete"
          >{{ t('wms.inbound.inboundComplete', '入庫完了') }}</OButton>
        </div>
      </template>
    </ControlPanel>

    <div v-if="isLoading" class="loading-state">{{ t('wms.ui.loading', '読み込み中...') }}</div>

    <template v-else-if="order">
      <!-- ヘッダー情報 -->
      <div class="o-card info-card">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">{{ t('wms.inbound.orderNumber', '入庫指示番号') }}</span>
            <span class="info-value order-number">{{ order.orderNumber }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('wms.common.status', '状態') }}</span>
            <span class="o-status-tag" :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('wms.inbound.defaultDestination', 'デフォルト入庫先') }}</span>
            <span class="info-value">{{ getDestCode(order) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('wms.inbound.putawayProgress', '棚入れ進捗') }}</span>
            <span class="info-value">
              <span :class="{ 'text-success': putawayCount >= order.lines.length }">
                {{ putawayCount }} / {{ order.lines.length }} {{ t('wms.inbound.lines', '行') }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- 棚入れテーブル -->
      <div class="o-table-wrapper">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width:40px;">#</th>
              <th class="o-table-th" style="width:140px;">SKU</th>
              <th class="o-table-th" style="width:200px;">{{ t('wms.inbound.productName', '商品名') }}</th>
              <th class="o-table-th o-table-th--right" style="width:80px;">{{ t('wms.inbound.receivedQty', '入庫数') }}</th>
              <th class="o-table-th" style="width:200px;">{{ t('wms.inbound.putawayLocation', '棚入れ先') }}</th>
              <th class="o-table-th o-table-th--right" style="width:100px;">{{ t('wms.inbound.putawayQty', '棚入れ数') }}</th>
              <th class="o-table-th" style="width:120px;">{{ t('wms.common.status', '状態') }}</th>
              <th class="o-table-th" style="width:120px;">{{ t('wms.common.actions', '操作') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in order.lines" :key="line.lineNumber" class="o-table-row" :class="{ 'row-done': line.putawayQuantity >= line.receivedQuantity }">
              <td class="o-table-td" style="text-align:center;">{{ line.lineNumber }}</td>
              <td class="o-table-td"><span class="sku-text">{{ line.productSku }}</span></td>
              <td class="o-table-td">{{ line.productName || '-' }}</td>
              <td class="o-table-td o-table-td--right">{{ line.receivedQuantity }}</td>
              <td class="o-table-td">
                <template v-if="line.putawayQuantity >= line.receivedQuantity">
                  <span class="location-badge">{{ getPutawayLocCode(line) }}</span>
                </template>
                <template v-else>
                  <div style="display:flex;flex-direction:column;gap:2px;">
                    <select
                      v-model="putawaySelections[line.lineNumber]"
                      class="o-input o-input-sm"
                      style="width:180px;"
                    >
                      <option value="">{{ t('wms.inbound.selectLocation', 'ロケーション選択') }}</option>
                      <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
                        {{ loc.code }} ({{ loc.name }})
                      </option>
                    </select>
                    <span v-if="suggestions[line.lineNumber]?.reason" class="suggestion-hint">
                      &#x2728; {{ suggestions[line.lineNumber]?.reason }}
                    </span>
                  </div>
                </template>
              </td>
              <td class="o-table-td o-table-td--right">
                {{ line.putawayQuantity || 0 }} / {{ line.receivedQuantity }}
              </td>
              <td class="o-table-td">
                <span v-if="line.putawayQuantity >= line.receivedQuantity" class="text-success">{{ t('wms.inbound.complete', '完了') }}</span>
                <span v-else class="text-warning">{{ t('wms.inbound.unprocessed', '未処理') }}</span>
              </td>
              <td class="o-table-td">
                <OButton
                  v-if="line.putawayQuantity < line.receivedQuantity && order.status === 'received'"
                  variant="primary" size="sm"
                  :disabled="!putawaySelections[line.lineNumber] || isPutaway"
                  @click="handlePutaway(line.lineNumber)"
                >{{ t('wms.inbound.putaway', '棚入れ') }}</OButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 一括棚入れ -->
      <div v-if="order.status === 'received' && !allPutaway" class="o-card bulk-putaway-card">
        <h3 style="margin:0 0 12px 0;font-size:15px;font-weight:600;">{{ t('wms.inbound.bulkPutaway', '一括棚入れ') }}</h3>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:13px;color:var(--o-gray-600);">{{ t('wms.inbound.bulkPutawayDesc', '全行を同一ロケーションに棚入れ') }}:</span>
          <select v-model="bulkLocationId" class="o-input o-input-sm" style="width:200px;">
            <option value="">{{ t('wms.inbound.selectLocation', 'ロケーション選択') }}</option>
            <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
              {{ loc.code }} ({{ loc.name }})
            </option>
          </select>
          <OButton
            variant="primary" size="sm"
            :disabled="!bulkLocationId || isPutaway"
            @click="handleBulkPutaway"
          >{{ t('wms.inbound.putawayAll', '全行棚入れ') }}</OButton>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { fetchInboundOrder, putawayInboundLine, completeInboundOrder, fetchPutawaySuggestions } from '@/api/inboundOrder'
import type { LocationSuggestion } from '@/api/inboundOrder'
import { fetchLocations } from '@/api/location'
import type { InboundOrder, InboundOrderLine, Location } from '@/types/inventory'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const isLoading = ref(false)
const isPutaway = ref(false)
const order = ref<InboundOrder | null>(null)
const physicalLocations = ref<Location[]>([])
const putawaySelections = reactive<Record<number, string>>({})
const bulkLocationId = ref('')
const suggestions = ref<Record<number, LocationSuggestion>>({})

const putawayCount = computed(() =>
  order.value?.lines.filter(l => l.putawayQuantity >= l.receivedQuantity && l.receivedQuantity > 0).length ?? 0,
)

const allPutaway = computed(() =>
  order.value ? order.value.lines.every(l => l.putawayQuantity >= l.receivedQuantity && l.receivedQuantity > 0) : false,
)

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    draft: t('wms.inbound.statusDraft', '下書き'),
    confirmed: t('wms.inbound.statusConfirmed', '確認済'),
    receiving: t('wms.inbound.statusReceiving', '入庫中'),
    received: t('wms.inbound.statusReceived', '検品済'),
    done: t('wms.inbound.statusDone', '完了'),
    cancelled: t('wms.inbound.statusCancelled', 'キャンセル'),
  }
  return map[s] || s
}

const statusClass = (s: string) => {
  const map: Record<string, string> = {
    draft: 'o-status-tag--draft', confirmed: 'o-status-tag--issued', receiving: 'o-status-tag--printed',
    received: 'o-status-tag--issued', done: 'o-status-tag--confirmed', cancelled: 'o-status-tag--cancelled',
  }
  return map[s] || ''
}

const getDestCode = (o: InboundOrder) => {
  if (typeof o.destinationLocationId === 'object' && o.destinationLocationId?.code) {
    return `${o.destinationLocationId.code} (${o.destinationLocationId.name})`
  }
  return String(o.destinationLocationId || '-')
}

const getPutawayLocCode = (line: InboundOrderLine) => {
  if (typeof line.putawayLocationId === 'object' && line.putawayLocationId?.code) {
    return `${line.putawayLocationId.code} (${line.putawayLocationId.name})`
  }
  return String(line.putawayLocationId || '-')
}

const handlePutaway = async (lineNumber: number) => {
  if (!order.value || isPutaway.value) return
  const locationId = putawaySelections[lineNumber]
  if (!locationId) return

  isPutaway.value = true
  try {
    const result = await putawayInboundLine(order.value._id, { lineNumber, locationId })
    toast.showSuccess(result.message)
    // Reload to get updated data with populated locations
    await loadOrder()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.putawayFailed', '棚入れに失敗しました'))
  } finally {
    isPutaway.value = false
  }
}

const handleBulkPutaway = async () => {
  if (!order.value || !bulkLocationId.value || isPutaway.value) return
  isPutaway.value = true
  try {
    for (const line of order.value.lines) {
      if (line.putawayQuantity >= line.receivedQuantity) continue
      await putawayInboundLine(order.value._id, {
        lineNumber: line.lineNumber,
        locationId: bulkLocationId.value,
      })
    }
    toast.showSuccess(t('wms.inbound.allPutawayComplete', '全行の棚入れが完了しました'))
    await loadOrder()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.bulkPutawayFailed', '一括棚入れに失敗しました'))
  } finally {
    isPutaway.value = false
  }
}

const handleComplete = async () => {
  if (!order.value) return
  try {
    await ElMessageBox.confirm(
      t('wms.inbound.confirmComplete', '入庫を完了にしますか？ / 确定要完成入库吗？'),
      '確認 / 确认',
      { confirmButtonText: '完了 / 完成', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try {
    await completeInboundOrder(order.value._id)
    toast.showSuccess(t('wms.inbound.orderCompleted', '入庫指示を完了にしました'))
    router.push('/inbound/orders')
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.completeFailed', '完了に失敗しました'))
  }
}

const loadOrder = async () => {
  isLoading.value = true
  try {
    const id = route.params.id as string
    order.value = await fetchInboundOrder(id)

    // ロケーション推薦を取得 / 获取位置推荐
    try {
      const result = await fetchPutawaySuggestions(id)
      for (const s of result.suggestions) {
        suggestions.value[s.lineNumber] = s
      }
    } catch {
      // 推薦取得失敗は無視 / 推荐获取失败忽略
    }

    // Initialize putaway selections（推薦があれば自動設定）/ 初始化（有推荐则自动设置）
    for (const line of order.value.lines) {
      if (!putawaySelections[line.lineNumber]) {
        const sg = suggestions.value[line.lineNumber]
        putawaySelections[line.lineNumber] = sg?.suggestedLocationId || ''
      }
    }
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.fetchOrderFailed', '入庫指示の取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

const loadLocations = async () => {
  try {
    const all = await fetchLocations({ isActive: true })
    physicalLocations.value = all.filter(l => !l.type.startsWith('virtual/'))
  } catch {
    // ignore
  }
}

onMounted(() => {
  loadOrder()
  loadLocations()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.inbound-putaway {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.loading-state {
  text-align: center;
  padding: 3rem;
  color: var(--o-gray-500, #909399);
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
}

.order-number {
  font-family: monospace;
  color: var(--o-brand-primary, #0052A3);
}

.sku-text {
  font-family: monospace;
  font-weight: 600;
}

.location-badge {
  font-family: monospace;
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 6px;
  border-radius: 3px;
}

.row-done {
  background: #f0f9eb !important;
}

.text-success { color: #67c23a; font-weight: 600; }
.text-warning { color: #e6a23c; font-weight: 600; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }

.o-input {
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 13px;
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
}

.bulk-putaway-card {
  background: var(--o-gray-50, #fafafa);
}

.o-status-tag--draft { background: #f4f4f5; color: #909399; }
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }

.suggestion-hint {
  font-size: 11px;
  color: var(--o-brand-primary, #0052A3);
  white-space: nowrap;
}

/* モバイルレスポンシブ対応 / 移动端响应式适配 */
@media (max-width: 768px) {
  /* 全体パディング縮小 / 整体内边距缩小 */
  .inbound-putaway { padding: 0 12px 12px; }

  /* 情報カード縦積み / 信息卡片纵向排列 */
  .info-grid { flex-direction: column; gap: 8px; }

  /* カードパディング縮小 / 卡片内边距缩小 */
  .o-card { padding: 12px; margin-bottom: 0.5rem; }

  /* テーブル横スクロール / 表格横向滚动 */
  .o-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }

  /* 入力フィールド全幅 / 输入框全宽 */
  .o-input, select.o-input { width: 100% !important; }

  /* 一括棚入れセクション縦積み / 批量上架区域纵向排列 */
  .bulk-putaway-card { padding: 12px; }
}
</style>
