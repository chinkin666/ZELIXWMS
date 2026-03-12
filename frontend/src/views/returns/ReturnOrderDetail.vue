<template>
  <div class="return-detail">
    <ControlPanel :title="`返品詳細 - ${order?.orderNumber || ''}`" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" @click="$router.push('/returns/list')">一覧へ</OButton>
          <OButton v-if="order?.status === 'draft'" variant="primary" size="sm" @click="handleStartInspection">検品開始</OButton>
          <OButton v-if="order?.status === 'inspecting'" variant="success" size="sm" @click="handleSaveInspection">検品保存</OButton>
          <OButton v-if="order?.status === 'inspecting'" variant="primary" size="sm" @click="handleComplete">完了（在庫反映）</OButton>
        </div>
      </template>
    </ControlPanel>

    <div v-if="isLoading" style="padding:2rem;text-align:center;color:var(--o-gray-500);">読み込み中...</div>

    <template v-else-if="order">
      <div class="info-bar">
        <span><strong>状態:</strong> <span class="o-status-tag" :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span></span>
        <span><strong>理由:</strong> {{ reasonLabel(order.returnReason) }}</span>
        <span v-if="order.customerName"><strong>顧客:</strong> {{ order.customerName }}</span>
        <span v-if="order.shipmentOrderNumber"><strong>元出荷:</strong> {{ order.shipmentOrderNumber }}</span>
        <span><strong>受付日:</strong> {{ formatDate(order.receivedDate) }}</span>
      </div>
      <div v-if="order.reasonDetail" class="info-bar" style="background:var(--o-gray-100);">
        <span><strong>理由詳細:</strong> {{ order.reasonDetail }}</span>
      </div>

      <div class="o-table-wrapper">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width:40px;">#</th>
              <th class="o-table-th" style="width:120px;">SKU</th>
              <th class="o-table-th">商品名</th>
              <th class="o-table-th o-table-th--right" style="width:70px;">数量</th>
              <th class="o-table-th o-table-th--right" style="width:80px;">検品済</th>
              <th class="o-table-th" style="width:110px;">判定</th>
              <th class="o-table-th o-table-th--right" style="width:80px;">再入庫</th>
              <th class="o-table-th o-table-th--right" style="width:80px;">廃棄</th>
              <th class="o-table-th" style="width:100px;">メモ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, idx) in order.lines" :key="idx" class="o-table-row">
              <td class="o-table-td">{{ line.lineNumber }}</td>
              <td class="o-table-td" style="font-family:monospace;">{{ line.productSku }}</td>
              <td class="o-table-td">{{ line.productName || '-' }}</td>
              <td class="o-table-td o-table-td--right">{{ line.quantity }}</td>
              <td class="o-table-td o-table-td--right">
                <input v-if="order?.status === 'inspecting'" v-model.number="inspInputs[idx]!.inspectedQuantity" type="number" min="0" class="o-input o-input-sm" style="width:60px;text-align:right;" />
                <span v-else>{{ line.inspectedQuantity }}</span>
              </td>
              <td class="o-table-td">
                <select v-if="order?.status === 'inspecting'" v-model="inspInputs[idx]!.disposition" class="o-input o-input-sm" style="width:90px;">
                  <option value="pending">未判定</option>
                  <option value="restock">再入庫</option>
                  <option value="dispose">廃棄</option>
                  <option value="repair">修理</option>
                </select>
                <span v-else :class="`disp-${line.disposition}`">{{ dispLabel(line.disposition) }}</span>
              </td>
              <td class="o-table-td o-table-td--right">
                <input v-if="order?.status === 'inspecting'" v-model.number="inspInputs[idx]!.restockedQuantity" type="number" min="0" class="o-input o-input-sm" style="width:60px;text-align:right;" />
                <span v-else>{{ line.restockedQuantity }}</span>
              </td>
              <td class="o-table-td o-table-td--right">
                <input v-if="order?.status === 'inspecting'" v-model.number="inspInputs[idx]!.disposedQuantity" type="number" min="0" class="o-input o-input-sm" style="width:60px;text-align:right;" />
                <span v-else>{{ line.disposedQuantity }}</span>
              </td>
              <td class="o-table-td">{{ line.memo || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import {
  fetchReturnOrder,
  startReturnInspection,
  inspectReturnLines,
  completeReturnOrder,
} from '@/api/returnOrder'
import type { ReturnOrder } from '@/api/returnOrder'

const route = useRoute()
const toast = useToast()
const isLoading = ref(true)
const order = ref<ReturnOrder | null>(null)

interface InspInput { inspectedQuantity: number; disposition: string; restockedQuantity: number; disposedQuantity: number }
const inspInputs = ref<InspInput[]>([])

const statusLabel = (s: string) => ({ draft: '下書き', inspecting: '検品中', completed: '完了', cancelled: 'キャンセル' }[s] || s)
const statusClass = (s: string) => ({ draft: 'o-status-tag--draft', inspecting: 'o-status-tag--printed', completed: 'o-status-tag--confirmed', cancelled: 'o-status-tag--cancelled' }[s] || '')
const reasonLabel = (r: string) => ({ customer_request: 'お客様都合', defective: '不良品', wrong_item: '誤配送', damaged: '破損', other: 'その他' }[r] || r)
const dispLabel = (d: string) => ({ restock: '再入庫', dispose: '廃棄', repair: '修理', pending: '未判定' }[d] || d)
const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP')

const loadData = async () => {
  isLoading.value = true
  try {
    const data = await fetchReturnOrder(route.params.id as string)
    order.value = data
    inspInputs.value = data.lines.map(l => ({
      inspectedQuantity: l.inspectedQuantity,
      disposition: l.disposition,
      restockedQuantity: l.restockedQuantity,
      disposedQuantity: l.disposedQuantity,
    }))
  } catch (e: any) { toast.showError(e?.message) } finally { isLoading.value = false }
}

const handleStartInspection = async () => {
  try { await startReturnInspection(route.params.id as string); toast.showSuccess('検品を開始しました'); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}

const handleSaveInspection = async () => {
  const inspections = inspInputs.value.map((inp, idx) => ({ lineIndex: idx, ...inp }))
  try {
    const data = await inspectReturnLines(route.params.id as string, inspections)
    order.value = data
    toast.showSuccess('検品結果を保存しました')
  } catch (e: any) { toast.showError(e?.message) }
}

const handleComplete = async () => {
  if (!confirm('返品を完了し在庫に反映しますか？')) return
  try {
    const res = await completeReturnOrder(route.params.id as string)
    toast.showSuccess(`完了: 再入庫${res.restockedTotal}点 / 廃棄${res.disposedTotal}点`)
    if (res.errors.length) toast.showError(res.errors.join(', '))
    await loadData()
  } catch (e: any) { toast.showError(e?.message) }
}

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.return-detail { display: flex; flex-direction: column; padding: 1rem; }
.info-bar { display: flex; gap: 1.5rem; padding: 0.75rem 1rem; background: var(--o-gray-50, #fafafa); border-radius: 6px; margin-bottom: 0.75rem; font-size: 13px; flex-wrap: wrap; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
.o-status-tag--draft { background: #f4f4f5; color: #909399; }
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
.disp-restock { color: #67c23a; font-weight: 600; }
.disp-dispose { color: #f56c6c; font-weight: 600; }
.disp-repair { color: #e6a23c; font-weight: 600; }
.disp-pending { color: #909399; }
</style>
