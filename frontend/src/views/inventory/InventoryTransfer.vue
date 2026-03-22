<template>
  <div class="inventory-transfer">
    <ControlPanel :title="t('wms.inventory.transfer', '在庫移動')" :show-search="false" />

    <!-- 移動モード切替タブ / 移动模式切换标签 -->
    <div class="transfer-form o-card">
      <div class="mode-tabs">
        <button
          class="mode-tab"
          :class="{ active: mode === 'intra' }"
          @click="mode = 'intra'"
        >
          {{ t('wms.inventory.intraWarehouseTransfer', '倉庫内移動') }}
        </button>
        <button
          class="mode-tab"
          :class="{ active: mode === 'cross' }"
          @click="mode = 'cross'"
        >
          {{ t('wms.inventory.interWarehouseTransfer', '拠点間移動') }}
        </button>
        <button
          class="mode-tab"
          :class="{ active: mode === 'transfers' }"
          @click="mode = 'transfers'; loadTransfers()"
        >
          {{ t('wms.inventory.transferWorkflow', '移動管理') }}
          <span v-if="pendingTransferCount > 0" class="tab-badge">{{ pendingTransferCount }}</span>
        </button>
      </div>

      <!-- 倉庫内移動 / 仓库内移动 -->
      <template v-if="mode === 'intra'">
        <p class="form-desc">{{ t('wms.inventory.transferDesc', 'ロケーション間で在庫を移動します。移動元に十分な在庫が必要です。') }}</p>

        <div class="form-grid">
          <!-- 商品選択 / 商品选择 -->
          <div class="form-field">
            <label class="form-label">{{ t('wms.inventory.product', '商品') }} <span class="required-badge">必須</span></label>
            <select v-model="intraForm.productId" class="o-input">
              <option value="">{{ t('wms.inventory.selectProduct', '商品を選択...') }}</option>
              <option v-for="p in products" :key="p._id" :value="p._id">
                {{ p.sku }} - {{ p.name }}
              </option>
            </select>
          </div>

          <!-- 移動数量 / 移动数量 -->
          <div class="form-field">
            <label class="form-label">{{ t('wms.inventory.transferQuantity', '移動数量') }} <span class="required-badge">必須</span></label>
            <input v-model.number="intraForm.quantity" type="number" min="1" class="o-input" :placeholder="t('wms.inventory.transferQuantityPlaceholder', '例: 10')" />
            <span class="form-hint">{{ t('wms.inventory.transferQuantityHint', '1以上の整数を入力してください') }}</span>
          </div>

          <!-- 移動元ロケーション / 移动源库位 -->
          <div class="form-field">
            <label class="form-label">{{ t('wms.inventory.fromLocation', '移動元') }} <span class="required-badge">必須</span></label>
            <select v-model="intraForm.fromLocationId" class="o-input">
              <option value="">{{ t('wms.inventory.selectFromLocation', '移動元を選択...') }}</option>
              <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
                {{ loc.code }} ({{ loc.name }})
              </option>
            </select>
          </div>

          <!-- 移動先ロケーション / 移动目标库位 -->
          <div class="form-field">
            <label class="form-label">{{ t('wms.inventory.toLocation', '移動先') }} <span class="required-badge">必須</span></label>
            <select v-model="intraForm.toLocationId" class="o-input">
              <option value="">{{ t('wms.inventory.selectToLocation', '移動先を選択...') }}</option>
              <option v-for="loc in availableIntraToLocations" :key="loc._id" :value="loc._id">
                {{ loc.code }} ({{ loc.name }})
              </option>
            </select>
          </div>

          <!-- メモ / 备注 -->
          <div class="form-field form-field-full">
            <label class="form-label">{{ t('wms.inventory.memo', 'メモ') }}</label>
            <input v-model="intraForm.memo" type="text" class="o-input" :placeholder="t('wms.inventory.transferReasonPlaceholder', '移動理由...')" />
          </div>
        </div>

        <div class="form-actions">
          <OButton
            variant="primary"
            :disabled="!canSubmitIntra || isSubmitting"
            @click="handleIntraSubmit"
          >
            {{ isSubmitting ? t('wms.inventory.processing', '処理中...') : t('wms.inventory.executeTransfer', '在庫を移動') }}
          </OButton>
        </div>
      </template>

      <!-- 拠点間移動 / 跨仓库转移 -->
      <template v-if="mode === 'cross'">
        <p class="form-desc">{{ t('wms.inventory.crossSiteTransferDesc', '異なる倉庫間で在庫を移動します。移動元倉庫に十分な在庫が必要です。') }}</p>

        <div class="form-grid">
          <!-- 商品選択 / 商品选择 -->
          <div class="form-field form-field-full">
            <label class="form-label">{{ t('wms.inventory.product', '商品') }} <span class="required-badge">必須</span></label>
            <select v-model="crossForm.productId" class="o-input">
              <option value="">{{ t('wms.inventory.selectProduct', '商品を選択...') }}</option>
              <option v-for="p in products" :key="p._id" :value="p._id">
                {{ p.sku }} - {{ p.name }}
              </option>
            </select>
          </div>

          <!-- 移動元倉庫 / 移动源仓库 -->
          <div class="form-field">
            <label class="form-label">{{ t('wms.inventory.fromWarehouse', '移動元倉庫') }} <span class="required-badge">必須</span></label>
            <select v-model="crossForm.fromWarehouseId" class="o-input" @change="onFromWarehouseChange">
              <option value="">{{ t('wms.inventory.selectWarehouse', '倉庫を選択...') }}</option>
              <option v-for="w in warehouses" :key="w._id" :value="w._id">
                {{ w.code }} - {{ w.name }}
              </option>
            </select>
          </div>

          <!-- 移動先倉庫 / 移动目标仓库 -->
          <div class="form-field">
            <label class="form-label">{{ t('wms.inventory.toWarehouse', '移動先倉庫') }} <span class="required-badge">必須</span></label>
            <select v-model="crossForm.toWarehouseId" class="o-input" @change="onToWarehouseChange">
              <option value="">{{ t('wms.inventory.selectWarehouse', '倉庫を選択...') }}</option>
              <option v-for="w in availableToWarehouses" :key="w._id" :value="w._id">
                {{ w.code }} - {{ w.name }}
              </option>
            </select>
          </div>

          <!-- 移動元ロケーション / 移动源库位 -->
          <div class="form-field">
            <label class="form-label">{{ t('wms.inventory.fromLocation', '移動元ロケーション') }} <span class="required-badge">必須</span></label>
            <select v-model="crossForm.fromLocationId" class="o-input" :disabled="!crossForm.fromWarehouseId">
              <option value="">{{ t('wms.inventory.selectFromLocation', 'ロケーションを選択...') }}</option>
              <option v-for="loc in fromWarehouseLocations" :key="loc._id" :value="loc._id">
                {{ loc.code }} ({{ loc.name }})
              </option>
            </select>
          </div>

          <!-- 移動先ロケーション / 移动目标库位 -->
          <div class="form-field">
            <label class="form-label">{{ t('wms.inventory.toLocation', '移動先ロケーション') }} <span class="required-badge">必須</span></label>
            <select v-model="crossForm.toLocationId" class="o-input" :disabled="!crossForm.toWarehouseId">
              <option value="">{{ t('wms.inventory.selectToLocation', 'ロケーションを選択...') }}</option>
              <option v-for="loc in toWarehouseLocations" :key="loc._id" :value="loc._id">
                {{ loc.code }} ({{ loc.name }})
              </option>
            </select>
          </div>

          <!-- 移動数量 / 移动数量 -->
          <div class="form-field">
            <label class="form-label">{{ t('wms.inventory.transferQuantity', '移動数量') }} <span class="required-badge">必須</span></label>
            <input v-model.number="crossForm.quantity" type="number" min="1" class="o-input" :placeholder="t('wms.inventory.transferQuantityPlaceholder', '例: 10')" />
            <span class="form-hint">{{ t('wms.inventory.transferQuantityHint', '1以上の整数を入力してください') }}</span>
          </div>

          <!-- 理由 / 理由 -->
          <div class="form-field">
            <label class="form-label">{{ t('wms.inventory.reason', '理由') }}</label>
            <input v-model="crossForm.reason" type="text" class="o-input" :placeholder="t('wms.inventory.crossSiteReasonPlaceholder', '拠点間移動の理由...')" />
          </div>
        </div>

        <div class="form-actions">
          <OButton
            variant="primary"
            :disabled="!canSubmitCross || isSubmitting"
            @click="handleCrossSubmit"
          >
            {{ isSubmitting ? t('wms.inventory.processing', '処理中...') : t('wms.inventory.executeCrossSiteTransfer', '拠点間移動を実行') }}
          </OButton>
        </div>
      </template>
    </div>

    <!-- 移動履歴 / 移动履历 -->
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">
      {{ t('wms.inventory.recentTransferHistory', '最近の移動履歴') }}
      <OButton variant="secondary" size="sm" @click="exportTransferCsv">{{ t('wms.inventory.csvExport', 'CSV出力') }}</OButton>
    </div>

    <div class="table-section">
      <Table
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
// 拠点間移動ビュー / 拠点间移动视图
// 3PL向け: ロケーション間・倉庫間で在庫を移動する機能
// 面向3PL: 在库位间・仓库间移动库存的功能
import { computed, h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import Table from '@/components/table/Table.vue'
import { transferStock, crossSiteTransfer, fetchMovements } from '@/api/inventory'
import { fetchLocations } from '@/api/location'
import { fetchProducts } from '@/api/product'
import { fetchWarehouses } from '@/api/warehouse'
import type { Product } from '@/types/product'
import type { Location } from '@/types/inventory'
import type { StockMove } from '@/types/inventory'
import type { TableColumn } from '@/types/table'
import type { Warehouse } from '@/api/warehouse'

const toast = useToast()
const { t } = useI18n()

// 移動モード / 移动模式
const mode = ref<'intra' | 'cross'>('intra')

const products = ref<Product[]>([])
const allLocations = ref<Location[]>([])
const warehouses = ref<Warehouse[]>([])
const isSubmitting = ref(false)
const isLoadingHistory = ref(false)
const historyRows = ref<StockMove[]>([])

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
  await loadHistory()
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

.o-input {
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 14px;
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
  width: 100%;
}

.o-input:disabled {
  background: var(--o-gray-100, #f5f7fa);
  color: var(--o-gray-400, #c0c4cc);
  cursor: not-allowed;
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
}
</style>
