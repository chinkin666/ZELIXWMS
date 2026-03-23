<template>
  <div>
    <!-- 検品進捗バー / 检品进度条 -->
    <div v-if="totalOrderCount > 0" class="inspection-progress-bar">
      <div class="progress-info">
        <span>検品進捗: {{ inspectionProgress.done }} / {{ inspectionProgress.total }}</span>
        <span>{{ inspectionProgress.percent }}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: inspectionProgress.percent + '%' }"></div>
      </div>
    </div>
  <div class="inspection-page">
    <!-- 左侧面板 -->
    <InspectionLeftPanel
      ref="leftPanelRef"
      :class="{ 'scan-success-flash': scanSuccessFlash }"
      :order-group-id="orderGroupId"
      :current-order="currentOrder"
      :order-info-items="orderInfoItems"
      :input-value="inputValue"
      :mode="mode"
      :auto-print-enabled="autoPrintEnabled"
      :auto-advance-enabled="autoAdvanceEnabled"
      :product-image-src="scannedProductImageSrc"
      :last-scanned-product="lastScannedProduct"
      :scan-history="scanHistory"
      @go-back="handleGoBack"
      @clear="handleClear"
      @update:input-value="inputValue = $event"
      @submit="handleInput"
      @toggle-auto-print="toggleAutoPrint"
      @toggle-auto-advance="toggleAutoAdvance"
    />

    <!-- 右侧面板 -->
    <InspectionRightPanel
      :current-order="currentOrder"
      :inspection-items="inspectionItems"
      :total-quantity="totalQuantity"
      :inspected-quantity="inspectedQuantity"
      :remaining-quantity="remainingQuantity"
      :processed-count="processedOrderIds.length"
      :total-order-count="totalOrderCount"
      @open-order-list="openOrderListDialog"
      @cell-click="handleCellClick"
    />

    <!-- F-key 操作バー / Fキー操作バー -->
    <div class="fkey-bar">
      <Button
        v-for="fk in fKeyDefs"
        :key="fk.key"
        v-show="!!(fk.label || fk.labelOnly)"
        :variant="fk.key === 'F9' ? 'destructive' : 'outline'"
        class="fkey-btn"
        :class="{ 'fkey-btn--danger': fk.key === 'F9' }"
        @click="fk.action?.()"
      >
        <span class="fkey-key">{{ fk.key }}</span>
        <span class="fkey-label">{{ fk.label || fk.labelOnly || '' }}</span>
      </Button>
    </div>

    <!-- 確認取消ダイアログ -->
    <UnconfirmReasonDialog
      v-model="unconfirmDialogVisible"
      :order-number="currentOrder?.orderNumber || ''"
      :show-b2-warning="true"
      :loading="isUnconfirming"
      @confirm="handleUnconfirmConfirm"
    />

    <!-- 送り状種類変更ダイアログ -->
    <ChangeInvoiceTypeDialog
      v-model="changeInvoiceTypeDialogVisible"
      :orders="changeInvoiceTypeOrders"
      :loading="isChangingInvoiceType"
      @confirm="handleChangeInvoiceTypeConfirm"
    />

    <!-- 注文分割ダイアログ -->
    <SplitOrderDialog
      v-model="splitOrderDialogVisible"
      :order="splitOrderTarget"
      :loading="isSplittingOrder"
      @confirm="(splitGroups: any) => handleSplitOrderConfirm({ orderId: String(splitOrderTarget?._id || ''), splitGroups })"
    />

    <!-- 手動印刷確認ダイアログ -->
    <Dialog :open="completionDialogVisible" @update:open="(v) => { if (!v) handleCompletionDialogClose() }">
      <DialogContent class="sm:max-w-[800px]">
        <DialogHeader><DialogTitle>{{ t('wms.inspection.inspectionComplete', '検品完了') }}</DialogTitle></DialogHeader>
      <div class="completion-message">
        <p>{{ t('wms.inspection.allItemsInspected', 'すべての商品の検品が完了しました。') }}</p>
        <p>{{ t('wms.inspection.shipmentNumber', '出荷管理No') }}: {{ currentOrder?.orderNumber }}</p>
      </div>

      <div class="print-preview-section">
        <div v-if="inspPrint.printRendering.value" class="rendering">{{ t('wms.inspection.rendering', 'レンダリング中...') }}</div>
        <div v-else-if="inspPrint.printError.value" class="error">{{ inspPrint.printError.value }}</div>
        <div v-else-if="inspPrint.currentPdfSource.value === 'b2-webapi'" class="preview-b2-cloud">
          <div class="b2-cloud-icon">PDF</div>
          <div class="b2-cloud-text">{{ t('wms.inspection.fetchedFromB2Cloud', 'B2 Cloudから取得') }}</div>
          <div class="b2-cloud-tracking">{{ currentOrder?.trackingId }}</div>
        </div>
        <div v-else-if="!inspPrint.printImageUrl.value" class="placeholder">{{ t('wms.inspection.generatingPreview', '印刷プレビューを生成中...') }}</div>
        <div v-else class="preview">
          <img :src="inspPrint.printImageUrl.value" class="preview-img" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" @click="handleCompletionConfirmNoPrint">{{ t('wms.inspection.confirmNoPrint', '確認（印刷なし）') }}</Button>
        <Button
          variant="default"
          :disabled="(inspPrint.currentPdfSource.value === 'local' && (!inspPrint.printImageUrl.value || inspPrint.printRendering.value)) || (inspPrint.currentPdfSource.value === 'b2-webapi' && !currentOrder?.trackingId)"
          @click="handlePrint"
        >
          {{ t('wms.inspection.print', '印刷') }}
        </Button>
      </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 注文一覧ダイアログ -->
    <Dialog :open="orderListDialogVisible" @update:open="(v) => { if (!v) orderListDialogVisible = false }">
      <DialogContent class="sm:max-w-[800px]">
        <DialogHeader><DialogTitle>{{ t('wms.inspection.orderList', '注文一覧') }}</DialogTitle></DialogHeader>
      <div class="order-list-section">
        <h4>{{ t('wms.inspection.uninspected', '未検品') }}（{{ pendingOrders.length }}{{ t('wms.common.items', '件') }}）</h4>
        <div style="max-height: 250px; overflow: auto">
          <Table style="width: 100%">
            <TableHeader>
              <TableRow>
                <TableHead style="width: 200px">{{ t('wms.inspection.shipmentNumber', '出荷管理No') }}</TableHead>
                <TableHead style="min-width: 180px">{{ t('wms.inspection.customerManagementNumber', 'お客様管理番号') }}</TableHead>
                <TableHead style="width: 160px">{{ t('wms.inspection.trackingNumber', '伝票番号') }}</TableHead>
                <TableHead style="width: 80px; text-align: center">{{ t('wms.inspection.productCount', '商品数') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in pendingOrders" :key="String(row._id)">
                <TableCell>{{ row.orderNumber }}</TableCell>
                <TableCell>{{ row.customerManagementNumber }}</TableCell>
                <TableCell>{{ row.trackingId }}</TableCell>
                <TableCell style="text-align: center">
                  {{ Array.isArray(row.products) ? row.products.reduce((s: number, p: any) => s + (p.quantity || 1), 0) : 0 }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <div class="order-list-section">
        <h4>{{ t('wms.inspection.inspected', '検品済') }}（{{ processedOrdersData.length }}{{ t('wms.common.items', '件') }}）</h4>
        <div style="max-height: 250px; overflow: auto">
          <div v-if="loadingProcessedOrders" class="space-y-3 p-4">
            <Skeleton class="h-4 w-[250px]" />
            <Skeleton class="h-10 w-full" />
            <Skeleton class="h-10 w-full" />
          </div>
          <Table v-else style="width: 100%">
            <TableHeader>
              <TableRow>
                <TableHead style="width: 200px">{{ t('wms.inspection.shipmentNumber', '出荷管理No') }}</TableHead>
                <TableHead style="min-width: 180px">{{ t('wms.inspection.customerManagementNumber', 'お客様管理番号') }}</TableHead>
                <TableHead style="width: 160px">{{ t('wms.inspection.trackingNumber', '伝票番号') }}</TableHead>
                <TableHead style="width: 80px; text-align: center">{{ t('wms.inspection.productCount', '商品数') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in processedOrdersData" :key="String(row._id)">
                <TableCell>{{ row.orderNumber }}</TableCell>
                <TableCell>{{ row.customerManagementNumber }}</TableCell>
                <TableCell>{{ row.trackingId }}</TableCell>
                <TableCell style="text-align: center">
                  {{ Array.isArray(row.products) ? row.products.reduce((s: number, p: any) => s + (p.quantity || 1), 0) : 0 }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="orderListDialogVisible = false">{{ t('wms.common.close', '閉じる') }}</Button>
      </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 誤スキャン警告ダイアログ -->
    <Dialog :open="wrongScanDialogVisible" @update:open="(v) => { if (!v) wrongScanDialogVisible = false }">
      <DialogContent class="sm:max-w-[400px]">
      <div class="wrong-scan-content">
        <div class="wrong-scan-icon">!</div>
        <div class="wrong-scan-title">{{ t('wms.inspection.wrongScanTitle', 'この注文に該当しない商品です') }}</div>
        <div class="wrong-scan-detail">
          {{ t('wms.inspection.scanValue', 'スキャン値') }}: <strong>{{ wrongScanValue }}</strong>
        </div>
        <div class="wrong-scan-hint">
          {{ t('wms.inspection.wrongScanHint', '現在の注文に含まれない商品がスキャンされました。') }}
        </div>
        <div v-if="expectedScanValues.length > 0" class="wrong-scan-expected">
          <div class="wrong-scan-expected-label">この注文の商品SKU:</div>
          <div class="wrong-scan-expected-list">
            <span v-for="sku in expectedScanValues" :key="sku" class="expected-sku-tag">{{ sku }}</span>
          </div>
        </div>
        <Button
          variant="destructive"
          class="wrong-scan-close-btn"
          @click="wrongScanDialogVisible = false"
        >
          {{ t('wms.inspection.confirmAndClose', '確認して閉じる') }}
        </Button>
      </div>
      <DialogFooter><span></span></DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 手動検品数調整ダイアログ -->
    <Dialog :open="adjustDialogVisible" @update:open="(v) => { if (!v) adjustDialogVisible = false }">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>{{ t('wms.inspection.adjustQuantity', '検品数を調整') }}</DialogTitle></DialogHeader>
      <div v-if="adjustTarget" class="adjust-dialog-content">
        <p>{{ adjustTarget.name }}</p>
        <input
          ref="adjustInputRef"
          v-model.number="adjustValue"
          type="number"
         
          :min="0"
          :max="adjustTarget.totalQuantity"
          style="width: 120px"
        />
        <span class="adjust-hint"> / {{ adjustTarget.totalQuantity }}</span>
      </div>
      <DialogFooter>
        <div class="adjust-dialog-footer">
          <span class="adjust-shortcuts">ESC {{ t('wms.common.cancel', 'キャンセル') }} / F1 {{ t('wms.inspection.confirm', '確定') }}</span>
          <div>
            <Button variant="secondary" @click="adjustDialogVisible = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
            <Button variant="default" @click="handleAdjustConfirm">{{ t('wms.inspection.confirm', '確定') }}</Button>
          </div>
        </div>
      </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import UnconfirmReasonDialog from '@/components/dialogs/UnconfirmReasonDialog.vue'
import ChangeInvoiceTypeDialog from '@/components/dialogs/ChangeInvoiceTypeDialog.vue'
import SplitOrderDialog from '@/components/dialogs/SplitOrderDialog.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import InspectionLeftPanel from './one-by-one/InspectionLeftPanel.vue'
import InspectionRightPanel from './one-by-one/InspectionRightPanel.vue'
import { useAutoPrint } from '@/composables/useAutoPrint'
import { useInspectionPrint } from '@/composables/useInspectionPrint'
import { useI18n } from '@/composables/useI18n'
import { useInspectionScanHistory } from './composables/useInspectionScanHistory'
import { useInspectionStorage } from './composables/useInspectionStorage'
import { useAutoAdvance } from './composables/useAutoAdvance'
import { useInspectionState } from './composables/useInspectionState'
import { useInspectionScan } from './composables/useInspectionScan'
import { useInspectionOrders } from './composables/useInspectionOrders'
import type { FKeyDef } from './composables/useInspectionState'

const { t } = useI18n()

// ─── Composables初期化 / Composable初始化 ────────────────────────────

// 状態管理 / 状态管理
const state = useInspectionState()

// 自動印刷 / 自动打印
const { autoPrintEnabled, saveAutoPrintSetting } = useAutoPrint('orderItemScan_autoPrintEnabled')
const inspPrint = useInspectionPrint()

function toggleAutoPrint() {
  autoPrintEnabled.value = !autoPrintEnabled.value
  saveAutoPrintSetting()
}

// 検品後自動次注文移動 / 检品后自动切换到下一个订单
const { autoAdvanceEnabled, toggleAutoAdvance } = useAutoAdvance(true)

// スキャン履歴 / 扫描历史
const { scanHistory, addScanHistory } = useInspectionScanHistory()

// ストレージ / 存储
const { saveOrdersToStorage, loadOrdersFromStorage } = useInspectionStorage(state.pendingOrders, state.processedOrderIds)

// 左パネルref / 左面板ref
const leftPanelRef = ref<InstanceType<typeof InspectionLeftPanel> | null>(null)

// スキャンロジック / 扫描逻辑
const scan = useInspectionScan(
  state,
  inspPrint,
  leftPanelRef,
  saveOrdersToStorage,
  addScanHistory,
  autoPrintEnabled,
  autoAdvanceEnabled,
)

// Fキー定義 / F键定义
const fKeyDefs: FKeyDef[] = [
  { key: 'ESC', code: 'Escape', label: t('wms.inspection.goBack', '戻る'), action: () => orders.handleGoBack() },
  { key: 'F1', code: 'F1', label: t('wms.inspection.undoLast', '直前取消'), action: scan.fkeyUndoLastScan },
  { key: 'F2', code: 'F2', label: t('wms.inspection.clearOrder', '注文クリア'), action: scan.fkeyClearCurrentOrder },
  { key: 'F3', code: 'F3', label: t('wms.inspection.skipToNext', '次へスキップ'), action: scan.fkeySkipToNext },
  { key: 'F4', code: 'F4', label: '' },
  { key: 'F5', code: 'F5', label: t('wms.inspection.adjustQty', '数量修正'), action: scan.fkeyAdjustQuantity },
  { key: 'F6', code: 'F6', label: t('wms.inspection.splitOrder', '注文分割'), action: () => { if (state.currentOrder.value) scan.openSplitOrderDialogFn() } },
  { key: 'F7', code: 'F7', label: '' },
  { key: 'F8', code: 'F8', label: t('wms.inspection.markComplete', '手動完了'), action: scan.fkeyManualComplete },
  { key: 'F9', code: 'F9', label: t('wms.inspection.unconfirm', '確認取消'), action: () => { if (state.currentOrder.value) scan.openUnconfirmDialog() } },
  { key: 'F10', code: 'F10', label: '', labelOnly: t('wms.inspection.printInvoice', '納品書印刷') },
  { key: 'F11', code: 'F11', label: t('wms.inspection.changeInvoiceType', '送り状種類変更'), action: () => { if (state.currentOrder.value) scan.openChangeInvoiceTypeDialogFn() } },
  { key: 'F12', code: 'F12', label: '' },
]

// 注文ロード・ナビゲーション / 订单加载・导航
const orders = useInspectionOrders(
  state,
  inspPrint,
  saveOrdersToStorage,
  loadOrdersFromStorage,
  scan.focusScanInput,
  fKeyDefs,
  scan.handleAdjustConfirm,
)

// ─── テンプレートで使用する値のデストラクチャリング / 模板使用值的解构 ──

const {
  orderGroupId,
  pendingOrders,
  processedOrderIds,
  totalOrderCount,
  currentOrder,
  mode,
  inspectionItems,
  lastScannedProduct,
  inputValue,
  completionDialogVisible,
  adjustDialogVisible,
  adjustTarget,
  adjustValue,
  adjustInputRef,
  unconfirmDialogVisible,
  isUnconfirming,
  changeInvoiceTypeDialogVisible,
  changeInvoiceTypeOrders,
  isChangingInvoiceType,
  splitOrderDialogVisible,
  splitOrderTarget,
  isSplittingOrder,
  wrongScanDialogVisible,
  wrongScanValue,
  scanSuccessFlash,
  orderListDialogVisible,
  processedOrdersData,
  loadingProcessedOrders,
  totalQuantity,
  inspectedQuantity,
  remainingQuantity,
  inspectionProgress,
  expectedScanValues,
  orderInfoItems,
  scannedProductImageSrc,
} = state

const { handleInput, handlePrint, handleCompletionConfirmNoPrint, handleCellClick, handleAdjustConfirm, handleUnconfirmConfirm, handleChangeInvoiceTypeConfirm, handleSplitOrderConfirm } = scan
const { openOrderListDialog, handleGoBack, handleClear } = orders

/** 完了ダイアログクローズ（何もしない） / 完成对话框关闭（不做任何处理） */
function handleCompletionDialogClose() {
  // ユーザーはフッターボタンを使用する必要がある / 用户必须使用页脚按钮
}
</script>

<style scoped>
.inspection-page {
  display: flex;
  height: 100%;
  gap: 0;
  position: relative;
  padding-bottom: 56px;
}

/* ─── F-Key Bar ──────────────────────────── */
.fkey-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: #1a1a2e;
  z-index: 100;
  flex-wrap: wrap;
  justify-content: center;
}
.fkey-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #3a3a5c;
  border-radius: 6px;
  background: #2a2a4a;
  color: #e0e0e0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.fkey-btn:hover { background: #3a3a6a; border-color: #5a5a8c; }
.fkey-btn:active { background: #4a4a7a; }
.fkey-btn .fkey-key {
  background: #4a4a7a;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  min-width: 28px;
  text-align: center;
}
.fkey-btn .fkey-label {
  font-size: 13px;
}
.fkey-btn--danger { border-color: #f56c6c; }
.fkey-btn--danger .fkey-key { background: #f56c6c; }
.fkey-btn--danger:hover { background: #4a2a2a; }

/* ─── Order List Dialog ─────────────────── */
.order-list-section { margin-bottom: 16px; }
.order-list-section h4 { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: var(--o-gray-900); }

/* .o-list-table base styles are defined globally in style.css */

/* ─── Wrong scan warning dialog ──────────── */
.wrong-scan-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.wrong-scan-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--o-danger);
  color: #fff;
  font-size: 40px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wrong-scan-title { font-size: 22px; font-weight: 700; color: var(--o-danger); }
.wrong-scan-detail { font-size: 16px; color: var(--o-gray-900); }
.wrong-scan-hint { font-size: 13px; color: var(--o-gray-500); text-align: center; max-width: 360px; }

.wrong-scan-close-btn {
  width: 240px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
}

/* ─── Completion Dialog ──────────────────── */
.completion-message {
  text-align: center;
  padding: 12px;
  background: var(--o-gray-100);
  border-radius: 4px;
  margin-bottom: 16px;
}

.completion-message p { margin: 6px 0; font-size: 14px; color: var(--o-gray-900); }

.print-preview-section {
  border: 1px solid #e5e7eb;
  background: var(--o-gray-100);
  height: 520px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.print-preview-section .preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-img { max-width: 100%; max-height: 100%; object-fit: contain; }
.rendering, .placeholder { color: #6b7280; font-size: 14px; }
.error { color: #b91c1c; font-size: 14px; text-align: center; }

.preview-b2-cloud {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  background: var(--o-warning-bg);
  border: 2px dashed #ca8a04;
  border-radius: 12px;
}

.b2-cloud-icon {
  font-size: 32px;
  font-weight: bold;
  color: #ca8a04;
  background: white;
  padding: 12px 24px;
  border-radius: 6px;
  border: 2px solid #ca8a04;
}

.b2-cloud-text { color: #854d0e; font-size: 16px; font-weight: 600; }
.b2-cloud-tracking { color: #a16207; font-size: 14px; font-family: monospace; }

/* ─── Adjust Dialog ──────────────────────── */
.adjust-dialog-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.adjust-dialog-content p { width: 100%; margin: 0 0 8px; font-weight: 500; }
.adjust-hint { font-size: 13px; color: var(--o-gray-500); }

.adjust-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.adjust-shortcuts { font-size: 12px; color: var(--o-gray-500); }

/* ─── Button / Input styles ──────────────── */
.{
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}
.o-input:focus { border-color: var(--o-info); }

/* ─── Inspection Progress Bar ────────────── */
.inspection-progress-bar { position: absolute; top: 0; left: 0; right: 0; padding: 8px 16px; background: #f5f7fa; border-radius: 0 0 4px 4px; z-index: 10; }
.progress-info { display: flex; justify-content: space-between; font-size: 12px; color: #606266; margin-bottom: 4px; }
.progress-track { height: 6px; background: #ebeef5; border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: #67c23a; border-radius: 3px; transition: width 0.3s ease; }

/* ─── Wrong Scan Expected SKU ────────────── */
.wrong-scan-expected { margin-top: 12px; padding: 8px 12px; background: #f5f7fa; border-radius: 4px; }
.wrong-scan-expected-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.wrong-scan-expected-list { display: flex; flex-wrap: wrap; gap: 4px; }
.expected-sku-tag { font-family: monospace; font-size: 12px; padding: 2px 8px; background: #fff; border: 1px solid #dcdfe6; border-radius: 3px; color: #303133; }

/* ─── Scan Success Flash ─────────────────── */
.scan-success-flash { animation: successFlash 0.6s ease; }
@keyframes successFlash {
  0% { background-color: inherit; }
  30% { background-color: #f0f9eb; border-color: #67c23a; }
  100% { background-color: inherit; }
}

/* ─── タブレット対応 / 平板适配 (768-1024px) ─────── */
@media (max-width: 1024px) {
  .inspection-page {
    flex-direction: column;
    height: auto;
    padding-bottom: 64px;
  }

  .inspection-page :deep(.left-panel) {
    width: 100% !important;
    min-width: 0 !important;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    max-height: none;
    overflow: visible;
  }

  .inspection-page :deep(.right-panel) {
    width: 100%;
    overflow-x: auto;
  }

  .inspection-page :deep(.product-image) {
    width: 120px;
    height: 120px;
  }

  .inspection-progress-bar {
    position: relative;
  }

  .fkey-bar {
    gap: 3px;
    padding: 6px 8px;
  }

  .fkey-btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .fkey-btn .fkey-key {
    font-size: 10px;
    padding: 2px 6px;
    min-width: 24px;
  }
}

/* ─── モバイル対応 / 手机适配 (<768px) ─────────────── */
@media (max-width: 768px) {
  .inspection-page {
    padding-bottom: 56px;
  }

  .inspection-page :deep(.left-panel) {
    padding: 12px;
    gap: 8px;
  }

  .inspection-page :deep(.scan-input) {
    font-size: 18px;
    padding: 12px 40px 12px 14px;
  }

  .inspection-page :deep(.product-image) {
    width: 100px;
    height: 100px;
  }

  .inspection-page :deep(.product-image-section) {
    display: none;
  }

  .fkey-bar {
    gap: 2px;
    padding: 4px 6px;
  }

  .fkey-btn {
    padding: 8px 8px;
    font-size: 11px;
  }

  .fkey-btn .fkey-label {
    display: none;
  }

  .fkey-btn .fkey-key {
    font-size: 11px;
    min-width: 32px;
  }

  .wrong-scan-icon {
    width: 56px;
    height: 56px;
    font-size: 32px;
  }

  .wrong-scan-title {
    font-size: 18px;
  }

  .print-preview-section {
    height: 300px;
  }

  /* タッチターゲット拡大 / 触摸目标放大 */
  button, .o-btn, .el-button { min-height: 44px; min-width: 44px; }

  /* バーコードスキャン入力常時表示 / 条码扫描输入始终可见 */
  .inspection-page :deep(.scan-section) { position: sticky; top: 0; z-index: 10; }
}
</style>
