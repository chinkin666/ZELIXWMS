<template>
  <div class="return-detail">
    <ControlPanel :title="`${t('wms.returns.detailTitle', '返品詳細')} - ${order?.orderNumber || ''}`" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" @click="$router.push('/returns/list')">{{ t('wms.returns.toList', '一覧へ') }}</OButton>
          <OButton v-if="order?.status === 'draft'" variant="primary" size="sm" @click="handleStartInspection">{{ t('wms.returns.startInspection', '検品開始') }}</OButton>
          <OButton v-if="order?.status === 'inspecting'" variant="success" size="sm" :disabled="hasValidationErrors" @click="handleSaveInspection">{{ t('wms.returns.saveInspection', '検品保存') }}</OButton>
          <OButton v-if="order?.status === 'inspecting'" variant="primary" size="sm" :disabled="hasValidationErrors" @click="handleComplete">{{ t('wms.returns.complete', '完了（在庫反映）') }}</OButton>
        </div>
      </template>
    </ControlPanel>

    <div v-if="isLoading" style="padding:2rem;text-align:center;color:var(--o-gray-500);">{{ t('wms.returns.loading', '読み込み中...') }}</div>

    <template v-else-if="order">
      <div class="info-bar">
        <span><strong>{{ t('wms.returns.statusLabel', '状態') }}:</strong> <span class="o-status-tag" :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span></span>
        <span><strong>{{ t('wms.returns.reasonLabel', '理由') }}:</strong> {{ reasonLabel(order.returnReason) }}</span>
        <span v-if="order.customerName"><strong>{{ t('wms.returns.customerLabel', '顧客') }}:</strong> {{ order.customerName }}</span>
        <span v-if="order.shipmentOrderNumber"><strong>{{ t('wms.returns.originalShipment', '元出荷') }}:</strong> {{ order.shipmentOrderNumber }}</span>
        <span><strong>{{ t('wms.returns.receivedDate', '受付日') }}:</strong> {{ formatDate(order.receivedDate) }}</span>
      </div>
      <div v-if="order.reasonDetail" class="info-bar" style="background:var(--o-gray-100);">
        <span><strong>{{ t('wms.returns.reasonDetail', '理由詳細') }}:</strong> {{ order.reasonDetail }}</span>
      </div>

      <div class="o-table-wrapper">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width:40px;">#</th>
              <th class="o-table-th" style="width:120px;">{{ t('wms.returns.sku', 'SKU') }}</th>
              <th class="o-table-th">{{ t('wms.returns.productName', '商品名') }}</th>
              <th class="o-table-th o-table-th--right" style="width:70px;">{{ t('wms.returns.quantity', '数量') }}</th>
              <th class="o-table-th o-table-th--right" style="width:80px;">{{ t('wms.returns.inspected', '検品済') }}</th>
              <th class="o-table-th" style="width:110px;">{{ t('wms.returns.disposition', '判定') }}</th>
              <th class="o-table-th o-table-th--right" style="width:80px;">{{ t('wms.returns.restock', '再入庫') }}</th>
              <th class="o-table-th o-table-th--right" style="width:80px;">{{ t('wms.returns.dispose', '廃棄') }}</th>
              <th v-if="hasRestockLine" class="o-table-th" style="width:150px;">{{ t('wms.returns.restockLocation', '再入庫先') }}</th>
              <th class="o-table-th" style="width:100px;">{{ t('wms.returns.memo', 'メモ') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(line, idx) in order.lines" :key="idx">
            <tr class="o-table-row" :class="{ 'row-error': lineErrors[idx]?.length }">
              <td class="o-table-td">{{ line.lineNumber }}</td>
              <td class="o-table-td" style="font-family:monospace;">{{ line.productSku }}</td>
              <td class="o-table-td">{{ line.productName || '-' }}</td>
              <td class="o-table-td o-table-td--right">{{ line.quantity }}</td>
              <td class="o-table-td o-table-td--right">
                <input v-if="order?.status === 'inspecting'" v-model.number="inspInputs[idx]!.inspectedQuantity" type="number" min="0" class="o-input o-input-sm" :class="{ 'input-error': lineErrors[idx]?.includes('inspected') }" style="width:60px;text-align:right;" />
                <span v-else>{{ line.inspectedQuantity }}</span>
              </td>
              <td class="o-table-td">
                <select v-if="order?.status === 'inspecting'" v-model="inspInputs[idx]!.disposition" class="o-input o-input-sm" style="width:90px;">
                  <option value="pending">{{ t('wms.returns.dispPending', '未判定') }}</option>
                  <option value="restock">{{ t('wms.returns.dispRestock', '再入庫') }}</option>
                  <option value="dispose">{{ t('wms.returns.dispDispose', '廃棄') }}</option>
                  <option value="repair">{{ t('wms.returns.dispRepair', '修理') }}</option>
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
              <td v-if="hasRestockLine" class="o-table-td">
                <select
                  v-if="order?.status === 'inspecting' && inspInputs[idx]!.disposition === 'restock'"
                  v-model="inspInputs[idx]!.locationId"
                  class="o-input o-input-sm"
                  style="width:130px;"
                >
                  <option value="">{{ t('wms.common.pleaseSelect', '選択...') }}</option>
                  <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
                    {{ loc.code }}
                  </option>
                </select>
                <span v-else-if="order?.status !== 'inspecting' && line.locationId">
                  {{ locationName(line.locationId) }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="o-table-td">{{ line.memo || '-' }}</td>
            </tr>
            <tr v-if="order?.status === 'inspecting' && lineErrorMessages[idx]?.length" class="error-row">
              <td :colspan="hasRestockLine ? 10 : 9" class="o-table-td error-messages">
                <span v-for="(msg, mi) in lineErrorMessages[idx]" :key="mi" class="error-msg">{{ msg }}</span>
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import {
  fetchReturnOrder,
  startReturnInspection,
  inspectReturnLines,
  completeReturnOrder,
} from '@/api/returnOrder'
import type { ReturnOrder } from '@/api/returnOrder'
import { fetchLocations } from '@/api/location'
import type { Location } from '@/types/inventory'

const route = useRoute()
const toast = useToast()
const { t } = useI18n()
const isLoading = ref(true)
const order = ref<ReturnOrder | null>(null)

interface InspInput { inspectedQuantity: number; disposition: string; restockedQuantity: number; disposedQuantity: number; locationId: string }
const inspInputs = ref<InspInput[]>([])
const locations = ref<Location[]>([])

// 物理ロケーションのみ（仮想ロケーション除外）/ 仅物理位置（排除虚拟位置）
const physicalLocations = computed(() =>
  locations.value.filter(l => !l.type.startsWith('virtual/')),
)

// 再入庫行が存在するか / 是否存在再入库行
const hasRestockLine = computed(() => {
  if (order.value?.status === 'inspecting') {
    return inspInputs.value.some(inp => inp.disposition === 'restock')
  }
  return order.value?.lines.some(l => l.disposition === 'restock') ?? false
})

// ロケーション名を取得 / 获取位置名
const locationName = (id: string) => {
  const loc = locations.value.find(l => l._id === id)
  return loc ? loc.code : id
}

// バリデーションエラー / 验证错误
const lineErrors = computed(() => {
  if (!order.value || order.value.status !== 'inspecting') return []
  return inspInputs.value.map((inp, idx) => {
    const errors: string[] = []
    const originalQty = order.value!.lines[idx]!.quantity
    if (inp.inspectedQuantity > originalQty) {
      errors.push('inspected')
    }
    if ((inp.restockedQuantity + inp.disposedQuantity) > inp.inspectedQuantity) {
      errors.push('subtotal')
    }
    if (inp.disposition === 'restock' && inp.restockedQuantity > 0 && !inp.locationId) {
      errors.push('location')
    }
    return errors
  })
})

// バリデーションエラーメッセージ / 验证错误消息
const lineErrorMessages = computed(() => {
  if (!order.value || order.value.status !== 'inspecting') return []
  return inspInputs.value.map((inp, idx) => {
    const msgs: string[] = []
    const originalQty = order.value!.lines[idx]!.quantity
    if (inp.inspectedQuantity > originalQty) {
      msgs.push(t('wms.returns.errInspectedExceedsQty', `検品数(${inp.inspectedQuantity})が元数量(${originalQty})を超えています`))
    }
    if ((inp.restockedQuantity + inp.disposedQuantity) > inp.inspectedQuantity) {
      msgs.push(t('wms.returns.errSubtotalExceedsInspected', `再入庫数+廃棄数(${inp.restockedQuantity + inp.disposedQuantity})が検品数(${inp.inspectedQuantity})を超えています`))
    }
    if (inp.disposition === 'restock' && inp.restockedQuantity > 0 && !inp.locationId) {
      msgs.push(t('wms.returns.errLocationRequired', '再入庫先ロケーションを選択してください'))
    }
    return msgs
  })
})

const hasValidationErrors = computed(() =>
  lineErrors.value.some(errs => errs.length > 0),
)

const statusLabel = (s: string) => ({ draft: t('wms.returns.statusDraft', '下書き'), inspecting: t('wms.returns.statusInspecting', '検品中'), completed: t('wms.returns.statusCompleted', '完了'), cancelled: t('wms.returns.statusCancelled', 'キャンセル') }[s] || s)
const statusClass = (s: string) => ({ draft: 'o-status-tag--draft', inspecting: 'o-status-tag--printed', completed: 'o-status-tag--confirmed', cancelled: 'o-status-tag--cancelled' }[s] || '')
const reasonLabel = (r: string) => ({ customer_request: t('wms.returns.reasonCustomerRequest', 'お客様都合'), defective: t('wms.returns.reasonDefective', '不良品'), wrong_item: t('wms.returns.reasonWrongItem', '誤配送'), damaged: t('wms.returns.reasonDamaged', '破損'), other: t('wms.returns.reasonOther', 'その他') }[r] || r)
const dispLabel = (d: string) => ({ restock: t('wms.returns.dispRestock', '再入庫'), dispose: t('wms.returns.dispDispose', '廃棄'), repair: t('wms.returns.dispRepair', '修理'), pending: t('wms.returns.dispPending', '未判定') }[d] || d)
const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP')

const loadData = async () => {
  isLoading.value = true
  try {
    const [data, locs] = await Promise.all([
      fetchReturnOrder(route.params.id as string),
      locations.value.length === 0 ? fetchLocations({ isActive: true }) : Promise.resolve(locations.value),
    ])
    order.value = data
    locations.value = locs
    inspInputs.value = data.lines.map(l => ({
      inspectedQuantity: l.inspectedQuantity,
      disposition: l.disposition,
      restockedQuantity: l.restockedQuantity,
      disposedQuantity: l.disposedQuantity,
      locationId: l.locationId || '',
    }))
  } catch (e: any) { toast.showError(e?.message) } finally { isLoading.value = false }
}

const handleStartInspection = async () => {
  try { await startReturnInspection(route.params.id as string); toast.showSuccess(t('wms.returns.inspectionStarted', '検品を開始しました')); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}

const handleSaveInspection = async () => {
  if (hasValidationErrors.value) return
  const inspections = inspInputs.value.map((inp, idx) => ({
    lineIndex: idx,
    inspectedQuantity: inp.inspectedQuantity,
    disposition: inp.disposition,
    restockedQuantity: inp.restockedQuantity,
    disposedQuantity: inp.disposedQuantity,
    locationId: inp.locationId || undefined,
  }))
  try {
    const data = await inspectReturnLines(route.params.id as string, inspections)
    order.value = data
    toast.showSuccess(t('wms.returns.inspectionSaved', '検品結果を保存しました'))
  } catch (e: any) { toast.showError(e?.message) }
}

const handleComplete = async () => {
  try {
    await ElMessageBox.confirm(
      t('wms.returns.confirmComplete', '返品を完了し在庫に反映しますか？ / 确定要完成退货并反映到库存吗？'),
      '確認 / 确认',
      { confirmButtonText: '完了 / 完成', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try {
    const res = await completeReturnOrder(route.params.id as string)
    toast.showSuccess(t('wms.returns.completeSuccess', `完了: 再入庫${res.restockedTotal}点 / 廃棄${res.disposedTotal}点`))
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
.return-detail { display: flex; flex-direction: column; gap: 16px; padding: 0 20px 20px; }
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.info-bar { display: flex; gap: 1.5rem; padding: 0.75rem 1rem; background: var(--o-gray-50, #fafafa); border-radius: 6px; margin-bottom: 0.75rem; font-size: 13px; flex-wrap: wrap; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
.o-status-tag--draft { background: #f4f4f5; color: #909399; }
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
.disp-restock { color: #67c23a; font-weight: 600; }
.disp-dispose { color: #f56c6c; font-weight: 600; }
.disp-repair { color: #e6a23c; font-weight: 600; }
.disp-pending { color: #909399; }
.row-error { background: #fef0f0; }
.error-row td { padding-top: 0 !important; padding-bottom: 4px !important; border-top: none !important; }
.error-messages { display: flex; flex-wrap: wrap; gap: 8px; }
.error-msg { color: #f56c6c; font-size: 11px; font-weight: 500; }
.input-error { border-color: #f56c6c !important; background: #fef0f0 !important; }
</style>
