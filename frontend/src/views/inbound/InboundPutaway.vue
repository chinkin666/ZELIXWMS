<template>
  <div class="inbound-putaway">
    <ControlPanel :title="`棚入れ - ${order?.orderNumber || ''}`" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" @click="$router.push('/inbound/orders')">戻る</OButton>
          <OButton
            v-if="order?.status === 'received'"
            variant="primary" size="sm"
            :disabled="!allPutaway"
            @click="handleComplete"
          >入庫完了</OButton>
        </div>
      </template>
    </ControlPanel>

    <div v-if="isLoading" class="loading-state">読み込み中...</div>

    <template v-else-if="order">
      <!-- ヘッダー情報 -->
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
            <span class="info-label">デフォルト入庫先</span>
            <span class="info-value">{{ getDestCode(order) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">棚入れ進捗</span>
            <span class="info-value">
              <span :class="{ 'text-success': putawayCount >= order.lines.length }">
                {{ putawayCount }} / {{ order.lines.length }} 行
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
              <th class="o-table-th" style="width:200px;">商品名</th>
              <th class="o-table-th o-table-th--right" style="width:80px;">入庫数</th>
              <th class="o-table-th" style="width:200px;">棚入れ先</th>
              <th class="o-table-th o-table-th--right" style="width:100px;">棚入れ数</th>
              <th class="o-table-th" style="width:120px;">状態</th>
              <th class="o-table-th" style="width:120px;">操作</th>
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
                  <select
                    v-model="putawaySelections[line.lineNumber]"
                    class="o-input o-input-sm"
                    style="width:180px;"
                  >
                    <option value="">ロケーション選択</option>
                    <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
                      {{ loc.code }} ({{ loc.name }})
                    </option>
                  </select>
                </template>
              </td>
              <td class="o-table-td o-table-td--right">
                {{ line.putawayQuantity || 0 }} / {{ line.receivedQuantity }}
              </td>
              <td class="o-table-td">
                <span v-if="line.putawayQuantity >= line.receivedQuantity" class="text-success">完了</span>
                <span v-else class="text-warning">未処理</span>
              </td>
              <td class="o-table-td">
                <OButton
                  v-if="line.putawayQuantity < line.receivedQuantity && order.status === 'received'"
                  variant="primary" size="sm"
                  :disabled="!putawaySelections[line.lineNumber] || isPutaway"
                  @click="handlePutaway(line.lineNumber)"
                >棚入れ</OButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 一括棚入れ -->
      <div v-if="order.status === 'received' && !allPutaway" class="o-card bulk-putaway-card">
        <h3 style="margin:0 0 12px 0;font-size:15px;font-weight:600;">一括棚入れ</h3>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:13px;color:var(--o-gray-600);">全行を同一ロケーションに棚入れ:</span>
          <select v-model="bulkLocationId" class="o-input o-input-sm" style="width:200px;">
            <option value="">ロケーション選択</option>
            <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
              {{ loc.code }} ({{ loc.name }})
            </option>
          </select>
          <OButton
            variant="primary" size="sm"
            :disabled="!bulkLocationId || isPutaway"
            @click="handleBulkPutaway"
          >全行棚入れ</OButton>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { fetchInboundOrder, putawayInboundLine, completeInboundOrder } from '@/api/inboundOrder'
import { fetchLocations } from '@/api/location'
import type { InboundOrder, InboundOrderLine, Location } from '@/types/inventory'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const isLoading = ref(false)
const isPutaway = ref(false)
const order = ref<InboundOrder | null>(null)
const physicalLocations = ref<Location[]>([])
const putawaySelections = reactive<Record<number, string>>({})
const bulkLocationId = ref('')

const putawayCount = computed(() =>
  order.value?.lines.filter(l => l.putawayQuantity >= l.receivedQuantity && l.receivedQuantity > 0).length ?? 0,
)

const allPutaway = computed(() =>
  order.value ? order.value.lines.every(l => l.putawayQuantity >= l.receivedQuantity && l.receivedQuantity > 0) : false,
)

const statusLabel = (s: string) => {
  const map: Record<string, string> = { draft: '下書き', confirmed: '確認済', receiving: '入庫中', received: '検品済', done: '完了', cancelled: 'キャンセル' }
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
    toast.showError(e?.message || '棚入れに失敗しました')
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
    toast.showSuccess('全行の棚入れが完了しました')
    await loadOrder()
  } catch (e: any) {
    toast.showError(e?.message || '一括棚入れに失敗しました')
  } finally {
    isPutaway.value = false
  }
}

const handleComplete = async () => {
  if (!order.value) return
  if (!confirm('入庫を完了にしますか？')) return
  try {
    await completeInboundOrder(order.value._id)
    toast.showSuccess('入庫指示を完了にしました')
    router.push('/inbound/orders')
  } catch (e: any) {
    toast.showError(e?.message || '完了に失敗しました')
  }
}

const loadOrder = async () => {
  isLoading.value = true
  try {
    const id = route.params.id as string
    order.value = await fetchInboundOrder(id)
    // Initialize putaway selections
    for (const line of order.value.lines) {
      if (!putawaySelections[line.lineNumber]) {
        putawaySelections[line.lineNumber] = ''
      }
    }
  } catch (e: any) {
    toast.showError(e?.message || '入庫指示の取得に失敗しました')
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
  color: var(--o-brand-primary, #D97756);
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
</style>
