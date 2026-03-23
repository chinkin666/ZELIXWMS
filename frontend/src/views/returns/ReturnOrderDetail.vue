<template>
  <div class="return-detail">
    <PageHeader :title="`${t('wms.returns.detailTitle', '返品詳細')} - ${order?.orderNumber || ''}`" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <Button variant="secondary" size="sm" @click="$router.push('/returns/list')">{{ t('wms.returns.toList', '一覧へ') }}</Button>
          <Button v-if="order?.status === 'draft'" variant="default" size="sm" @click="handleStartInspection">{{ t('wms.returns.startInspection', '検品開始') }}</Button>
          <Button v-if="order?.status === 'inspecting'" variant="default" size="sm" :disabled="hasValidationErrors" @click="handleSaveInspection">{{ t('wms.returns.saveInspection', '検品保存') }}</Button>
          <Button v-if="order?.status === 'inspecting'" variant="default" size="sm" :disabled="hasValidationErrors" @click="handleComplete">{{ t('wms.returns.complete', '完了（在庫反映）') }}</Button>
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
        <span><strong>{{ t('wms.returns.statusLabel', '状態') }}:</strong> <Badge variant="secondary">{{ statusLabel(order.status) }}</Badge></span>
        <span><strong>{{ t('wms.returns.reasonLabel', '理由') }}:</strong> {{ reasonLabel(order.returnReason) }}</span>
        <span v-if="order.customerName"><strong>{{ t('wms.returns.customerLabel', '顧客') }}:</strong> {{ order.customerName }}</span>
        <span v-if="order.shipmentOrderNumber"><strong>{{ t('wms.returns.originalShipment', '元出荷') }}:</strong> {{ order.shipmentOrderNumber }}</span>
        <span><strong>{{ t('wms.returns.receivedDate', '受付日') }}:</strong> {{ formatDate(order.receivedDate) }}</span>
      </div>
      <div v-if="order.reasonDetail" class="info-bar" style="background:var(--o-gray-100);">
        <span><strong>{{ t('wms.returns.reasonDetail', '理由詳細') }}:</strong> {{ order.reasonDetail }}</span>
      </div>

      <div class="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style="width:40px;">#</TableHead>
              <TableHead style="width:120px;">{{ t('wms.returns.sku', 'SKU') }}</TableHead>
              <TableHead>{{ t('wms.returns.productName', '商品名') }}</TableHead>
              <TableHead class="text-right" style="width:70px;">{{ t('wms.returns.quantity', '数量') }}</TableHead>
              <TableHead class="text-right" style="width:80px;">{{ t('wms.returns.inspected', '検品済') }}</TableHead>
              <TableHead style="width:110px;">{{ t('wms.returns.disposition', '判定') }}</TableHead>
              <TableHead class="text-right" style="width:80px;">{{ t('wms.returns.restock', '再入庫') }}</TableHead>
              <TableHead class="text-right" style="width:80px;">{{ t('wms.returns.dispose', '廃棄') }}</TableHead>
              <TableHead v-if="hasRestockLine" style="width:150px;">{{ t('wms.returns.restockLocation', '再入庫先') }}</TableHead>
              <TableHead style="width:100px;">{{ t('wms.returns.memo', 'メモ') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-for="(line, idx) in order.lines" :key="idx">
            <TableRow :class="{ 'row-error': lineErrors[idx]?.length }">
              <TableCell>{{ line.lineNumber }}</TableCell>
              <TableCell style="font-family:monospace;">{{ line.productSku }}</TableCell>
              <TableCell>{{ line.productName || '-' }}</TableCell>
              <TableCell class="text-right">{{ line.quantity }}</TableCell>
              <TableCell class="text-right">
                <Input v-if="order?.status === 'inspecting'" v-model.number="inspInputs[idx]!.inspectedQuantity" type="number" min="0" class="h-8 text-sm" :class="{ 'input-error': lineErrors[idx]?.includes('inspected') }" style="width:60px;text-align:right;" />
                <span v-else>{{ line.inspectedQuantity }}</span>
              </TableCell>
              <TableCell>
                <Select v-if="order?.status === 'inspecting'" v-model="inspInputs[idx]!.disposition">
                  <SelectTrigger class="h-8 w-[90px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{{ t('wms.returns.dispPending', '未判定') }}</SelectItem>
                    <SelectItem value="restock">{{ t('wms.returns.dispRestock', '再入庫') }}</SelectItem>
                    <SelectItem value="dispose">{{ t('wms.returns.dispDispose', '廃棄') }}</SelectItem>
                    <SelectItem value="repair">{{ t('wms.returns.dispRepair', '修理') }}</SelectItem>
                  </SelectContent>
                </Select>
                <span v-else :class="`disp-${line.disposition}`">{{ dispLabel(line.disposition) }}</span>
              </TableCell>
              <TableCell class="text-right">
                <Input v-if="order?.status === 'inspecting'" v-model.number="inspInputs[idx]!.restockedQuantity" type="number" min="0" class="h-8 text-sm" style="width:60px;text-align:right;" />
                <span v-else>{{ line.restockedQuantity }}</span>
              </TableCell>
              <TableCell class="text-right">
                <Input v-if="order?.status === 'inspecting'" v-model.number="inspInputs[idx]!.disposedQuantity" type="number" min="0" class="h-8 text-sm" style="width:60px;text-align:right;" />
                <span v-else>{{ line.disposedQuantity }}</span>
              </TableCell>
              <TableCell v-if="hasRestockLine">
                <Select
                  v-if="order?.status === 'inspecting' && inspInputs[idx]!.disposition === 'restock'"
                  :model-value="inspInputs[idx]!.locationId || '__empty__'"
                  @update:model-value="(v: string) => inspInputs[idx]!.locationId = v === '__empty__' ? '' : v"
                >
                  <SelectTrigger class="h-8 w-[130px] text-sm">
                    <SelectValue :placeholder="t('wms.common.pleaseSelect', '選択...')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">{{ t('wms.common.pleaseSelect', '選択...') }}</SelectItem>
                    <SelectItem v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
                      {{ loc.code }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <span v-else-if="order?.status !== 'inspecting' && line.locationId">
                  {{ locationName(line.locationId) }}
                </span>
                <span v-else>-</span>
              </TableCell>
              <TableCell>{{ line.memo || '-' }}</TableCell>
            </TableRow>
            <TableRow v-if="order?.status === 'inspecting' && lineErrorMessages[idx]?.length" class="error-row">
              <TableCell :colspan="hasRestockLine ? 10 : 9" class="error-messages">
                <span v-for="(msg, mi) in lineErrorMessages[idx]" :key="mi" class="error-msg">{{ msg }}</span>
              </TableCell>
            </TableRow>
            </template>
          </TableBody>
        </Table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import {
  fetchReturnOrder,
  startReturnInspection,
  inspectReturnLines,
  completeReturnOrder,
} from '@/api/returnOrder'
import type { ReturnOrder } from '@/api/returnOrder'
import { fetchLocations } from '@/api/location'
import type { Location } from '@/types/inventory'
import { computed, onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
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
const statusClass = (s: string) => ({ draft: 'bg-muted text-muted-foreground', inspecting: 'bg-amber-100 text-amber-800', completed: 'bg-blue-100 text-blue-800', cancelled: 'bg-red-100 text-red-800' }[s] || '')
const reasonLabel = (r: string) => ({ customer_request: t('wms.returns.reasonCustomerRequest', 'お客様都合'), defective: t('wms.returns.reasonDefective', '不良品'), wrong_item: t('wms.returns.reasonWrongItem', '誤配送'), damaged: t('wms.returns.reasonDamaged', '破損'), other: t('wms.returns.reasonOther', 'その他') }[r] || r)
const dispLabel = (d: string) => ({ restock: t('wms.returns.dispRestock', '再入庫'), dispose: t('wms.returns.dispDispose', '廃棄'), repair: t('wms.returns.dispRepair', '修理'), pending: t('wms.returns.dispPending', '未判定') }[d] || d)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('ja-JP') : '-'

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
  } catch (e: any) { toast.showError(e?.message || 'エラーが発生しました') } finally { isLoading.value = false }
}

const handleStartInspection = async () => {
  try { await startReturnInspection(route.params.id as string); toast.showSuccess(t('wms.returns.inspectionStarted', '検品を開始しました')); await loadData() }
  catch (e: any) { toast.showError(e?.message || 'エラーが発生しました') }
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
  } catch (e: any) { toast.showError(e?.message || 'エラーが発生しました') }
}

const handleComplete = async () => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    const res = await completeReturnOrder(route.params.id as string)
    toast.showSuccess(t('wms.returns.completeSuccess', `完了: 再入庫${res.restockedTotal}点 / 廃棄${res.disposedTotal}点`))
    if (res.errors.length) toast.showError(res.errors.join(', '))
    await loadData()
  } catch (e: any) { toast.showError(e?.message || 'エラーが発生しました') }
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
