<template>
  <div class="inbound-receive">
    <ControlPanel :title="`入庫検品 - ${order?.orderNumber || ''}`" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" @click="$router.push('/inbound/orders')">戻る</OButton>
      </template>
    </ControlPanel>

    <div v-if="isLoading" class="loading-state">読み込み中...</div>

    <template v-else-if="order">
      <!-- 入庫指示ヘッダー -->
      <div class="o-card info-card">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">入庫指示番号</span>
            <span class="info-value order-number">{{ order.orderNumber }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">状態</span>
            <span class="o-status-tag" :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">仕入先</span>
            <span class="info-value">{{ order.supplier?.name || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">入庫先</span>
            <span class="info-value">{{ getDestCode(order) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">進捗</span>
            <span class="info-value">
              <span :class="{ 'text-success': totalReceived >= totalExpected && totalExpected > 0 }">
                {{ totalReceived }} / {{ totalExpected }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- 検品モード切替 -->
      <div class="o-card mode-card" v-if="order.status === 'confirmed' || order.status === 'receiving'">
        <div class="mode-row">
          <span class="mode-label">検品方式:</span>
          <div class="mode-tabs">
            <button
              v-for="m in inspectionModes" :key="m.key"
              class="mode-tab" :class="{ 'mode-tab--active': inspectionMode === m.key }"
              @click="inspectionMode = m.key"
            >{{ m.label }}</button>
          </div>
        </div>
      </div>

      <!-- スキャン検品 -->
      <div class="o-card scan-card" v-if="(order.status === 'confirmed' || order.status === 'receiving') && inspectionMode === 'scan'">
        <div class="scan-row">
          <input
            ref="scanInputRef"
            v-model="scanInput"
            type="text"
            class="o-input scan-input"
            placeholder="バーコード or SKUをスキャン / 入力..."
            @keydown.enter="handleScan"
            autofocus
          />
          <input
            v-model.number="scanQuantity"
            type="number"
            min="1"
            class="o-input"
            style="width:80px;text-align:right;"
          />
          <OButton variant="primary" @click="handleScan" :disabled="isReceiving">入庫</OButton>
        </div>
        <p v-if="scanMessage" class="scan-message" :class="{ 'scan-error': scanIsError }">{{ scanMessage }}</p>
      </div>

      <!-- 一括確認 -->
      <div class="o-card scan-card" v-if="(order.status === 'confirmed' || order.status === 'receiving') && inspectionMode === 'bulk'">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:14px;color:var(--o-gray-600);">全行を予定数量で入庫します（信頼できる仕入先向け）</span>
          <OButton variant="success" @click="handleBulkReceive" :disabled="isReceiving">一括確認</OButton>
        </div>
        <p v-if="scanMessage" class="scan-message" :class="{ 'scan-error': scanIsError }">{{ scanMessage }}</p>
      </div>

      <!-- 入庫明細テーブル -->
      <div class="o-table-wrapper">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width:40px;">#</th>
              <th class="o-table-th" style="width:140px;">SKU</th>
              <th class="o-table-th" style="width:200px;">商品名</th>
              <th class="o-table-th" style="width:140px;">ロット</th>
              <th class="o-table-th" style="width:70px;">区分</th>
              <th class="o-table-th o-table-th--right" style="width:100px;">予定数量</th>
              <th class="o-table-th o-table-th--right" style="width:100px;">入庫済</th>
              <th class="o-table-th o-table-th--right" style="width:100px;">残り</th>
              <th class="o-table-th" style="width:100px;">進捗</th>
              <th class="o-table-th" style="width:100px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in order.lines" :key="line.lineNumber" class="o-table-row" :class="{ 'row-done': line.receivedQuantity >= line.expectedQuantity }">
              <td class="o-table-td" style="text-align:center;">{{ line.lineNumber }}</td>
              <td class="o-table-td"><span class="sku-text">{{ line.productSku }}</span></td>
              <td class="o-table-td">{{ line.productName || '-' }}</td>
              <td class="o-table-td">{{ line.lotNumber || '-' }}</td>
              <td class="o-table-td">
                <span class="category-tag" :class="line.stockCategory === 'damaged' ? 'category-tag--damaged' : ''">
                  {{ line.stockCategory === 'damaged' ? '仕損' : '新品' }}
                </span>
              </td>
              <td class="o-table-td o-table-td--right">{{ line.expectedQuantity }}</td>
              <td class="o-table-td o-table-td--right">
                <span :class="{ 'text-success': line.receivedQuantity >= line.expectedQuantity }">
                  {{ line.receivedQuantity }}
                </span>
              </td>
              <td class="o-table-td o-table-td--right">
                {{ Math.max(0, line.expectedQuantity - line.receivedQuantity) }}
              </td>
              <td class="o-table-td">
                <div class="progress-bar">
                  <div class="progress-bar__fill" :style="{ width: progressPercent(line) + '%' }"></div>
                </div>
              </td>
              <td class="o-table-td">
                <template v-if="line.receivedQuantity < line.expectedQuantity && (order.status === 'confirmed' || order.status === 'receiving')">
                  <div v-if="inspectionMode === 'manual'" style="display:flex;gap:4px;align-items:center;">
                    <input
                      v-model.number="manualQuantities[line.lineNumber]"
                      type="number" min="1" :max="line.expectedQuantity - line.receivedQuantity"
                      class="o-input" style="width:60px;text-align:right;padding:4px 6px;font-size:13px;"
                    />
                    <OButton variant="success" size="sm" :disabled="isReceiving || !manualQuantities[line.lineNumber]"
                      @click="handleReceiveLine(line.lineNumber, manualQuantities[line.lineNumber] || 1)"
                    >入庫</OButton>
                  </div>
                  <OButton v-else variant="success" size="sm" :disabled="isReceiving"
                    @click="handleReceiveLine(line.lineNumber, 1)"
                  >+1</OButton>
                </template>
                <span v-else-if="line.receivedQuantity >= line.expectedQuantity" class="text-success">完了</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { fetchInboundOrder, receiveInboundLine, bulkReceiveInbound } from '@/api/inboundOrder'
import type { InboundOrder, InboundOrderLine } from '@/types/inventory'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const isLoading = ref(false)
const isReceiving = ref(false)
const order = ref<InboundOrder | null>(null)

const inspectionMode = ref<'scan' | 'manual' | 'bulk'>('scan')
const inspectionModes = [
  { key: 'scan' as const, label: 'スキャン検品' },
  { key: 'manual' as const, label: '数量入力' },
  { key: 'bulk' as const, label: '一括確認' },
]
const manualQuantities = reactive<Record<number, number>>({})

const scanInputRef = ref<HTMLInputElement | null>(null)
const scanInput = ref('')
const scanQuantity = ref(1)
const scanMessage = ref('')
const scanIsError = ref(false)

const totalExpected = computed(() => order.value?.lines.reduce((s, l) => s + l.expectedQuantity, 0) ?? 0)
const totalReceived = computed(() => order.value?.lines.reduce((s, l) => s + l.receivedQuantity, 0) ?? 0)

const statusLabel = (s: string) => {
  const map: Record<string, string> = { draft: '下書き', confirmed: '確認済', receiving: '入庫中', received: '検品済', done: '完了', cancelled: 'キャンセル' }
  return map[s] || s
}

const statusClass = (s: string) => {
  const map: Record<string, string> = {
    draft: 'o-status-tag--draft',
    confirmed: 'o-status-tag--issued',
    receiving: 'o-status-tag--printed',
    received: 'o-status-tag--issued',
    done: 'o-status-tag--confirmed',
    cancelled: 'o-status-tag--cancelled',
  }
  return map[s] || ''
}

const getDestCode = (o: InboundOrder) => {
  if (typeof o.destinationLocationId === 'object' && o.destinationLocationId?.code) {
    return `${o.destinationLocationId.code} (${o.destinationLocationId.name})`
  }
  return String(o.destinationLocationId || '-')
}

const progressPercent = (line: InboundOrderLine) => {
  if (line.expectedQuantity === 0) return 0
  return Math.min(100, Math.round((line.receivedQuantity / line.expectedQuantity) * 100))
}

const handleScan = () => {
  const input = scanInput.value.trim()
  if (!input || !order.value) return

  // SKU でマッチする行を探す
  const matchLine = order.value.lines.find(l =>
    l.productSku === input && l.receivedQuantity < l.expectedQuantity,
  )

  if (matchLine) {
    handleReceiveLine(matchLine.lineNumber, scanQuantity.value)
    scanInput.value = ''
    scanQuantity.value = 1
  } else {
    scanMessage.value = `SKU "${input}" に該当する未入庫行が見つかりません`
    scanIsError.value = true
  }
}

const handleReceiveLine = async (lineNumber: number, qty: number) => {
  if (!order.value || isReceiving.value) return
  isReceiving.value = true
  scanMessage.value = ''
  try {
    const result = await receiveInboundLine(order.value._id, { lineNumber, receiveQuantity: qty })
    scanMessage.value = result.message
    scanIsError.value = false

    // 更新本地数据
    const line = order.value.lines.find(l => l.lineNumber === lineNumber)
    if (line) {
      line.receivedQuantity = result.line.receivedQuantity
    }
    order.value.status = result.orderStatus as any

    if (result.orderStatus === 'received') {
      toast.showSuccess('検品が全て完了しました。棚入れを行ってください。')
      setTimeout(() => router.push(`/inbound/putaway/${order.value!._id}`), 1500)
    }

    await nextTick()
    scanInputRef.value?.focus()
  } catch (e: any) {
    scanMessage.value = e?.message || '入庫に失敗しました'
    scanIsError.value = true
    toast.showError(scanMessage.value)
  } finally {
    isReceiving.value = false
  }
}

const handleBulkReceive = async () => {
  if (!order.value || isReceiving.value) return
  if (!confirm('全行を予定数量で一括入庫します。よろしいですか？')) return
  isReceiving.value = true
  scanMessage.value = ''
  try {
    const result = await bulkReceiveInbound(order.value._id)
    scanMessage.value = result.message
    scanIsError.value = false
    toast.showSuccess('検品が全て完了しました。棚入れを行ってください。')
    setTimeout(() => router.push(`/inbound/putaway/${order.value!._id}`), 1500)
  } catch (e: any) {
    scanMessage.value = e?.message || '一括検品に失敗しました'
    scanIsError.value = true
    toast.showError(scanMessage.value)
  } finally {
    isReceiving.value = false
  }
}

const loadOrder = async () => {
  isLoading.value = true
  try {
    const id = route.params.id as string
    order.value = await fetchInboundOrder(id)
  } catch (e: any) {
    toast.showError(e?.message || '入庫指示の取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadOrder())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.inbound-receive {
  display: flex;
  flex-direction: column;
  padding: 1rem;
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
  color: var(--o-brand-primary, #714b67);
}

.mode-card {
  background: var(--o-gray-50, #fafafa);
  padding: 0.75rem 1.25rem;
}

.mode-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mode-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
}

.mode-tabs {
  display: flex;
  gap: 0;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  overflow: hidden;
}

.mode-tab {
  padding: 6px 16px;
  font-size: 13px;
  border: none;
  background: var(--o-view-background, #fff);
  color: var(--o-gray-600, #606266);
  cursor: pointer;
  transition: 0.2s;
  border-right: 1px solid var(--o-border-color, #dcdfe6);
}

.mode-tab:last-child {
  border-right: none;
}

.mode-tab--active {
  background: var(--o-brand-primary, #D97756);
  color: #fff;
}

.scan-card {
  background: #fafafa;
}

.scan-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.scan-input {
  flex: 1;
  font-size: 16px;
  padding: 10px 14px;
}

.scan-message {
  margin: 8px 0 0;
  font-size: 14px;
  color: #67c23a;
  font-weight: 500;
}

.scan-error {
  color: #f56c6c;
}

.o-input {
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 14px;
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
}

.sku-text {
  font-family: monospace;
  font-weight: 600;
}

.row-done {
  background: #f0f9eb !important;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--o-gray-200, #e4e7ed);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: #67c23a;
  border-radius: 3px;
  transition: width 0.3s;
}

.text-success { color: #67c23a; font-weight: 600; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }

.category-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  background: #e8f5e9;
  color: #2e7d32;
}
.category-tag--damaged {
  background: #fff3e0;
  color: #e65100;
}

.o-status-tag--draft { background: #f4f4f5; color: #909399; }
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>
