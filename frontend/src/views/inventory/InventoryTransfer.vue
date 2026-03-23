<template>
  <div class="inventory-transfer">
    <PageHeader :title="t('wms.inventory.transfer', '在庫移動')" :show-search="false" />

    <!-- 移動モード切替タブ / 移动模式切换标签 -->
    <div class="transfer-form rounded-lg border bg-card p-4">
      <div class="mode-tabs">
        <Button
          :variant="mode === 'intra' ? 'default' : 'outline'"
          class="mode-tab"
          :class="{ active: mode === 'intra' }"
          @click="mode = 'intra'"
        >
          {{ t('wms.inventory.intraWarehouseTransfer', '倉庫内移動') }}
        </Button>
        <Button
          :variant="mode === 'cross' ? 'default' : 'outline'"
          class="mode-tab"
          :class="{ active: mode === 'cross' }"
          @click="mode = 'cross'"
        >
          {{ t('wms.inventory.interWarehouseTransfer', '拠点間移動') }}
        </Button>
        <Button
          :variant="mode === 'transfers' ? 'default' : 'outline'"
          class="mode-tab"
          :class="{ active: mode === 'transfers' }"
          @click="mode = 'transfers'; loadTransfers()"
        >
          {{ t('wms.inventory.transferWorkflow', '移動管理') }}
          <span v-if="pendingTransferCount > 0" class="tab-badge">{{ pendingTransferCount }}</span>
        </Button>
      </div>

      <!-- 倉庫内移動 / 仓库内移动 -->
      <template v-if="mode === 'intra'">
        <p class="form-desc">{{ t('wms.inventory.transferDesc', 'ロケーション間で在庫を移動します。移動元に十分な在庫が必要です。') }}</p>

        <div class="form-grid">
          <!-- 商品選択 / 商品选择 -->
          <div class="form-field">
            <label>{{ t('wms.inventory.product', '商品') }} <span class="text-destructive text-xs">*</span></label>
            <Select :model-value="intraForm.productId || '__none__'" @update:model-value="(v: string) => { intraForm.productId = v === '__none__' ? '' : v }">
              <SelectTrigger><SelectValue :placeholder="t('wms.inventory.selectProduct', '商品を選択...')" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in products" :key="p._id" :value="p._id">{{ p.sku }} - {{ p.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 移動数量 / 移动数量 -->
          <div class="form-field">
            <label>{{ t('wms.inventory.transferQuantity', '移動数量') }} <span class="text-destructive text-xs">*</span></label>
            <Input v-model.number="intraForm.quantity" type="number" min="1" :placeholder="t('wms.inventory.transferQuantityPlaceholder', '例: 10')" />
            <span class="form-hint">{{ t('wms.inventory.transferQuantityHint', '1以上の整数を入力してください') }}</span>
          </div>

          <!-- 移動元ロケーション / 移动源库位 -->
          <div class="form-field">
            <label>{{ t('wms.inventory.fromLocation', '移動元') }} <span class="text-destructive text-xs">*</span></label>
            <Select :model-value="intraForm.fromLocationId || '__none__'" @update:model-value="(v: string) => { intraForm.fromLocationId = v === '__none__' ? '' : v }">
              <SelectTrigger><SelectValue :placeholder="t('wms.inventory.selectFromLocation', '移動元を選択...')" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">{{ loc.code }} ({{ loc.name }})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 移動先ロケーション / 移动目标库位 -->
          <div class="form-field">
            <label>{{ t('wms.inventory.toLocation', '移動先') }} <span class="text-destructive text-xs">*</span></label>
            <Select :model-value="intraForm.toLocationId || '__none__'" @update:model-value="(v: string) => { intraForm.toLocationId = v === '__none__' ? '' : v }">
              <SelectTrigger><SelectValue :placeholder="t('wms.inventory.selectToLocation', '移動先を選択...')" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="loc in availableIntraToLocations" :key="loc._id" :value="loc._id">{{ loc.code }} ({{ loc.name }})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- メモ / 备注 -->
          <div class="form-field form-field-full">
            <label>{{ t('wms.inventory.memo', 'メモ') }}</label>
            <Input v-model="intraForm.memo" type="text" :placeholder="t('wms.inventory.transferReasonPlaceholder', '移動理由...')" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <Button
            variant="default"
            :disabled="!canSubmitIntra || isSubmitting"
            @click="handleIntraSubmit"
          >
            {{ isSubmitting ? t('wms.inventory.processing', '処理中...') : t('wms.inventory.executeTransfer', '在庫を移動') }}
          </Button>
        </div>
      </template>

      <!-- 拠点間移動 / 跨仓库转移 -->
      <template v-if="mode === 'cross'">
        <p class="form-desc">{{ t('wms.inventory.crossSiteTransferDesc', '異なる倉庫間で在庫を移動します。移動元倉庫に十分な在庫が必要です。') }}</p>

        <div class="form-grid">
          <!-- 商品選択 / 商品选择 -->
          <div class="form-field form-field-full">
            <label>{{ t('wms.inventory.product', '商品') }} <span class="text-destructive text-xs">*</span></label>
            <Select :model-value="crossForm.productId || '__none__'" @update:model-value="(v: string) => { crossForm.productId = v === '__none__' ? '' : v }">
              <SelectTrigger><SelectValue :placeholder="t('wms.inventory.selectProduct', '商品を選択...')" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in products" :key="p._id" :value="p._id">{{ p.sku }} - {{ p.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 移動元倉庫 / 移动源仓库 -->
          <div class="form-field">
            <label>{{ t('wms.inventory.fromWarehouse', '移動元倉庫') }} <span class="text-destructive text-xs">*</span></label>
            <Select :model-value="crossForm.fromWarehouseId || '__none__'" @update:model-value="(v: string) => { crossForm.fromWarehouseId = v === '__none__' ? '' : v; onFromWarehouseChange() }">
              <SelectTrigger><SelectValue :placeholder="t('wms.inventory.selectWarehouse', '倉庫を選択...')" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="w in warehouses" :key="w._id" :value="w._id">{{ w.code }} - {{ w.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 移動先倉庫 / 移动目标仓库 -->
          <div class="form-field">
            <label>{{ t('wms.inventory.toWarehouse', '移動先倉庫') }} <span class="text-destructive text-xs">*</span></label>
            <Select :model-value="crossForm.toWarehouseId || '__none__'" @update:model-value="(v: string) => { crossForm.toWarehouseId = v === '__none__' ? '' : v; onToWarehouseChange() }">
              <SelectTrigger><SelectValue :placeholder="t('wms.inventory.selectWarehouse', '倉庫を選択...')" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="w in availableToWarehouses" :key="w._id" :value="w._id">{{ w.code }} - {{ w.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 移動元ロケーション / 移动源库位 -->
          <div class="form-field">
            <label>{{ t('wms.inventory.fromLocation', '移動元ロケーション') }} <span class="text-destructive text-xs">*</span></label>
            <Select :model-value="crossForm.fromLocationId || '__none__'" @update:model-value="(v: string) => { crossForm.fromLocationId = v === '__none__' ? '' : v }" :disabled="!crossForm.fromWarehouseId">
              <SelectTrigger><SelectValue :placeholder="t('wms.inventory.selectFromLocation', 'ロケーションを選択...')" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="loc in fromWarehouseLocations" :key="loc._id" :value="loc._id">{{ loc.code }} ({{ loc.name }})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 移動先ロケーション / 移动目标库位 -->
          <div class="form-field">
            <label>{{ t('wms.inventory.toLocation', '移動先ロケーション') }} <span class="text-destructive text-xs">*</span></label>
            <Select :model-value="crossForm.toLocationId || '__none__'" @update:model-value="(v: string) => { crossForm.toLocationId = v === '__none__' ? '' : v }" :disabled="!crossForm.toWarehouseId">
              <SelectTrigger><SelectValue :placeholder="t('wms.inventory.selectToLocation', 'ロケーションを選択...')" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="loc in toWarehouseLocations" :key="loc._id" :value="loc._id">{{ loc.code }} ({{ loc.name }})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 移動数量 / 移动数量 -->
          <div class="form-field">
            <label>{{ t('wms.inventory.transferQuantity', '移動数量') }} <span class="text-destructive text-xs">*</span></label>
            <Input v-model.number="crossForm.quantity" type="number" min="1" :placeholder="t('wms.inventory.transferQuantityPlaceholder', '例: 10')" />
            <span class="form-hint">{{ t('wms.inventory.transferQuantityHint', '1以上の整数を入力してください') }}</span>
          </div>

          <!-- 理由 / 理由 -->
          <div class="form-field">
            <label>{{ t('wms.inventory.reason', '理由') }}</label>
            <Input v-model="crossForm.reason" type="text" :placeholder="t('wms.inventory.crossSiteReasonPlaceholder', '拠点間移動の理由...')" />
          </div>
        </div>

        <div class="form-actions">
          <Button
            variant="default"
            :disabled="!canSubmitCross || isSubmitting"
            @click="handleCrossSubmit"
          >
            {{ isSubmitting ? t('wms.inventory.processing', '処理中...') : t('wms.inventory.executeCrossSiteTransfer', '拠点間移動を実行') }}
          </Button>
        </div>
      </template>

      <!-- 移動管理タブ / 转移管理标签 -->
      <template v-if="mode === 'transfers'">
        <p class="form-desc">{{ t('wms.inventory.transferWorkflowDesc', '拠点間移動の進捗を管理します。ステータス: 下書き → 確認済（出荷）→ 受入完了') }}</p>

        <!-- ステータスフィルタ / 状态筛选 -->
        <div class="transfer-filters">
          <Button
            v-for="sf in statusFilters"
            :key="sf.value"
            :variant="transferStatusFilter === sf.value ? 'default' : 'outline'"
            size="sm"
            class="filter-btn"
            :class="{ active: transferStatusFilter === sf.value }"
            @click="transferStatusFilter = sf.value; loadTransfers()"
          >
            {{ sf.label }}
          </Button>
        </div>

        <!-- 移動管理テーブル / 转移管理表 -->
        <div v-if="isLoadingTransfers" class="space-y-3 p-4">
          <Skeleton class="h-4 w-[250px]" />
          <Skeleton class="h-4 w-[200px]" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
        </div>
        <div v-else-if="transferRows.length === 0" class="empty-state">
          {{ t('wms.inventory.noTransfers', '拠点間移動レコードがありません') }}
        </div>
        <div v-else class="transfer-cards">
          <div
            v-for="tr in transferRows"
            :key="tr.id"
            class="transfer-card"
            :class="`transfer-card--${tr.status}`"
          >
            <div class="transfer-card-header">
              <span class="move-number">{{ tr.moveNumber }}</span>
              <span class="status-badge" :class="`status-badge--${tr.status}`">
                {{ formatTransferStatus(tr.status) }}
              </span>
            </div>
            <div class="transfer-card-body">
              <div class="transfer-info-row">
                <span class="info-label">{{ t('wms.inventory.product', '商品') }}</span>
                <span class="info-value">{{ tr.productSku }} {{ tr.productName ? `- ${tr.productName}` : '' }}</span>
              </div>
              <div class="transfer-info-row">
                <span class="info-label">{{ t('wms.inventory.quantity', '数量') }}</span>
                <span class="info-value text-info">{{ tr.quantity }}</span>
              </div>
              <div class="transfer-info-row">
                <span class="info-label">{{ t('wms.inventory.fromLocation', '移動元') }}</span>
                <span class="info-value">
                  <span class="location-badge">{{ tr.fromLocationCode || '-' }}</span>
                  <span v-if="tr.fromWarehouseName" class="warehouse-hint">({{ tr.fromWarehouseName }})</span>
                </span>
              </div>
              <div class="transfer-info-row">
                <span class="info-label">{{ t('wms.inventory.toLocation', '移動先') }}</span>
                <span class="info-value">
                  <span class="location-badge">{{ tr.toLocationCode || '-' }}</span>
                  <span v-if="tr.toWarehouseName" class="warehouse-hint">({{ tr.toWarehouseName }})</span>
                </span>
              </div>
              <div v-if="tr.reason" class="transfer-info-row">
                <span class="info-label">{{ t('wms.inventory.reason', '理由') }}</span>
                <span class="info-value">{{ tr.reason }}</span>
              </div>
              <div class="transfer-info-row">
                <span class="info-label">{{ t('wms.inventory.createdAt', '作成日') }}</span>
                <span class="info-value">{{ formatDateTime(tr.createdAt) }}</span>
              </div>
              <div v-if="tr.executedAt" class="transfer-info-row">
                <span class="info-label">{{ t('wms.inventory.confirmedAt', '確認日') }}</span>
                <span class="info-value">{{ formatDateTime(tr.executedAt) }}</span>
              </div>
            </div>
            <div class="transfer-card-actions">
              <!-- draft → 確認 or キャンセル / draft → 确认 or 取消 -->
              <template v-if="tr.status === 'draft'">
                <Button variant="default" size="sm" :disabled="isProcessingTransfer" @click="handleConfirmTransfer(tr.id)">
                  {{ t('wms.inventory.confirmShipment', '出荷確認') }}
                </Button>
                <Button variant="secondary" size="sm" :disabled="isProcessingTransfer" @click="handleCancelTransfer(tr.id)">
                  {{ t('wms.inventory.cancelTransfer', 'キャンセル') }}
                </Button>
              </template>
              <!-- confirmed → 受入 / confirmed → 接收 -->
              <template v-if="tr.status === 'confirmed'">
                <Button variant="default" size="sm" :disabled="isProcessingTransfer" @click="handleReceiveTransfer(tr.id)">
                  {{ t('wms.inventory.receiveTransfer', '受入確認') }}
                </Button>
              </template>
              <!-- done / cancelled → 表示のみ / done / cancelled → 仅显示 -->
              <template v-if="tr.status === 'done'">
                <span class="completed-label">{{ t('wms.inventory.transferCompleted', '完了') }}</span>
              </template>
              <template v-if="tr.status === 'cancelled'">
                <span class="cancelled-label">{{ t('wms.inventory.transferCancelled', 'キャンセル済') }}</span>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 移動履歴 / 移动履历 -->
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">
      {{ t('wms.inventory.recentTransferHistory', '最近の移動履歴') }}
      <Button variant="secondary" size="sm" @click="exportTransferCsv">{{ t('wms.inventory.csvExport', 'CSV出力') }}</Button>
    </div>

    <div class="table-section">
      <DataTable
        :columns="historyTableColumns"
        :data="historyRows"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[20, 50]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
// 拠点間移動ビュー / 拠点间移动视图
// 3PL向け: ロケーション間・倉庫間で在庫を移動する機能
// 面向3PL: 在库位间・仓库间移动库存的功能
import { computed, h, onMounted, ref } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { DataTable } from '@/components/data-table'
import { transferStock, crossSiteTransfer, fetchMovements, fetchTransfers, confirmTransfer, receiveTransfer, cancelTransfer } from '@/api/inventory'
import { fetchLocations } from '@/api/location'
import { fetchProducts } from '@/api/product'
import { fetchWarehouses } from '@/api/warehouse'
import type { Product } from '@/types/product'
import type { Location, TransferRecord } from '@/types/inventory'
import type { StockMove } from '@/types/inventory'
import type { TableColumn } from '@/types/table'
import type { Warehouse } from '@/api/warehouse'

const toast = useToast()
const { t } = useI18n()

// 移動モード / 移动模式
const mode = ref<'intra' | 'cross' | 'transfers'>('intra')

const products = ref<Product[]>([])
const allLocations = ref<Location[]>([])
const warehouses = ref<Warehouse[]>([])
const isSubmitting = ref(false)
const isLoadingHistory = ref(false)
const historyRows = ref<StockMove[]>([])

// 移動管理タブ用 / 转移管理标签用
const transferRows = ref<TransferRecord[]>([])
const isLoadingTransfers = ref(false)
const isProcessingTransfer = ref(false)
const transferStatusFilter = ref<string>('')
const pendingTransferCount = ref(0)

// ステータスフィルタ選択肢 / 状态筛选选项
const statusFilters = computed(() => [
  { value: '', label: t('wms.inventory.allStatuses', 'すべて') },
  { value: 'draft', label: t('wms.inventory.statusDraft', '下書き') },
  { value: 'confirmed', label: t('wms.inventory.statusConfirmed', '確認済') },
  { value: 'done', label: t('wms.inventory.statusDone', '完了') },
  { value: 'cancelled', label: t('wms.inventory.statusCancelled', 'キャンセル') },
])

// 倉庫内移動フォーム / 仓库内移动表单
const intraForm = ref({
  productId: '',
  fromLocationId: '',
  toLocationId: '',
  quantity: 1 as number,
  memo: '',
})

// 拠点間移動フォーム / 跨仓库移动表单
const crossForm = ref({
  productId: '',
  fromWarehouseId: '',
  fromLocationId: '',
  toWarehouseId: '',
  toLocationId: '',
  quantity: 1 as number,
  reason: '',
})

// 物理ロケーションのみ表示（仮想ロケーション除外）/ 只显示物理库位（排除虚拟库位）
const physicalLocations = computed(() =>
  allLocations.value.filter(l => l.type && !l.type.startsWith('virtual/')),
)

// 倉庫内移動: 移動先は移動元と同じロケーションを除外 / 仓库内移动: 移动目标排除与移动源相同的库位
const availableIntraToLocations = computed(() =>
  physicalLocations.value.filter(l => l._id !== intraForm.value.fromLocationId),
)

// 拠点間移動: 移動先倉庫は移動元と異なる倉庫 / 跨仓库移动: 目标仓库与源仓库不同
const availableToWarehouses = computed(() =>
  warehouses.value.filter(w => w._id !== crossForm.value.fromWarehouseId),
)

// 移動元倉庫のロケーション / 源仓库的库位
const fromWarehouseLocations = computed(() =>
  physicalLocations.value.filter(l => l.warehouseId === crossForm.value.fromWarehouseId),
)

// 移動先倉庫のロケーション / 目标仓库的库位
const toWarehouseLocations = computed(() =>
  physicalLocations.value.filter(l => l.warehouseId === crossForm.value.toWarehouseId),
)

// 倉庫内移動バリデーション / 仓库内移动验证
const canSubmitIntra = computed(() =>
  intraForm.value.productId
    && intraForm.value.fromLocationId
    && intraForm.value.toLocationId
    && intraForm.value.fromLocationId !== intraForm.value.toLocationId
    && intraForm.value.quantity > 0,
)

// 拠点間移動バリデーション / 跨仓库移动验证
const canSubmitCross = computed(() =>
  crossForm.value.productId
    && crossForm.value.fromWarehouseId
    && crossForm.value.fromLocationId
    && crossForm.value.toWarehouseId
    && crossForm.value.toLocationId
    && crossForm.value.quantity > 0
    && !(crossForm.value.fromWarehouseId === crossForm.value.toWarehouseId
         && crossForm.value.fromLocationId === crossForm.value.toLocationId),
)

// 移動元倉庫変更時にロケーションリセット / 源仓库变更时重置库位
const onFromWarehouseChange = () => {
  crossForm.value.fromLocationId = ''
}

// 移動先倉庫変更時にロケーションリセット / 目标仓库变更时重置库位
const onToWarehouseChange = () => {
  crossForm.value.toLocationId = ''
}

// 日時フォーマット / 日期时间格式化
const formatDateTime = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// 移動タイプ表示 / 移动类型显示
const formatMoveType = (type: string) => {
  const map: Record<string, string> = {
    transfer: t('wms.inventory.moveTypeTransfer', '倉庫内移動'),
    site_transfer: t('wms.inventory.moveTypeSiteTransfer', '拠点間移動'),
  }
  return map[type] ?? type
}

// 移動履歴テーブルカラム定義 / 移动履历表列定义
const historyTableColumns = computed<TableColumn[]>(() => [
  {
    key: 'moveNumber', dataKey: 'moveNumber', title: t('wms.inventory.moveNumber', '移動番号'), width: 160, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => h('span', { class: 'move-number' }, rowData.moveNumber),
  },
  {
    key: 'moveType', dataKey: 'moveType', title: t('wms.inventory.moveType', '種別'), width: 120, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => h('span', {
      class: rowData.moveType === 'site_transfer' ? 'badge-cross-site' : 'badge-intra',
    }, formatMoveType(rowData.moveType)),
  },
  { key: 'productSku', dataKey: 'productSku', title: 'SKU', width: 120, fieldType: 'string' },
  {
    key: 'productName', dataKey: 'productName', title: t('wms.inventory.productName', '商品名'), width: 160, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => rowData.productName || '-',
  },
  {
    key: 'quantity', dataKey: 'quantity', title: t('wms.inventory.quantity', '数量'), width: 80, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => h('span', { class: 'text-info' }, String(rowData.quantity)),
  },
  {
    key: 'fromLocation', title: t('wms.inventory.fromLocation', '移動元'), width: 150, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) =>
      h('span', { class: 'location-badge' }, rowData.fromLocation?.code || '-'),
  },
  {
    key: 'toLocation', title: t('wms.inventory.toLocation', '移動先'), width: 150, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) =>
      h('span', { class: 'location-badge' }, rowData.toLocation?.code || '-'),
  },
  {
    key: 'executedAt', title: t('wms.inventory.executedAt', '実行日時'), width: 140, fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => rowData.executedAt ? formatDateTime(rowData.executedAt) : '-',
  },
  {
    key: 'reason', dataKey: 'reason', title: t('wms.inventory.reason', '理由'), width: 200, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => rowData.reason || rowData.memo || '-',
  },
])

// 倉庫内移動実行 / 执行仓库内移动
const handleIntraSubmit = async () => {
  if (!canSubmitIntra.value) return
  isSubmitting.value = true
  try {
    const result = await transferStock({
      productId: intraForm.value.productId,
      fromLocationId: intraForm.value.fromLocationId,
      toLocationId: intraForm.value.toLocationId,
      quantity: intraForm.value.quantity,
      memo: intraForm.value.memo || undefined,
    })
    toast.showSuccess(result.message)
    // フォームリセット（商品とロケーションは保持）/ 重置表单（保留商品和库位选择）
    intraForm.value.quantity = 1
    intraForm.value.memo = ''
    await loadHistory()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.transferFailed', '在庫移動に失敗しました'))
  } finally {
    isSubmitting.value = false
  }
}

// 拠点間移動実行 / 执行跨仓库转移
const handleCrossSubmit = async () => {
  if (!canSubmitCross.value) return
  isSubmitting.value = true
  try {
    const result = await crossSiteTransfer({
      productId: crossForm.value.productId,
      fromWarehouseId: crossForm.value.fromWarehouseId,
      fromLocationId: crossForm.value.fromLocationId,
      toWarehouseId: crossForm.value.toWarehouseId,
      toLocationId: crossForm.value.toLocationId,
      quantity: crossForm.value.quantity,
      reason: crossForm.value.reason || undefined,
    })
    toast.showSuccess(result.message)
    // フォームリセット（倉庫選択は保持）/ 重置表单（保留仓库选择）
    crossForm.value.quantity = 1
    crossForm.value.reason = ''
    await loadHistory()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.crossSiteTransferFailed', '拠点間移動に失敗しました'))
  } finally {
    isSubmitting.value = false
  }
}

// 移動履歴ロード（transfer + site_transfer 両方）/ 加载移动履历（transfer + site_transfer 两种）
const loadHistory = async () => {
  isLoadingHistory.value = true
  try {
    const [transferRes, siteTransferRes] = await Promise.all([
      fetchMovements({ moveType: 'transfer', limit: 20 }),
      fetchMovements({ moveType: 'site_transfer', limit: 20 }),
    ])
    // 両方のデータをマージして日時降順ソート / 合并两种数据并按日期降序排列
    const merged = [...transferRes.items, ...siteTransferRes.items]
      .sort((a, b) => new Date(b.createdAt ?? '').getTime() - new Date(a.createdAt ?? '').getTime())
      .slice(0, 20)
    historyRows.value = merged
  } catch (e: any) {
    toast.showError(t('wms.inventory.transferHistoryFetchFailed', '移動履歴の取得に失敗しました'))
  } finally {
    isLoadingHistory.value = false
  }
}

// ステータス表示テキスト / 状态显示文本
const formatTransferStatus = (status: string) => {
  const map: Record<string, string> = {
    draft: t('wms.inventory.statusDraft', '下書き'),
    confirmed: t('wms.inventory.statusConfirmed', '確認済（出荷中）'),
    done: t('wms.inventory.statusDone', '受入完了'),
    cancelled: t('wms.inventory.statusCancelled', 'キャンセル'),
  }
  return map[status] ?? status
}

// 拠点間移動一覧ロード / 加载跨仓库转移列表
const loadTransfers = async () => {
  isLoadingTransfers.value = true
  try {
    const res = await fetchTransfers({
      limit: 50,
      status: transferStatusFilter.value || undefined,
    })
    transferRows.value = (res.items ?? []) as unknown as TransferRecord[]
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.transfersFetchFailed', '移動一覧の取得に失敗しました'))
  } finally {
    isLoadingTransfers.value = false
  }
}

// 未処理件数の取得 / 获取未处理数量
const loadPendingCount = async () => {
  try {
    const res = await fetchTransfers({ limit: 1, status: 'draft' })
    const res2 = await fetchTransfers({ limit: 1, status: 'confirmed' })
    pendingTransferCount.value = (res.total ?? 0) + (res2.total ?? 0)
  } catch {
    // サイレントエラー / 静默错误
  }
}

// 出荷確認ハンドラ / 出货确认处理
const handleConfirmTransfer = async (id: string) => {
  isProcessingTransfer.value = true
  try {
    const result = await confirmTransfer(id)
    toast.showSuccess(result.message)
    await loadTransfers()
    await loadPendingCount()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.confirmTransferFailed', '出荷確認に失敗しました'))
  } finally {
    isProcessingTransfer.value = false
  }
}

// 受入確認ハンドラ / 接收确认处理
const handleReceiveTransfer = async (id: string) => {
  isProcessingTransfer.value = true
  try {
    const result = await receiveTransfer(id)
    toast.showSuccess(result.message)
    await loadTransfers()
    await loadPendingCount()
    await loadHistory()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.receiveTransferFailed', '受入確認に失敗しました'))
  } finally {
    isProcessingTransfer.value = false
  }
}

// キャンセルハンドラ / 取消处理
const handleCancelTransfer = async (id: string) => {
  isProcessingTransfer.value = true
  try {
    const result = await cancelTransfer(id)
    toast.showSuccess(result.message)
    await loadTransfers()
    await loadPendingCount()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.cancelTransferFailed', 'キャンセルに失敗しました'))
  } finally {
    isProcessingTransfer.value = false
  }
}

// CSV出力 / CSV导出
const exportTransferCsv = () => {
  const csvRows: string[] = [
    [
      t('wms.inventory.moveNumber', '移動番号'),
      t('wms.inventory.moveType', '種別'),
      'SKU',
      t('wms.inventory.productName', '商品名'),
      t('wms.inventory.quantity', '数量'),
      t('wms.inventory.fromLocation', '移動元'),
      t('wms.inventory.toLocation', '移動先'),
      t('wms.inventory.executedAt', '実行日時'),
      t('wms.inventory.reason', '理由'),
    ].join(','),
  ]
  for (const r of historyRows.value) {
    csvRows.push([
      `"${r.moveNumber}"`,
      `"${formatMoveType(r.moveType)}"`,
      `"${r.productSku}"`,
      `"${r.productName || ''}"`,
      String(r.quantity),
      `"${r.fromLocation?.code || ''}"`,
      `"${r.toLocation?.code || ''}"`,
      r.executedAt ? formatDateTime(r.executedAt) : '',
      `"${r.reason || r.memo || ''}"`,
    ].join(','))
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transfers_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// 初期データロード / 初始数据加载
onMounted(async () => {
  try {
    const [prods, locs, whRes] = await Promise.all([
      fetchProducts(),
      fetchLocations({ isActive: true }),
      fetchWarehouses({ isActive: 'true' }),
    ])
    products.value = prods
    allLocations.value = locs
    warehouses.value = whRes.data ?? []
  } catch (e: any) {
    toast.showError(t('wms.inventory.masterDataFetchFailed', 'マスタデータの取得に失敗しました'))
  }
  await Promise.all([loadHistory(), loadPendingCount()])
})
</script>

<style scoped>
.inventory-transfer {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.table-section {
  width: 100%;
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
  padding: 1.5rem;
}

.mode-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--o-border-color, #e4e7ed);
}

.mode-tab {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--o-gray-500, #909399);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.mode-tab:hover {
  color: var(--o-brand-primary, #714b67);
}

.mode-tab.active {
  color: var(--o-brand-primary, #714b67);
  border-bottom-color: var(--o-brand-primary, #714b67);
}

.form-desc {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
  margin: 0 0 1.5rem 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field-full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
}

.required-badge { display:inline-block;background:#dc3545;color:#fff;font-size:10px;font-weight:700;line-height:1;padding:2px 5px;border-radius:3px;white-space:nowrap;vertical-align:middle;margin-left:4px; }

.form-hint {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

.form-actions {
  margin-top: 1.5rem;
  text-align: right;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
}

.{
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 14px;
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
  width: 100%;
}


.move-number {
  font-family: monospace;
  font-size: 12px;
  color: var(--o-brand-primary, #714b67);
}

.location-badge {
  font-family: monospace;
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 6px;
  border-radius: 3px;
}

.badge-intra {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #e8f5e9;
  color: #2e7d32;
  font-weight: 600;
}

.badge-cross-site {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #e3f2fd;
  color: #1565c0;
  font-weight: 600;
}

.text-info { color: #409eff; font-weight: 600; }

/* 移動管理タブ用スタイル / 转移管理标签样式 */
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  margin-left: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: #dc3545;
  border-radius: 9px;
}

.transfer-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: 16px;
  background: var(--o-view-background, #fff);
  color: var(--o-gray-600, #606266);
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: var(--o-brand-primary, #714b67);
  color: var(--o-brand-primary, #714b67);
}

.filter-btn.active {
  background: var(--o-brand-primary, #714b67);
  color: #fff;
  border-color: var(--o-brand-primary, #714b67);
}

.loading-state, .empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--o-gray-500, #909399);
  font-size: 14px;
}

.transfer-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transfer-card {
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 1rem;
  background: var(--o-view-background, #fff);
  transition: border-color 0.2s;
}

.transfer-card--draft { border-left: 4px solid #e6a23c; }
.transfer-card--confirmed { border-left: 4px solid #409eff; }
.transfer-card--done { border-left: 4px solid #67c23a; }
.transfer-card--cancelled { border-left: 4px solid #c0c4cc; opacity: 0.7; }

.transfer-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
}

.status-badge {
  display: inline-block;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.status-badge--draft { background: #fdf6ec; color: #e6a23c; }
.status-badge--confirmed { background: #ecf5ff; color: #409eff; }
.status-badge--done { background: #f0f9eb; color: #67c23a; }
.status-badge--cancelled { background: #f4f4f5; color: #909399; }

.transfer-card-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
  margin-bottom: 0.75rem;
}

.transfer-info-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
  align-items: baseline;
}

.info-label {
  color: var(--o-gray-500, #909399);
  min-width: 60px;
  flex-shrink: 0;
}

.info-value {
  color: var(--o-gray-700, #303133);
  font-weight: 500;
}

.warehouse-hint {
  font-size: 11px;
  color: var(--o-gray-400, #c0c4cc);
  margin-left: 4px;
}

.transfer-card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid var(--o-border-color, #e4e7ed);
}

.completed-label {
  font-size: 12px;
  color: #67c23a;
  font-weight: 600;
}

.cancelled-label {
  font-size: 12px;
  color: #909399;
  font-weight: 600;
}

@media (max-width: 768px) {
  /* フォームグリッド1列化 / 表单网格单列化 */
  .form-grid { grid-template-columns: 1fr; }

  /* 全体パディング縮小 / 整体内边距缩小 */
  .inventory-transfer { padding: 0 12px 12px; }

  /* カードパディング縮小 / 卡片内边距缩小 */
  .o-card { padding: 1rem; }

  /* テーブル横スクロール / 表格横向滚动 */
  .table-section { overflow-x: auto; -webkit-overflow-scrolling: touch; }

  /* モードタブ縦積み / 模式标签纵向排列 */
  .mode-tabs { flex-direction: column; }
  .mode-tab { text-align: center; padding: 10px 12px; }

  /* タッチターゲット拡大 / 触摸目标放大 */
  button, .o-btn, .el-button { min-height: 44px; min-width: 44px; }

  /* セクションタイトル折り返し / 标题换行 */
  .section-title { flex-direction: column; gap: 8px; align-items: flex-start !important; }

  /* アクションボタン折り返し / 操作按钮换行 */
  .form-actions { text-align: center; }

  /* 移動カードレイアウト調整 / 转移卡片布局调整 */
  .transfer-card-body { grid-template-columns: 1fr; }
  .transfer-card-actions { flex-wrap: wrap; justify-content: center; }
}
</style>
