<template>
  <div class="inbound-receive">
    <PageHeader :title="`${t('wms.inbound.receiveInspection', '入庫検品')} - ${order?.orderNumber || ''}`" :show-search="false">
      <template #actions>
        <Button variant="secondary" size="sm" @click="$router.push('/inbound/orders')">{{ t('wms.inbound.back', '戻る') }}</Button>
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
      <!-- 入庫指示ヘッダー -->
      <Card class=" info-card">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">{{ t('wms.inbound.orderNumber', '入庫指示番号') }}</span>
            <span class="info-value order-number">{{ order.orderNumber }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('wms.common.status', '状態') }}</span>
            <Badge variant="secondary">{{ statusLabel(order.status) }}</Badge>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('wms.inbound.supplier', '仕入先') }}</span>
            <span class="info-value">{{ order.supplier?.name || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('wms.inbound.destination', '入庫先') }}</span>
            <span class="info-value">{{ getDestCode(order) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('wms.inbound.progress', '進捗') }}</span>
            <span class="info-value">
              <span :class="{ 'text-success': totalReceived >= totalExpected && totalExpected > 0 }">
                {{ totalReceived }} / {{ totalExpected }}
              </span>
            </span>
          </div>
        </div>
      </Card>

      <!-- 差異サマリー（検品完了後に表示）/ 差异摘要（检品完成后显示） -->
      <Card class=" variance-card" v-if="varianceReport && varianceReport.hasVariance && (order.status === 'received' || order.status === 'done')">
        <div class="variance-header">
          <span class="variance-icon">&#x26A0;</span>
          <h4 class="variance-title">{{ t('wms.inbound.varianceDetected', '差異が検出されました') }}</h4>
        </div>
        <div class="variance-summary">
          <span>{{ t('wms.inbound.totalExpected', '予定数') }}: <strong>{{ varianceReport.totalExpected }}</strong></span>
          <span>{{ t('wms.inbound.totalReceived', '検品数') }}: <strong>{{ varianceReport.totalReceived }}</strong></span>
          <span class="variance-diff">{{ t('wms.inbound.variance', '差異') }}: <strong>{{ varianceReport.totalVariance }}</strong></span>
        </div>
        <Table class="variance-table">
          <TableHeader><TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>{{ t('wms.inbound.productName', '商品名') }}</TableHead>
            <TableHead style="text-align:right">{{ t('wms.inbound.expected', '予定') }}</TableHead>
            <TableHead style="text-align:right">{{ t('wms.inbound.received', '実績') }}</TableHead>
            <TableHead style="text-align:right">{{ t('wms.inbound.variance', '差異') }}</TableHead>
            <TableHead>{{ t('wms.common.status', '状態') }}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="vl in varianceReport.lines.filter(l => l.status !== 'ok')" :key="vl.lineNumber" :class="{ 'variance-row--shortage': vl.status === 'shortage', 'variance-row--pending': vl.status === 'pending' }">
              <TableCell class="mono">{{ vl.productSku }}</TableCell>
              <TableCell>{{ vl.productName }}</TableCell>
              <TableCell style="text-align:right">{{ vl.expectedQuantity }}</TableCell>
              <TableCell style="text-align:right">{{ vl.receivedQuantity }}</TableCell>
              <TableCell style="text-align:right;font-weight:600" :class="{ 'text-danger': vl.variance < 0 }">{{ vl.variance }}</TableCell>
              <TableCell>
                <Badge variant="destructive">{{ t('wms.inbound.shortage', '不足') }}</Badge>
                <Badge variant="secondary">{{ t('wms.inbound.pending', '未検品') }}</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      <!-- 検品モード切替 -->
      <Card class=" mode-card" v-if="order.status === 'confirmed' || order.status === 'receiving'">
        <div class="mode-row">
          <span class="mode-label">{{ t('wms.inbound.inspectionMode', '検品方式') }}:</span>
          <div class="mode-tabs">
            <Button
              v-for="m in inspectionModes" :key="m.key"
              :variant="inspectionMode === m.key ? 'default' : 'outline'"
              class="mode-tab" :class="{ 'mode-tab--active': inspectionMode === m.key }"
              @click="inspectionMode = m.key; scanMessage = ''; scanIsError = false; scanQuantity = 1"
            >{{ m.label }}</Button>
          </div>
        </div>
      </Card>

      <!-- スキャン検品 -->
      <Card class=" scan-card" v-if="(order.status === 'confirmed' || order.status === 'receiving') && inspectionMode === 'scan'">
        <div class="scan-row">
          <Input
            ref="scanInputRef"
            v-model="scanInput"
            type="text"
            class="scan-input"
            :placeholder="t('wms.inbound.scanPlaceholder', 'バーコード or SKUをスキャン / 入力...')"
            @keydown.enter="handleScan"
            autofocus
          />
          <Input
            v-model.number="scanQuantity"
            type="number"
            min="1"
            style="width:80px;text-align:right;"
          />
          <Button variant="default" @click="handleScan" :disabled="isReceiving">{{ t('wms.inbound.receive', '入庫') }}</Button>
        </div>
        <p v-if="scanMessage" class="scan-message" :class="{ 'scan-error': scanIsError }">{{ scanMessage }}</p>
      </Card>

      <!-- 一括確認 -->
      <Card class=" scan-card" v-if="(order.status === 'confirmed' || order.status === 'receiving') && inspectionMode === 'bulk'">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:14px;color:var(--o-gray-600);">{{ t('wms.inbound.bulkReceiveDesc', '全行を予定数量で入庫します（信頼できる仕入先向け）') }}</span>
          <Button variant="default" @click="handleBulkReceive" :disabled="isReceiving">{{ t('wms.inbound.bulkConfirm', '一括確認') }}</Button>
        </div>
        <p v-if="scanMessage" class="scan-message" :class="{ 'scan-error': scanIsError }">{{ scanMessage }}</p>
      </Card>

      <!-- 入庫明細テーブル -->
      <div class="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style="width:40px;">#</TableHead>
              <TableHead style="width:140px;">SKU</TableHead>
              <TableHead style="width:200px;">{{ t('wms.inbound.productName', '商品名') }}</TableHead>
              <TableHead style="width:140px;">{{ t('wms.inbound.lot', 'ロット') }}</TableHead>
              <TableHead style="width:70px;">{{ t('wms.inbound.category', '区分') }}</TableHead>
              <TableHead class="text-right" style="width:100px;">{{ t('wms.inbound.expectedQuantity', '予定数量') }}</TableHead>
              <TableHead class="text-right" style="width:100px;">{{ t('wms.inbound.received', '入庫済') }}</TableHead>
              <TableHead class="text-right" style="width:100px;">{{ t('wms.inbound.remaining', '残り') }}</TableHead>
              <TableHead style="width:100px;">{{ t('wms.inbound.progress', '進捗') }}</TableHead>
              <TableHead style="width:100px;">{{ t('wms.common.actions', '操作') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="line in order.lines" :key="line.lineNumber" :class="{ 'row-done': line.receivedQuantity >= line.expectedQuantity }">
              <TableCell style="text-align:center;">{{ line.lineNumber }}</TableCell>
              <TableCell><span class="sku-text">{{ line.productSku }}</span></TableCell>
              <TableCell>{{ line.productName || '-' }}</TableCell>
              <TableCell>{{ line.lotNumber || '-' }}</TableCell>
              <TableCell>
                <span class="category-tag" :class="line.stockCategory === 'damaged' ? 'category-tag--damaged' : ''">
                  {{ line.stockCategory === 'damaged' ? t('wms.inbound.damaged', '仕損') : t('wms.inbound.new', '新品') }}
                </span>
              </TableCell>
              <TableCell class="text-right">{{ line.expectedQuantity }}</TableCell>
              <TableCell class="text-right">
                <span :class="{ 'text-success': line.receivedQuantity >= line.expectedQuantity }">
                  {{ line.receivedQuantity }}
                </span>
              </TableCell>
              <TableCell class="text-right">
                {{ Math.max(0, line.expectedQuantity - line.receivedQuantity) }}
              </TableCell>
              <TableCell>
                <div class="progress-bar">
                  <div class="progress-bar__fill" :style="{ width: progressPercent(line) + '%' }"></div>
                </div>
              </TableCell>
              <TableCell>
                <template v-if="line.receivedQuantity < line.expectedQuantity && (order.status === 'confirmed' || order.status === 'receiving')">
                  <div v-if="inspectionMode === 'manual'" style="display:flex;gap:4px;align-items:center;">
                    <Input
                      v-model.number="manualQuantities[line.lineNumber]"
                      type="number" min="1" :max="line.expectedQuantity - line.receivedQuantity"
                      style="width:60px;text-align:right;padding:4px 6px;font-size:13px;"
                    />
                    <Button variant="default" size="sm" :disabled="isReceiving || !manualQuantities[line.lineNumber]"
                      @click="handleReceiveLine(line.lineNumber, manualQuantities[line.lineNumber] || 1)"
                    >{{ t('wms.inbound.receive', '入庫') }}</Button>
                  </div>
                  <Button v-else variant="default" size="sm" :disabled="isReceiving"
                    @click="handleReceiveLine(line.lineNumber, 1)"
                  >+1</Button>
                </template>
                <span v-else-if="line.receivedQuantity >= line.expectedQuantity" class="text-success">{{ t('wms.inbound.complete', '完了') }}</span>
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
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/shared/PageHeader.vue'
import { fetchInboundOrder, receiveInboundLine, bulkReceiveInbound, fetchInboundVariance } from '@/api/inboundOrder'
import type { InboundOrder, InboundOrderLine } from '@/types/inventory'
import type { InboundVarianceReport } from '@/api/inboundOrder'
import { beepSuccess, beepError, beepComplete } from '@/utils/scanBeep'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const isLoading = ref(false)
const isReceiving = ref(false)
const order = ref<InboundOrder | null>(null)
const varianceReport = ref<InboundVarianceReport | null>(null)

const inspectionMode = ref<'scan' | 'manual' | 'bulk'>('scan')
const inspectionModes = computed(() => [
  { key: 'scan' as const, label: t('wms.inbound.scanInspection', 'スキャン検品') },
  { key: 'manual' as const, label: t('wms.inbound.manualEntry', '数量入力') },
  { key: 'bulk' as const, label: t('wms.inbound.bulkConfirm', '一括確認') },
])
const manualQuantities = reactive<Record<number, number>>({})

const scanInputRef = ref<HTMLInputElement | null>(null)
const scanInput = ref('')
const scanQuantity = ref(1)
const scanMessage = ref('')
const scanIsError = ref(false)

const totalExpected = computed(() => order.value?.lines.reduce((s, l) => s + l.expectedQuantity, 0) ?? 0)
const totalReceived = computed(() => order.value?.lines.reduce((s, l) => s + l.receivedQuantity, 0) ?? 0)

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
    draft: 'bg-muted text-muted-foreground',
    confirmed: 'bg-blue-100 text-blue-800',
    receiving: 'bg-amber-100 text-amber-800',
    received: 'bg-blue-100 text-blue-800',
    done: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
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
    // 超過入庫チェック / 超收检查
    const remaining = matchLine.expectedQuantity - matchLine.receivedQuantity
    if (scanQuantity.value > remaining) {
      beepError()
      scanMessage.value = `⚠️ 入庫数量(${scanQuantity.value})が残り数量(${remaining})を超えています。確認してください。`
      scanIsError.value = true
      return
    }
    handleReceiveLine(matchLine.lineNumber, scanQuantity.value)
    beepSuccess()
    scanInput.value = ''
    scanQuantity.value = 1
  } else {
    beepError()
    scanMessage.value = t('wms.inbound.skuNotFound', `SKU "${input}" に該当する未入庫行が見つかりません`)
    scanIsError.value = true
  }
}

const handleReceiveLine = async (lineNumber: number, qty: number) => {
  if (!order.value || isReceiving.value) return
  isReceiving.value = true
  scanMessage.value = ''
  scanIsError.value = false
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
      beepComplete()
      toast.showSuccess(t('wms.inbound.allInspectionComplete', '検品が全て完了しました。棚入れを行ってください。'))
      const orderId = order.value._id
      setTimeout(() => router.push(`/inbound/putaway/${orderId}`), 1500)
    }

    await nextTick()
    scanInputRef.value?.focus()
  } catch (e: any) {
    scanMessage.value = e?.message || t('wms.inbound.receiveFailed', '入庫に失敗しました')
    scanIsError.value = true
    toast.showError(scanMessage.value)
  } finally {
    isReceiving.value = false
  }
}

const handleBulkReceive = async () => {
  if (!order.value || isReceiving.value) return
  if (!(await confirm('この操作を実行しますか？'))) return
  isReceiving.value = true
  scanMessage.value = ''
  try {
    const result = await bulkReceiveInbound(order.value._id)
    scanMessage.value = result.message
    scanIsError.value = false
    toast.showSuccess(t('wms.inbound.allInspectionComplete', '検品が全て完了しました。棚入れを行ってください。'))
    const orderId = order.value._id
    setTimeout(() => router.push(`/inbound/putaway/${orderId}`), 1500)
  } catch (e: any) {
    scanMessage.value = e?.message || t('wms.inbound.bulkReceiveFailed', '一括検品に失敗しました')
    scanIsError.value = true
    toast.showError(scanMessage.value)
  } finally {
    isReceiving.value = false
  }
}

const loadVariance = async () => {
  if (!order.value) return
  try {
    varianceReport.value = await fetchInboundVariance(order.value._id)
  } catch {
    varianceReport.value = null
  }
}

const loadOrder = async () => {
  isLoading.value = true
  try {
    const id = route.params.id as string
    order.value = await fetchInboundOrder(id)
    // 検品済み・完了の場合は差異レポートを取得 / 检品完成后获取差异报告
    if (order.value && (order.value.status === 'received' || order.value.status === 'done')) {
      await loadVariance()
    }
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.fetchOrderFailed', '入庫指示の取得に失敗しました'))
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
  background: var(--o-brand-primary, #0052A3);
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
  font-size: 20px;
  font-weight: 600;
  padding: 12px 16px;
  border: 2px solid #e6a23c;
  border-radius: 6px;
  background: #fffef5;
  letter-spacing: 0.5px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.scan-input:focus {
  border-color: #409eff;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.15);
}

.scan-input::placeholder {
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0;
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

.{
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


/* 差異レポート / 差异报告 */
.variance-card { border-left: 4px solid #e6a23c; }
.variance-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.variance-icon { font-size: 20px; color: #e6a23c; }
.variance-title { margin: 0; font-size: 15px; font-weight: 600; color: #303133; }
.variance-summary { display: flex; gap: 20px; margin-bottom: 12px; font-size: 13px; color: #606266; }
.variance-diff { color: #f56c6c; font-weight: 600; }
.variance-table { width: 100%; font-size: 13px; }
.variance-table th { background: #f5f7fa; padding: 6px 10px; font-weight: 600; color: #606266; border-bottom: 1px solid #ebeef5; }
.variance-table td { padding: 6px 10px; border-bottom: 1px solid #ebeef5; }
.variance-row--shortage { background: #fef0f0; }
.variance-row--pending { background: #fdf6ec; }
.text-danger { color: #f56c6c; }
.mono { font-family: monospace; }

/* モバイルレスポンシブ対応 / 移动端响应式适配 */
@media (max-width: 768px) {
  /* 全体パディング縮小 / 整体内边距缩小 */
  .inbound-receive { padding: 0 12px 12px; }

  /* 情報カード縦積み / 信息卡片纵向排列 */
  .info-grid { flex-direction: column; gap: 8px; }

  /* カードパディング縮小 / 卡片内边距缩小 */
  .o-card { padding: 12px; margin-bottom: 0.5rem; }

  /* テーブル横スクロール / 表格横向滚动 */
  .o-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }

  /* 入力フィールド全幅 / 输入框全宽 */
  .o-input, select.{ width: 100% !important; }

  /* スキャン行縦積み・全幅化 / 扫描行纵向排列・全宽化 */
  .scan-row { flex-direction: column; }
  .scan-input { width: 100%; font-size: 18px; }

  /* 検品モード縦積み / 检品模式纵向排列 */
  .mode-row { flex-direction: column; align-items: flex-start; }
  .mode-tabs { width: 100%; }
  .mode-tab { flex: 1; text-align: center; }

  /* 差異サマリー縦積み / 差异摘要纵向排列 */
  .variance-summary { flex-direction: column; gap: 4px; }

  /* タッチターゲット拡大 / 触摸目标放大 */
  button, .o-btn, .el-button { min-height: 44px; min-width: 44px; }

  /* アクションボタン折り返し / 操作按钮换行 */
  .actions, [class*="action"] { flex-wrap: wrap; }

  /* バーコードスキャン入力常時表示 / 条码扫描输入始终可见 */
  .scan-card { position: sticky; top: 0; z-index: 10; }
}
</style>
