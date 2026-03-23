<template>
  <div class="label-reissue">
    <PageHeader :title="t('wms.shipment.labelReissue', '送り状再発行')" :show-search="false" />

    <!-- 検索 / 搜索 -->
    <div class="rounded-lg border bg-card p-4 search-bar">
      <div class="form-field">
        <label>{{ t('wms.shipment.searchByNumberOrTracking', '注文番号 / 追跡番号') }}</label>
        <div class="search-row">
          <input
            v-model="searchQuery"
            type="text"
           
            :placeholder="t('wms.shipment.labelSearchPlaceholder', '注文番号または追跡番号を入力...')"
            @keyup.enter="handleSearch"
          />
          <Button variant="default" :disabled="!searchQuery || isSearching" @click="handleSearch">
            {{ t('wms.common.search', '検索') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- 注文詳細 / 订单详情 -->
    <div v-if="order" class="rounded-lg border bg-card p-4">
      <h3 class="form-title">{{ t('wms.shipment.orderDetail', '注文詳細') }}: {{ order.orderNumber }}</h3>

      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">{{ t('wms.shipment.recipientName', '届け先氏名') }}</span>
          <span class="detail-value">{{ order.recipientName || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ t('wms.shipment.trackingId', '追跡番号') }}</span>
          <span class="detail-value tracking-id">{{ order.trackingId || t('wms.shipment.noTrackingId', '未設定') }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ t('wms.shipment.carrier', '配送業者') }}</span>
          <span class="detail-value">{{ order.carrierId || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ t('wms.shipment.parcelCount', '個口数') }}</span>
          <span class="detail-value">{{ currentParcelCount }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ t('wms.shipment.printStatus', '印刷状態') }}</span>
          <span class="detail-value" :class="order.statusPrinted ? 'status-printed' : 'status-not-printed'">
            {{ order.statusPrinted ? t('wms.shipment.printed', '印刷済み') : t('wms.shipment.notPrinted', '未印刷') }}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ t('wms.shipment.shipStatus', '出荷状態') }}</span>
          <span class="detail-value" :class="order.statusShipped ? 'status-shipped' : ''">
            {{ order.statusShipped ? t('wms.shipment.shipped', '出荷済み') : t('wms.shipment.notShipped', '未出荷') }}
          </span>
        </div>
      </div>

      <!-- アクションボタン / 操作按钮 -->
      <div class="action-buttons">
        <Button
          variant="default"
          :disabled="!order.trackingId || isProcessing"
          @click="showReissueConfirm = true"
        >
          {{ t('wms.shipment.reissueLabel', '再発行') }}
        </Button>
        <Button
          variant="secondary"
          :disabled="!order.trackingId || isProcessing"
          @click="showAdditionalDialog = true"
        >
          {{ t('wms.shipment.additionalLabel', '追加発行') }}
        </Button>
      </div>
    </div>

    <!-- 検索結果なし / 无搜索结果 -->
    <div v-else-if="searchDone" class="rounded-lg border bg-card p-4 empty-state">
      {{ t('wms.shipment.noOrderFound', '該当する注文が見つかりませんでした。') }}
    </div>

    <!-- 再発行履歴 / 重新发行历史 -->
    <div v-if="reissueHistory.length > 0" class="rounded-lg border bg-card p-4">
      <h3 class="form-title">{{ t('wms.shipment.reissueHistory', '再発行・追加発行履歴') }}</h3>
      <div class="history-table">
        <div class="history-header">
          <span class="col-time">{{ t('wms.common.datetime', '日時') }}</span>
          <span class="col-order">{{ t('wms.shipment.orderNumber', '注文番号') }}</span>
          <span class="col-tracking">{{ t('wms.shipment.trackingId', '追跡番号') }}</span>
          <span class="col-type">{{ t('wms.common.type', '種別') }}</span>
          <span class="col-parcel">{{ t('wms.shipment.parcelCount', '個口数') }}</span>
        </div>
        <div v-for="(entry, idx) in reissueHistory" :key="idx" class="history-row">
          <span class="col-time">{{ entry.datetime }}</span>
          <span class="col-order">{{ entry.orderNumber }}</span>
          <span class="col-tracking">{{ entry.trackingId }}</span>
          <span class="col-type">
            <span :class="entry.type === 'reissue' ? 'badge-reissue' : 'badge-additional'">
              {{ entry.type === 'reissue' ? t('wms.shipment.reissue', '再発行') : t('wms.shipment.additional', '追加発行') }}
            </span>
          </span>
          <span class="col-parcel">{{ entry.parcelCount ?? '-' }}</span>
        </div>
      </div>
    </div>

    <!-- 再発行確認ダイアログ / 重新发行确认对话框 -->
    <div v-if="showReissueConfirm" class="modal-overlay" @click.self="showReissueConfirm = false">
      <div class="modal-content">
        <h3 class="modal-title">{{ t('wms.shipment.reissueConfirmTitle', '送り状再発行の確認') }}</h3>
        <p class="modal-body">
          {{ t('wms.shipment.reissueConfirmMessage', '同じ追跡番号で送り状を再印刷します。よろしいですか？') }}
        </p>
        <p class="modal-detail">
          {{ t('wms.shipment.trackingId', '追跡番号') }}: <strong>{{ order?.trackingId }}</strong>
        </p>
        <div class="modal-actions">
          <Button variant="secondary" @click="showReissueConfirm = false">
            {{ t('wms.common.cancel', 'キャンセル') }}
          </Button>
          <Button variant="default" :disabled="isProcessing" @click="handleReissue">
            {{ isProcessing ? t('wms.common.processing', '処理中...') : t('wms.shipment.reissueLabel', '再発行') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- 追加発行ダイアログ / 追加发行对话框 -->
    <div v-if="showAdditionalDialog" class="modal-overlay" @click.self="showAdditionalDialog = false">
      <div class="modal-content">
        <h3 class="modal-title">{{ t('wms.shipment.additionalLabelTitle', '送り状追加発行') }}</h3>
        <p class="modal-body">
          {{ t('wms.shipment.additionalLabelMessage', '追加の個口数を指定してください。') }}
        </p>
        <div class="form-field" style="margin: 1rem 0">
          <label>{{ t('wms.shipment.parcelCount', '個口数') }}</label>
          <Input v-model.number="additionalParcelCount" type="number" min="1" />
        </div>
        <div class="modal-actions">
          <Button variant="secondary" @click="showAdditionalDialog = false">
            {{ t('wms.common.cancel', 'キャンセル') }}
          </Button>
          <Button variant="default" :disabled="isProcessing || additionalParcelCount < 1" @click="handleAdditionalLabel">
            {{ isProcessing ? t('wms.common.processing', '処理中...') : t('wms.shipment.additionalLabel', '追加発行') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { ref, computed } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/shared/PageHeader.vue'
import { apiFetch } from '@/api/http'
import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()
const toast = useToast()
const { t } = useI18n()

// 検索状態 / 搜索状态
const searchQuery = ref('')
const isSearching = ref(false)
const searchDone = ref(false)
const isProcessing = ref(false)

// ダイアログ状態 / 对话框状态
const showReissueConfirm = ref(false)
const showAdditionalDialog = ref(false)
const additionalParcelCount = ref(1)

// 注文データ型 / 订单数据类型
interface OrderData {
  readonly id: string
  readonly orderNumber: string
  readonly recipientName: string | null
  readonly trackingId: string | null
  readonly carrierId: string | null
  readonly carrierData: Record<string, unknown> | null
  readonly statusPrinted: boolean
  readonly statusShipped: boolean
}

// 再発行履歴エントリ / 重新发行历史条目
interface ReissueHistoryEntry {
  readonly datetime: string
  readonly orderNumber: string
  readonly trackingId: string
  readonly type: 'reissue' | 'additional'
  readonly parcelCount?: number
}

const order = ref<OrderData | null>(null)
const reissueHistory = ref<ReissueHistoryEntry[]>([])

// 現在の個口数（carrierDataから取得）/ 当前包裹数（从carrierData获取）
const currentParcelCount = computed(() => {
  if (!order.value?.carrierData) return 1
  const data = order.value.carrierData as Record<string, unknown>
  return (data.parcelCount as number) ?? 1
})

// 注文検索 / 搜索订单
const handleSearch = async () => {
  if (!searchQuery.value) {
    order.value = null
    searchDone.value = false
    return
  }
  isSearching.value = true
  searchDone.value = false
  order.value = null
  try {
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders?search=${encodeURIComponent(searchQuery.value)}`)
    if (!res.ok) throw new Error(res.statusText)
    const data = await res.json()
    const items = data.items || data || []
    if (items.length > 0) {
      const raw = items[0]
      order.value = {
        id: raw.id || raw._id,
        orderNumber: raw.orderNumber || '',
        recipientName: raw.recipientName || null,
        trackingId: raw.trackingId || null,
        carrierId: raw.carrierId || null,
        carrierData: raw.carrierData || null,
        statusPrinted: raw.statusPrinted ?? false,
        statusShipped: raw.statusShipped ?? false,
      }
    }
    searchDone.value = true
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    toast.showError(message || t('wms.shipment.searchFailed', '検索に失敗しました'))
  } finally {
    isSearching.value = false
  }
}

// 日時フォーマット / 日期时间格式化
const formatDatetime = (date: Date): string => {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// 送り状再発行 / 运单重新发行
const handleReissue = async () => {
  if (!order.value) return
  isProcessing.value = true
  try {
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders/${order.value.id}/reissue-label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || res.statusText)
    }
    const result = await res.json()
    toast.showSuccess(t('wms.shipment.reissueSuccess', '送り状を再発行しました'))

    // 履歴に追加（不変パターン）/ 添加到历史（不可变模式）
    reissueHistory.value = [
      {
        datetime: formatDatetime(new Date()),
        orderNumber: order.value.orderNumber,
        trackingId: result.trackingId || order.value.trackingId || '',
        type: 'reissue',
      },
      ...reissueHistory.value,
    ]

    // 注文データを更新（不変パターン）/ 更新订单数据（不可变模式）
    if (result.order) {
      order.value = {
        ...order.value,
        statusPrinted: result.order.statusPrinted ?? true,
      }
    }

    showReissueConfirm.value = false
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    toast.showError(message || t('wms.shipment.reissueFailed', '再発行に失敗しました'))
  } finally {
    isProcessing.value = false
  }
}

// 送り状追加発行 / 运单追加发行
const handleAdditionalLabel = async () => {
  if (!order.value) return
  isProcessing.value = true
  try {
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders/${order.value.id}/additional-label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parcelCount: additionalParcelCount.value }),
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || res.statusText)
    }
    const result = await res.json()
    toast.showSuccess(t('wms.shipment.additionalSuccess', '追加送り状を発行しました'))

    // 履歴に追加（不変パターン）/ 添加到历史（不可变模式）
    reissueHistory.value = [
      {
        datetime: formatDatetime(new Date()),
        orderNumber: order.value.orderNumber,
        trackingId: result.trackingId || order.value.trackingId || '',
        type: 'additional',
        parcelCount: additionalParcelCount.value,
      },
      ...reissueHistory.value,
    ]

    // 注文データを更新（不変パターン）/ 更新订单数据（不可变模式）
    if (result.order) {
      order.value = {
        ...order.value,
        carrierData: result.order.carrierData || order.value.carrierData,
        statusPrinted: result.order.statusPrinted ?? true,
      }
    }

    showAdditionalDialog.value = false
    additionalParcelCount.value = 1
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    toast.showError(message || t('wms.shipment.additionalFailed', '追加発行に失敗しました'))
  } finally {
    isProcessing.value = false
  }
}
</script>

<style scoped>
.label-reissue { display: flex; flex-direction: column; padding: 0 20px 20px; gap: 16px; }
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.o-card { background: var(--o-view-background, #fff); border: 1px solid var(--o-border-color, #e4e7ed); border-radius: var(--o-border-radius, 8px); padding: 1.5rem; }
.search-bar { display: flex; gap: 1rem; align-items: flex-end; }
.search-row { display: flex; gap: 8px; align-items: center; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--o-gray-700, #303133); }
.form-title { font-size: 18px; font-weight: 600; color: var(--o-gray-700, #303133); margin: 0 0 1rem 0; }
.{ padding: 8px 12px; border: 1px solid var(--o-border-color, #dcdfe6); border-radius: var(--o-border-radius, 4px); font-size: 14px; color: var(--o-gray-700, #303133); background: var(--o-view-background, #fff); width: 100%; }

/* 注文詳細グリッド / 订单详情网格 */
.detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-label { font-size: 12px; font-weight: 600; color: var(--o-gray-500, #909399); text-transform: uppercase; }
.detail-value { font-size: 14px; color: var(--o-gray-700, #303133); font-weight: 500; }
.tracking-id { font-family: monospace; font-size: 15px; color: var(--o-brand-primary, #714b67); }
.status-printed { color: var(--o-success, #67c23a); }
.status-not-printed { color: var(--o-gray-500, #909399); }
.status-shipped { color: var(--o-brand-primary, #714b67); }

/* アクションボタン / 操作按钮 */
.action-buttons { display: flex; gap: 12px; padding-top: 1rem; border-top: 1px solid var(--o-border-color, #e4e7ed); }

/* 履歴テーブル / 历史表 */
.history-table { margin-top: 0.5rem; }
.history-header, .history-row { display: flex; gap: 8px; align-items: center; padding: 8px 0; }
.history-header { font-size: 12px; font-weight: 600; color: var(--o-gray-500, #909399); border-bottom: 1px solid var(--o-border-color, #e4e7ed); }
.history-row { font-size: 13px; border-bottom: 1px solid var(--o-border-color-light, #f0f0f0); }
.col-time { width: 180px; flex-shrink: 0; }
.col-order { width: 160px; flex-shrink: 0; }
.col-tracking { flex: 1; font-family: monospace; }
.col-type { width: 100px; flex-shrink: 0; }
.col-parcel { width: 80px; flex-shrink: 0; text-align: center; }
.badge-reissue { background: var(--o-brand-primary, #714b67); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.badge-additional { background: var(--o-info, #409eff); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px; }

/* モーダル / 模态框 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: var(--o-view-background, #fff); border-radius: var(--o-border-radius, 8px); padding: 2rem; max-width: 480px; width: 90%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15); }
.modal-title { font-size: 18px; font-weight: 600; color: var(--o-gray-700, #303133); margin: 0 0 1rem 0; }
.modal-body { font-size: 14px; color: var(--o-gray-600, #606266); margin: 0 0 0.5rem 0; }
.modal-detail { font-size: 14px; color: var(--o-gray-700, #303133); margin: 0; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 1.5rem; }

/* 空状態 / 空状态 */
.empty-state { text-align: center; color: var(--o-gray-500, #909399); padding: 2rem; }

@media (max-width: 768px) {
  .detail-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
