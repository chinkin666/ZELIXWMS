<template>
  <div class="shipment-order-create">
    <!-- Top bar: search, filter, action buttons -->
    <div class="table-top-bar">
      <div class="table-top-bar__left">
        <input
          class="o-input global-search-input"
          v-model="globalSearchText"
          placeholder="検索..."
        />
        <button
          v-if="!bundleModeEnabled"
          class="o-btn o-btn-secondary bundle-list-btn"
          @click="handleOpenBundleList"
        >
          同捆候補一覧
        </button>
        <button
          v-else
          class="o-btn o-btn-secondary bundle-list-btn"
          @click="handleExitBundleMode"
        >
          同梱モード終了
        </button>
      </div>
      <div class="table-top-bar__center">
        <span class="filter-label">表示データ</span>
        <div class="o-segmented">
          <button class="o-segmented-btn" :class="{active: displayFilter==='all'}" @click="displayFilter='all'">全件</button>
          <button class="o-segmented-btn" :class="{active: displayFilter==='normal'}" @click="displayFilter='normal'">正常のみ</button>
          <button class="o-segmented-btn" :class="{active: displayFilter==='error'}" @click="displayFilter='error'">エラーのみ</button>
        </div>
        <div class="table-top-bar__spacer"></div>
      </div>
      <div class="table-top-bar__right">
        <button class="o-btn o-btn-secondary" style="border-color:#67c23a;color:#67c23a;" @click="handleImportClick">
          一括登録
        </button>
        <button class="o-btn o-btn-primary" @click="handleAdd">
          個別登録
        </button>
      </div>
    </div>

    <!-- Bundle mode bar -->
    <div v-if="bundleModeEnabled" class="bundle-mode-section">
      <div class="bundle-mode-bar" @click="showBundleFilterDialog = true">
        <span class="bundle-mode-bar__title">絞り込み条件：</span>
        <span class="bundle-mode-bar__labels">{{ bundleFilterLabels || '未設定' }}</span>
      </div>
      <div class="bundle-mode-actions">
        <button
          class="o-btn o-btn-primary o-btn-sm"
          :disabled="tableSelectedKeys.length === 0 || selectedBundleGroupKeys.length === 0"
          @click="handleBundleMergeAllSelected"
        >
          同梱する
        </button>
        <button
          class="o-btn o-btn-sm"
          style="border-color:#e6a23c;color:#e6a23c;background:transparent;"
          :disabled="!hasUnbundleableRows"
          @click="handleUnbundleSelected"
        >
          同梱を解除する
        </button>
      </div>
    </div>

    <FormDialog
      v-model="showDialog"
      :title="editingRow ? '出荷指示を編集' : '個別登録'"
      :columns="formColumns"
      :initial-data="editingRow || {}"
      allow-invalid-submit
      @submit="handleFormSubmit"
    />

    <ShipmentOrderImportDialog
      v-model="showImportDialog"
      :order-source-companies="orderSourceCompanies"
      :carriers="carriers"
      default-file-encoding="shift_jis"
      @import="handleImport"
    />

    <Table
      ref="tableRef"
      :columns="tableColumns"
      :data="displayRows"
      :global-search-text="globalSearchText"
      :height="520"
      row-key="id"
      highlight-columns-on-hover
      row-selection-enabled
      pagination-enabled
      pagination-mode="client"
      :page-size="10"
      :page-sizes="[10,25,50,100,500]"
      :header-grouping-enabled="true"
      :header-grouping-config="headerGroupingConfig"
      :header-height="[50, 50]"
      :header-class="headerClass"
      :table-props="tableProps"
      :sort-enabled="!bundleModeEnabled"
      sort-mode="client"
      :sort-by="bundleModeEnabled ? '_bundleGroupKey' : 'id'"
      sort-order="asc"
      :bulk-edit-enabled="true"
      :batch-delete-enabled="batchDeleteEnabled"
      :products="products"
      :show-bundle-tags="true"
      :bundle-filter-keys="bundleFilterKeys"
      page-key="shipment-orders-create"
      v-model:selected-keys="tableSelectedKeys"
      @selection-change="handleTableSelectionChange"
      @batch-delete="handleBatchDelete"
    />

    <!-- Bottom bar -->
    <OrderBottomBar
      :total-count="allRows.length"
      :selected-count="tableSelectedKeys.length"
      :error-count="errorRowCount"
      total-label="登録対象"
    >
      <template #left>
        <!-- Bundle mode: show bundle/unbundle buttons -->
        <template v-if="bundleModeEnabled">
          <button
            class="o-btn o-btn-primary o-btn-sm"
            :disabled="tableSelectedKeys.length === 0 || selectedBundleGroupKeys.length === 0"
            @click="handleBundleMergeAllSelected"
          >
            同梱する
          </button>
          <button
            class="o-btn o-btn-sm"
            style="border-color:#e6a23c;color:#e6a23c;background:transparent;"
            :disabled="!hasUnbundleableRows"
            @click="handleUnbundleSelected"
          >
            同梱を解除する
          </button>
        </template>
        <!-- Normal mode: show standard buttons -->
        <template v-else>
          <button
            class="o-btn o-btn-primary o-btn-sm"
            style="opacity:0.8;"
            :disabled="tableSelectedKeys.length === 0"
            @click="shipPlanDateDialogVisible = true"
          >
            出荷予定日一括設定
          </button>
          <button
            class="o-btn o-btn-primary o-btn-sm"
            style="opacity:0.8;"
            :disabled="tableSelectedKeys.length === 0"
            @click="senderBulkDialogVisible = true"
          >
            ご依頼主一括設定
          </button>
          <button
            class="o-btn o-btn-primary o-btn-sm"
            style="opacity:0.8;"
            :disabled="tableSelectedKeys.length === 0 || carriers.length === 0"
            @click="carrierBulkDialogVisible = true"
          >
            配送会社一括設定
          </button>
          <button
            v-if="tableRef?.showBulkEditButton"
            class="o-btn o-btn-primary o-btn-sm"
            style="opacity:0.8;"
            :disabled="tableSelectedKeys.length === 0"
            @click="tableRef?.openBulkEdit()"
          >
            一括修正
          </button>
          <button
            class="o-btn o-btn-danger o-btn-sm"
            :disabled="allRows.length === 0"
            @click="handleClearAll"
          >
            データクリア
          </button>
          <button
            v-if="batchDeleteEnabled"
            class="o-btn o-btn-danger o-btn-sm"
            :disabled="tableSelectedKeys.length === 0"
            @click="tableRef?.triggerBatchDelete()"
          >
            一括削除 ({{ tableSelectedKeys.length }})
          </button>
        </template>
      </template>
      <template #center>
        <div class="bottom-bar__meta">
          登録対象：<strong>{{ allRows.length }}</strong>件
          <span v-if="errorRowCount > 0" class="bottom-bar__errors">
            （誤り：<strong>{{ errorRowCount }}</strong>件）
          </span>
          <span v-if="unregisteredSkuRowCount > 0" class="bottom-bar__unregistered">
            （商品SKU未登録：<strong>{{ unregisteredSkuRowCount }}</strong>件）
          </span>
        </div>
      </template>
      <template #alert>
        <div
          v-if="backendErrorCount > 0"
          class="bottom-bar__alert"
          style="background:#fef0f0;border:1px solid #fde2e2;border-radius:6px;padding:8px 12px;color:#f56c6c;font-size:13px;display:flex;align-items:center;justify-content:space-between;"
        >
          <span>サーバー側でエラーが発生しました。エラー行のみ表示に切り替えています。</span>
          <button style="background:none;border:none;font-size:16px;cursor:pointer;color:#f56c6c;" @click="clearBackendErrors">&times;</button>
        </div>
      </template>
      <template #right>
        <button
          class="o-btn o-btn-primary"
          :disabled="allRows.length === 0 || isSubmitting"
          @click="handleSubmitClick"
        >
          {{ isSubmitting ? '登録中...' : '出荷指示登録' }}
        </button>
        <button
          v-if="backendErrorCount > 0"
          class="o-btn o-btn-danger"
          @click="submitErrorDialogVisible = true"
        >
          エラー詳細
        </button>
      </template>
    </OrderBottomBar>

    <!-- Backend error dialog -->
    <ODialog
      :open="submitErrorDialogVisible"
      title="エラー詳細"
      @close="submitErrorDialogVisible = false"
    >
      <div v-if="backendErrorCount === 0" style="color: #909399;">
        エラーはありません。
      </div>
      <div v-else class="error-list">
        <div class="error-list__meta">
          エラー件数：<strong>{{ backendErrorCount }}</strong>
        </div>
        <div class="error-list__items">
          <div v-for="(e, idx) in backendErrorList" :key="`${idx}-${e.clientId}-${e.field}`" class="error-list__item">
            <div class="error-list__item-title">
              行ID：<strong>{{ e.clientId || '-' }}</strong>
              <span v-if="e.orderNumber">（出荷管理No：{{ e.orderNumber }}）</span>
              <span v-if="e.fieldTitle"> - {{ e.fieldTitle }}</span>
            </div>
            <div class="error-list__item-msg">{{ e.message }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button class="o-btn o-btn-secondary" @click="submitErrorDialogVisible = false">閉じる</button>
        </div>
      </template>
    </ODialog>

    <BundleFilterDialog
      v-model="showBundleFilterDialog"
      :fields="bundleFilterFields"
      :selected-keys="bundleFilterKeys"
      @update:selected-keys="handleBundleFilterUpdate"
      @save="handleBundleFilterSave"
    />

    <!-- ご依頼主一括設定 -->
    <ODialog
      :open="senderBulkDialogVisible"
      title="ご依頼主一括設定"
      @close="senderBulkDialogVisible = false"
    >
      <div class="sender-bulk__meta">
        選択中件数：<strong>{{ tableSelectedKeys.length }}</strong>
      </div>

      <div class="o-form-group">
        <label class="o-form-label">ご依頼主</label>
        <select
          class="o-input"
          v-model="senderBulkCompanyId"
          style="width: 100%"
        >
          <option value="">ご依頼主を選択</option>
          <option
            v-for="company in orderSourceCompanies"
            :key="company._id"
            :value="company._id"
          >{{ company.senderName }}</option>
        </select>
      </div>
      <div class="o-form-group">
        <label class="o-form-label">発店コードの上書き</label>
        <div class="row">
          <label class="o-checkbox">
            <input type="checkbox" v-model="senderBulkOverwriteBaseNo">
            <span>既存の値を上書きする</span>
          </label>
          <div class="hint">
            発店コード1・2が既に設定されている場合、ご依頼主の情報で上書きします<br />
            チェックを外すと、既存の値がある場合は保持し、ない場合のみご依頼主の情報を設定します
          </div>
        </div>
      </div>

      <template #footer>
        <div class="sender-bulk__footer">
          <button class="o-btn o-btn-secondary" @click="senderBulkDialogVisible = false">キャンセル</button>
          <button class="o-btn o-btn-primary" @click="applySenderBulkCompany">確定</button>
        </div>
      </template>
    </ODialog>

    <!-- 配送会社一括設定 -->
    <ODialog
      :open="carrierBulkDialogVisible"
      title="配送会社一括設定"
      @close="carrierBulkDialogVisible = false"
    >
      <div class="sender-bulk__meta">
        選択中件数：<strong>{{ tableSelectedKeys.length }}</strong>
      </div>

      <div class="o-form-group">
        <label class="o-form-label">配送会社</label>
        <select
          class="o-input"
          v-model="carrierBulkId"
          style="width: 100%"
        >
          <option value="">配送会社を選択</option>
          <option
            v-for="opt in carrierOptions"
            :key="String(opt.value)"
            :value="opt.value"
          >{{ opt.label }}</option>
        </select>
      </div>

      <template #footer>
        <div class="sender-bulk__footer">
          <button class="o-btn o-btn-secondary" @click="carrierBulkDialogVisible = false">キャンセル</button>
          <button class="o-btn o-btn-primary" @click="applyCarrierBulk">確定</button>
        </div>
      </template>
    </ODialog>

    <!-- 出荷予定日一括設定 -->
    <ODialog
      :open="shipPlanDateDialogVisible"
      title="出荷予定日一括設定"
      @close="shipPlanDateDialogVisible = false"
    >
      <div class="sender-bulk__meta">
        選択中件数：<strong>{{ tableSelectedKeys.length }}</strong>
      </div>

      <div class="o-form-group">
        <label class="o-form-label">出荷予定日</label>
        <input
          type="date"
          class="o-input"
          v-model="shipPlanDateSelected"
          style="width: 100%"
        />
      </div>

      <template #footer>
        <div class="sender-bulk__footer">
          <button class="o-btn o-btn-secondary" @click="shipPlanDateDialogVisible = false">キャンセル</button>
          <button class="o-btn o-btn-primary" @click="applyShipPlanDateToSelected">確定</button>
        </div>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import Table from '@/components/table/OrderTable.vue'
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import FormDialog from '@/components/form/FormDialog.vue'
import ShipmentOrderImportDialog from '@/components/import/ShipmentOrderImportDialog.vue'
import BundleFilterDialog from '@/components/bundle/BundleFilterDialog.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import { getOrderFieldDefinitions } from '@/types/order'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import { fetchCarriers } from '@/api/carrier'
import type { Carrier } from '@/types/carrier'
import type { HeaderGroupingConfig } from '@/components/table/tableHeaderGroup'
import { buildOrderHeaderGroupingConfig } from '@/utils/orderHeaderGrouping'
import type { TableColumn } from '@/types/table'
import { type UserOrderRow, generateTempId } from '@/types/orderRow'
import { fetchOrderSourceCompanies } from '@/api/orderSourceCompany'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import { ShipmentOrderBulkApiError, createShipmentOrdersBulk } from '@/api/shipmentOrders'
import { normalizeDateOnly } from '@/utils/dateNormalize'
import { getNestedValue } from '@/utils/nestedObject'
import { validateCell } from '@/utils/orderValidation'
import {
  createProductMap,
  resolveAndFillProduct,
  determineCoolType,
  determineInvoiceType,
} from '@/utils/productMapUtils'
import type { OrderProduct } from '@/types/order'

const tableRef = ref<InstanceType<typeof Table> | null>(null)
const allRows = ref<UserOrderRow[]>([])
const rows = ref<UserOrderRow[]>([])
const showDialog = ref(false)
const showImportDialog = ref(false)
const showBundleFilterDialog = ref(false)
const bundleFilterKeys = ref<string[]>([])
const bundleModeEnabled = ref(false)
const BUNDLE_FILTER_COOKIE_KEY = 'bundle_filter_keys'
const BUNDLE_MODE_COOKIE_KEY = 'bundle_mode_enabled'
const TABLE_DATA_STORAGE_KEY = 'shipment_order_create_table_data'

// 批量删除功能开关（可通过配置或环境变量控制）
const batchDeleteEnabled = ref(true)

const setCookie = (name: string, value: string, days = 30) => {
  const expires = new Date()
  expires.setDate(expires.getDate() + days)
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`
}

const getCookie = (name: string): string | null => {
  const pattern = `(?:^|; )${encodeURIComponent(name)}=([^;]*)`
  const match = document.cookie.match(new RegExp(pattern))
  const value = match?.[1]
  if (!value) return null
  return decodeURIComponent(value)
}

// localStorage 缓存表格数据
const saveTableDataToStorage = () => {
  try {
    const stripped = allRows.value.map((row: any) => {
      const base: any = {
        ...row,
        sourceRawRows: row.sourceRawRows,
      }
      if (!Array.isArray(base.products)) return base
      return {
        ...base,
        products: base.products.map((p: any) => ({
          inputSku: p.inputSku,
          quantity: p.quantity,
          productId: p.productId,
          productSku: p.productSku,
          productName: p.productName,
          matchedSubSku: p.matchedSubSku,
          ...(p.barcode?.length ? { barcode: p.barcode } : {}),
        })),
      }
    })
    localStorage.setItem(TABLE_DATA_STORAGE_KEY, JSON.stringify(stripped))
  } catch (error) {
    console.error('Failed to save table data to localStorage:', error)
  }
}

const loadTableDataFromStorage = (): UserOrderRow[] => {
  try {
    const saved = localStorage.getItem(TABLE_DATA_STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed)) {
      return parsed as UserOrderRow[]
    }
    return []
  } catch (error) {
    console.error('Failed to load table data from localStorage:', error)
    return []
  }
}

const clearTableDataStorage = () => {
  try {
    localStorage.removeItem(TABLE_DATA_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear table data from localStorage:', error)
  }
}
const editingRow = ref<UserOrderRow | null>(null)
const showOnlyErrors = ref(false)
const showOnlyUnregisteredSku = ref(false)
const displayFilter = ref<'all' | 'normal' | 'error'>('all')

// Watch displayFilter changes and sync with showOnlyErrors
watch(displayFilter, (val) => {
  showOnlyErrors.value = val === 'error'
  showOnlyUnregisteredSku.value = false
})
const orderSourceCompanies = ref<OrderSourceCompany[]>([])
const products = ref<Product[]>([])
const carriers = ref<Carrier[]>([])
const isSubmitting = ref(false)
const submitErrorDialogVisible = ref(false)

type BackendErrorByRow = Record<string, Record<string, string[]>>
const backendErrorsByRowId = ref<BackendErrorByRow>({})

// Table selection（左側チェック）
const tableSelectedKeys = ref<Array<string | number>>([])

// 依頼主一括設定
const senderBulkDialogVisible = ref(false)
const senderBulkCompanyId = ref<string | null>(null)
const senderBulkOverwriteBaseNo = ref(false)

// 配送会社一括設定
const carrierBulkDialogVisible = ref(false)
const carrierBulkId = ref<string | null>(null)

// 出荷予定日一括設定
const shipPlanDateDialogVisible = ref(false)
const shipPlanDateSelected = ref<string>('')

// productMap is now built using the shared utility
const productMap = computed(() => createProductMap(products.value))

const handleTableSelectionChange = (payload: { selectedKeys: Array<string | number>; selectedRows: any[] }) => {
  tableSelectedKeys.value = payload.selectedKeys
}

const formatDateYYYYMMDD = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

const applyShipPlanDateToSelected = () => {
  if (!tableSelectedKeys.value.length) {
    alert('左側のチェックで編集対象の行を選択してください')
    return
  }
  if (!shipPlanDateSelected.value) {
    alert('出荷予定日を選択してください')
    return
  }

  const keySet = new Set(tableSelectedKeys.value)
  let changed = 0
  const nowIso = new Date().toISOString()

  for (const row of allRows.value) {
    if (!keySet.has(row.id)) continue
    row.shipPlanDate = shipPlanDateSelected.value
    row.updatedAt = nowIso
    changed += 1
  }

  saveTableDataToStorage()
  alert(`出荷予定日を${shipPlanDateSelected.value}に設定しました（${changed}件）`)
  shipPlanDateDialogVisible.value = false
}

const applySenderBulkCompany = () => {
  if (!senderBulkCompanyId.value) {
    alert('ご依頼主を選択してください')
    return
  }
  if (!tableSelectedKeys.value.length) {
    alert('左側のチェックで編集対象の行を選択してください')
    return
  }

  const company =
    orderSourceCompanies.value.find((c) => c._id === senderBulkCompanyId.value) || null
  if (!company) {
    alert('ご依頼主が見つかりません')
    return
  }

  const keySet = new Set(tableSelectedKeys.value)
  let changed = 0
  for (const row of allRows.value) {
    if (!keySet.has(row.id)) continue
    ;(row as any).orderSourceCompanyId = company._id
    row.sender = {
      postalCode: company.senderPostalCode || '',
      prefecture: company.senderAddressPrefecture || '',
      city: company.senderAddressCity || '',
      street: company.senderAddressStreet || '',
      name: company.senderName || '',
      phone: company.senderPhone || '',
    }

    if (!row.carrierData) {
      row.carrierData = {}
    }
    if (!row.carrierData.yamato) {
      row.carrierData.yamato = {}
    }

    if (senderBulkOverwriteBaseNo.value) {
      row.carrierData.yamato.hatsuBaseNo1 = company.hatsuBaseNo1 || ''
      row.carrierData.yamato.hatsuBaseNo2 = company.hatsuBaseNo2 || ''
    } else {
      if (!row.carrierData.yamato.hatsuBaseNo1 && company.hatsuBaseNo1) {
        row.carrierData.yamato.hatsuBaseNo1 = company.hatsuBaseNo1
      }
      if (!row.carrierData.yamato.hatsuBaseNo2 && company.hatsuBaseNo2) {
        row.carrierData.yamato.hatsuBaseNo2 = company.hatsuBaseNo2
      }
    }

    row.updatedAt = new Date().toISOString()
    changed += 1
  }

  saveTableDataToStorage()
  alert(`ご依頼主一括設定しました（${changed}件）`)
  senderBulkDialogVisible.value = false
  senderBulkOverwriteBaseNo.value = false
}

const applyCarrierBulk = () => {
  if (!carrierBulkId.value) {
    alert('配送会社を選択してください')
    return
  }
  if (!tableSelectedKeys.value.length) {
    alert('左側のチェックで編集対象の行を選択してください')
    return
  }

  const keySet = new Set(tableSelectedKeys.value)
  let changed = 0
  for (const row of allRows.value) {
    if (!keySet.has(row.id)) continue
    ;(row as any).carrierId = carrierBulkId.value
    row.updatedAt = new Date().toISOString()
    changed += 1
  }

  saveTableDataToStorage()
  alert(`配送会社一括設定しました（${changed}件）`)
  carrierBulkDialogVisible.value = false
}

const handleEdit = (row: UserOrderRow) => {
  editingRow.value = row
  showDialog.value = true
}

const handleAdd = () => {
  editingRow.value = null
  showDialog.value = true
}

const handleDelete = (row: UserOrderRow) => {
  const index = allRows.value.findIndex((r: UserOrderRow) => r.id === row.id)
  if (index !== -1) {
    allRows.value.splice(index, 1)
    saveTableDataToStorage()
    alert(`削除しました: ${row.orderNumber || row.id}`)
  }
}

const handleBatchDelete = async (payload: { selectedKeys: Array<string | number>; selectedRows: any[] }) => {
  const { selectedKeys, selectedRows } = payload

  if (selectedKeys.length === 0) {
    alert('削除する行を選択してください')
    return
  }

  try {
    const orderNumbers = selectedRows
      .map((row: UserOrderRow) => row.orderNumber || row.id)
      .filter(Boolean)
      .slice(0, 5)
    const orderNumbersText = orderNumbers.length > 0 ? orderNumbers.join(', ') : ''
    const moreText = selectedRows.length > 5 ? `他${selectedRows.length - 5}件` : ''

    if (!confirm(`選択した${selectedKeys.length}件の出荷指示を削除しますか？\n${orderNumbersText}${moreText ? `\n${moreText}` : ''}`)) return

    const keySet = new Set(selectedKeys)
    const beforeCount = allRows.value.length
    allRows.value = allRows.value.filter((row: UserOrderRow) => !keySet.has(row.id))
    const deletedCount = beforeCount - allRows.value.length

    tableSelectedKeys.value = []
    saveTableDataToStorage()
    alert(`${deletedCount}件の出荷指示を削除しました`)
  } catch (e: any) {
    if (e === 'cancel') return
    alert(e?.message || '一括削除に失敗しました')
  }
}

const carrierOptions = computed(() => {
  return (carriers.value || [])
    .filter((c) => c && c.enabled !== false)
    .map((c) => ({
      label: `${c.name} (${c.code})`,
      value: c._id,
    }))
})

const allFieldDefinitions = computed(() => getOrderFieldDefinitions({
  carrierOptions: carrierOptions.value,
}))

const hasUnregisteredSku = (row: UserOrderRow): boolean => {
  if (!Array.isArray(row.products) || row.products.length === 0) return false
  return row.products.some((p: OrderProduct) => !p.productId)
}

const unregisteredSkuRowCount = computed(() => {
  return allRows.value.filter((r) => hasUnregisteredSku(r)).length
})

const hasRowErrors = (row: UserOrderRow): boolean => {
  const hasFrontend = baseColumns.value.some((col) => !validateCell(row, col))
  const backend = backendErrorsByRowId.value?.[row.id]
  const hasBackend = backend ? Object.keys(backend).length > 0 : false
  return hasFrontend || hasBackend
}

const hasFrontendRowErrors = (row: UserOrderRow): boolean => {
  return baseColumns.value.some((col) => !validateCell(row, col))
}


const baseColumns = computed(() => {
  const excludedDataKeys = new Set([
    'orderNumber',
    'createdAt',
    'updatedAt',
    'sourceRawRows',
    'carrierRawRow',
    'status.carrierReceipt.isReceived',
    'status.confirm.isConfirmed',
    'status.printed.isPrinted',
  ])

  return (allFieldDefinitions.value || []).filter((col) => {
    if (col.tableVisible === false) return false
    const dataKey = col.dataKey ?? undefined
    if (!dataKey) return false
    if (String(dataKey).startsWith('__mappingExample_')) return false
    if (col.formEditable === false) return false
    if (excludedDataKeys.has(String(dataKey))) return false
    return true
  })
})

const formColumns = computed(() => {
  return allFieldDefinitions.value.filter(
    (col) => col.formEditable !== false && col.dataKey !== undefined
  )
})

const tableColumns = computed(() => {
  const columnsWithHeader = baseColumns.value.map((col: TableColumn) => {
    if (col.dataKey === 'customerManagementNumber' || col.key === 'customerManagementNumber') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: UserOrderRow }) =>
          h(
            'a',
            {
              href: '#',
              class: 'customer-mgmt-link',
              onClick: (e: Event) => {
                e.preventDefault()
                handleEdit(rowData)
              },
            },
            rowData.customerManagementNumber || '-',
          ),
      }
    }
    return { ...col }
  })

  const bundleColumn =
    bundleModeEnabled.value && bundleFilterKeys.value.length > 0
      ? {
          key: '__bundle__',
          dataKey: '__bundle__',
          title: '同梱',
          width: 110,
          fixed: 'left' as const,
          align: 'center' as const,
          rowSpan: ({ rowData }: { rowData: any }) =>
            rowData._bundleGroupFirst ? rowData._bundleGroupSize : 0,
          cellRenderer: ({ rowData }: { rowData: any }) => {
            if (rowData._isBundled) {
              return h(
                'button',
                {
                  class: 'o-btn o-btn-sm',
                  style: 'border-color:#e6a23c;color:#e6a23c;background:transparent;',
                  onClick: () => handleUnbundleSingleRow(rowData.id),
                },
                '同梱解除',
              )
            }
            return h(
              'button',
              {
                class: 'o-btn o-btn-primary o-btn-sm',
                disabled:
                  !bundleModeEnabled.value ||
                  !rowData._bundleGroupFirst ||
                  (rowData._bundleGroupSize ?? 0) < 2,
                onClick: () => handleBundleMerge(rowData._bundleGroupKey),
              },
              '同梱合并',
            )
          },
        }
      : null

  const cols = bundleColumn ? [bundleColumn, ...columnsWithHeader] : [...columnsWithHeader]

  return cols
})

const headerGroupingConfig = computed<HeaderGroupingConfig>(() => {
  const cols = baseColumns.value || []
  return buildOrderHeaderGroupingConfig(cols as any)
})

const bundleFilterFields = computed(() => {
  return baseColumns.value
    .filter((col: TableColumn) => col.formEditable !== false && (col.dataKey ?? col.key) !== 'products')
    .map((col: TableColumn) => ({
      key: col.dataKey ?? col.key,
      title: col.title,
      description: col.description,
    }))
})

const bundleFilterLabels = computed(() => {
  if (bundleFilterKeys.value.length === 0) return ''
  const labels = bundleFilterKeys.value
    .map((key) => {
      const field = bundleFilterFields.value.find((f) => f.key === key)
      return field?.title || key
    })
    .filter(Boolean)
  return labels.join(', ')
})

const hasUnbundleableRows = computed(() => {
  const selectedSet = new Set(tableSelectedKeys.value)
  if (selectedSet.size === 0) return false
  return allRows.value.some((row) => {
    if (!selectedSet.has(row.id)) return false
    return Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0
  })
})

const calculateProductsMetaForRow = (row: UserOrderRow) => {
  const products = Array.isArray(row.products) ? row.products : []
  const skus = [...new Set(products.map((p: OrderProduct) => p.inputSku || p.productSku).filter((s): s is string => Boolean(s)))]
  const names = [...new Set(products.map((p: OrderProduct) => p.productName).filter((name): name is string => Boolean(name && typeof name === 'string' && name.trim())))]
  const barcodes = [...new Set(products.flatMap((p: OrderProduct) => p.barcode || []).filter((b): b is string => Boolean(b)))]
  const totalQuantity = products.reduce((sum, p: OrderProduct) => sum + (p.quantity || 0), 0)
  const totalPrice = products.reduce((sum, p: OrderProduct) => sum + (p.subtotal || 0), 0)

  return {
    skus,
    names,
    barcodes,
    skuCount: skus.length,
    totalQuantity,
    totalPrice,
  }
}

const enrichRowWithProductsMeta = (row: UserOrderRow): UserOrderRow => {
  const meta: any = (row as any)._productsMeta
  const needsRecalc =
    !meta ||
    !Array.isArray(meta.skus) ||
    typeof meta.skuCount !== 'number' ||
    typeof meta.totalQuantity !== 'number' ||
    typeof meta.totalPrice !== 'number' ||
    !Array.isArray(meta.names) ||
    !Array.isArray(meta.barcodes)

  if (!needsRecalc) return row

  return {
    ...row,
    _productsMeta: calculateProductsMetaForRow(row),
  }
}

const globalSearchText = ref<string>('')

const searchedRows = computed(() => {
  return allRows.value.map(enrichRowWithProductsMeta)
})

const filteredRows = computed(() => {
  let result = searchedRows.value

  if (displayFilter.value === 'normal') {
    result = result.filter((row: UserOrderRow) => !hasRowErrors(row))
  } else if (displayFilter.value === 'error') {
    result = result.filter((row: UserOrderRow) => hasRowErrors(row))
  }

  return result
})

const errorRowCount = computed(() => {
  return allRows.value.filter((r) => hasRowErrors(r)).length
})

const backendErrorCount = computed(() => {
  let count = 0
  for (const rowId of Object.keys(backendErrorsByRowId.value || {})) {
    const perField = backendErrorsByRowId.value[rowId] || {}
    for (const fieldKey of Object.keys(perField)) {
      count += (perField[fieldKey] || []).length
    }
  }
  return count
})

const columnTitleMap = computed(() => {
  const map = new Map<string, string>()
  for (const col of baseColumns.value) {
    const k = (col.dataKey || col.key) as string
    map.set(k, col.title)
  }
  return map
})

const backendErrorList = computed(() => {
  const list: Array<{ clientId?: string; field?: string; fieldTitle?: string; message: string; orderNumber?: string }> = []
  for (const rowId of Object.keys(backendErrorsByRowId.value || {})) {
    const row = allRows.value.find((r) => r.id === rowId)
    const perField = backendErrorsByRowId.value[rowId] || {}
    for (const fieldKey of Object.keys(perField)) {
      const msgs = perField[fieldKey] || []
      for (const msg of msgs) {
        list.push({
          clientId: rowId,
          field: fieldKey,
          fieldTitle: columnTitleMap.value.get(fieldKey),
          message: msg,
          orderNumber: row?.orderNumber,
        })
      }
    }
  }
  return list
})

const clearBackendErrors = () => {
  backendErrorsByRowId.value = {}
}

const displayRows = computed(() => {
  if (bundleModeEnabled.value && bundleFilterKeys.value.length > 0) {
    const groups = new Map<string, UserOrderRow[]>()
    const bundledRows: UserOrderRow[] = []

    for (const row of filteredRows.value) {
      if (Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0) {
        bundledRows.push(row)
        continue
      }

      const keyParts = bundleFilterKeys.value.map((k) => getNestedValue(row, k) ?? '')
      const groupKey = JSON.stringify(keyParts)
      if (!groups.has(groupKey)) groups.set(groupKey, [])
      groups.get(groupKey)!.push(row)
    }

    const groupedEntries = Array.from(groups.entries()).filter(([, rows]) => rows.length >= 2)
    groupedEntries.sort(([a], [b]) => a.localeCompare(b))

    const result: any[] = []

    for (const row of bundledRows) {
      result.push({
        ...row,
        _bundleGroupKey: '__bundled__',
        _bundleGroupSize: 1,
        _bundleGroupFirst: true,
        _isBundled: true,
      })
    }

    for (const [key, rows] of groupedEntries) {
      const sortedRows = [...rows].sort((a, b) => {
        const aKey = String((a as any)?.orderNumber || (a as any)?.id || '')
        const bKey = String((b as any)?.orderNumber || (b as any)?.id || '')
        return aKey.localeCompare(bKey)
      })

      sortedRows.forEach((row, idx) => {
        result.push({
          ...row,
          _bundleGroupKey: key,
          _bundleGroupSize: sortedRows.length,
          _bundleGroupFirst: idx === 0,
          _isBundled: false,
        })
      })
    }
    return result
  }

  return [...filteredRows.value]
})

watch(displayRows, (newRows) => {
  rows.value = newRows
}, { immediate: true })

watch([allRows, displayFilter], () => {
  rows.value = [...filteredRows.value]
}, { deep: true })


const handleFormSubmit = (data: Record<string, any>) => {
  const now = new Date().toISOString()

  if (editingRow.value) {
    const index = allRows.value.findIndex((r: UserOrderRow) => r.id === editingRow.value!.id)
    if (index !== -1) {
      let updatedRow: UserOrderRow = {
        ...editingRow.value,
        orderNumber: editingRow.value.orderNumber || '',
        sourceOrderAt: data.sourceOrderAt !== undefined ? data.sourceOrderAt : editingRow.value.sourceOrderAt,
        carrierId: typeof data.carrierId === 'string' ? data.carrierId : (editingRow.value as any).carrierId || '',
        customerManagementNumber: data.customerManagementNumber || editingRow.value.customerManagementNumber || '',
        orderer: {
          postalCode: data.orderer?.postalCode || '',
          prefecture: data.orderer?.prefecture || '',
          city: data.orderer?.city || '',
          street: data.orderer?.street || '',
          name: data.orderer?.name || '',
          phone: data.orderer?.phone || '',
        },
        recipient: {
          postalCode: data.recipient?.postalCode || '',
          prefecture: data.recipient?.prefecture || '',
          city: data.recipient?.city || '',
          street: data.recipient?.street || '',
          name: data.recipient?.name || '',
          phone: data.recipient?.phone || '',
        },
        honorific: data.honorific !== undefined ? data.honorific : (editingRow.value.honorific ?? '様'),
        products: Array.isArray(data.products) && data.products.length > 0
          ? data.products.map((p: any): OrderProduct => ({
              inputSku: p.inputSku || p.sku || '',
              quantity: p.quantity ? Number(p.quantity) : 1,
              productName: p.productName || p.name || undefined,
            }))
          : editingRow.value.products || [],
        shipPlanDate: data.shipPlanDate || editingRow.value.shipPlanDate || '',
        deliveryTimeSlot: data.deliveryTimeSlot || '',
        deliveryDatePreference: data.deliveryDatePreference ? normalizeDateOnly(data.deliveryDatePreference) : (editingRow.value.deliveryDatePreference ? normalizeDateOnly(editingRow.value.deliveryDatePreference) : undefined),
        invoiceType: data.invoiceType || editingRow.value.invoiceType || '',
        coolType: data.coolType ?? editingRow.value.coolType,
        sender: {
          postalCode: data.sender?.postalCode || '',
          prefecture: data.sender?.prefecture || '',
          city: data.sender?.city || '',
          street: data.sender?.street || '',
          name: data.sender?.name || '',
          phone: data.sender?.phone || '',
        },
        handlingTags: Array.isArray(data.handlingTags) ? data.handlingTags : editingRow.value.handlingTags || [],
        updatedAt: now,
      }
      updatedRow = applyProductDefaults(updatedRow)

      allRows.value[index] = updatedRow
      saveTableDataToStorage()
      alert('出荷指示を更新しました')
    }
  } else {
    const tempId = generateTempId()
    let newRow: UserOrderRow = {
      id: tempId,
      orderNumber: '',
      sourceOrderAt: data.sourceOrderAt,
      carrierId: typeof data.carrierId === 'string' ? data.carrierId : '',
      customerManagementNumber: data.customerManagementNumber || '',
      orderer: {
        postalCode: data.orderer?.postalCode || '',
        prefecture: data.orderer?.prefecture || '',
        city: data.orderer?.city || '',
        street: data.orderer?.street || '',
        name: data.orderer?.name || '',
        phone: data.orderer?.phone || '',
      },
      recipient: {
        postalCode: data.recipient?.postalCode || '',
        prefecture: data.recipient?.prefecture || '',
        city: data.recipient?.city || '',
        street: data.recipient?.street || '',
        name: data.recipient?.name || '',
        phone: data.recipient?.phone || '',
      },
      honorific: data.honorific ?? '様',
      products: Array.isArray(data.products) && data.products.length > 0
        ? data.products.map((p: any): OrderProduct => ({
            inputSku: p.inputSku || p.sku || '',
            quantity: p.quantity ? Number(p.quantity) : 1,
            productName: p.productName || p.name || undefined,
          }))
        : [],
      shipPlanDate: data.shipPlanDate || '',
      deliveryTimeSlot: data.deliveryTimeSlot || '',
      deliveryDatePreference: data.deliveryDatePreference ? normalizeDateOnly(data.deliveryDatePreference) : undefined,
      invoiceType: data.invoiceType || '',
      coolType: data.coolType ?? undefined,
      sender: {
        postalCode: data.sender?.postalCode || '',
        prefecture: data.sender?.prefecture || '',
        city: data.sender?.city || '',
        street: data.sender?.street || '',
        name: data.sender?.name || '',
        phone: data.sender?.phone || '',
      },
      handlingTags: Array.isArray(data.handlingTags) ? data.handlingTags : [],
      sourceRawRows: [],
      createdAt: now,
      updatedAt: now,
    }
    newRow = applyProductDefaults(newRow)

    allRows.value.push(newRow)
    saveTableDataToStorage()
    alert('個別登録しました')
  }

  editingRow.value = null
}

const handleImportClick = () => {
  showImportDialog.value = true
}

const handleImport = (importedRows: UserOrderRow[]) => {
  const rowsWithDefaults = importedRows.map((row: UserOrderRow) => {
    let updatedRow = { ...row }
    if (Array.isArray(updatedRow.products)) {
      updatedRow.products = updatedRow.products.map((p: any): OrderProduct => {
        const quantityNum = p?.quantity !== undefined ? Number(p.quantity) : 1
        return {
          inputSku: p?.inputSku || p?.sku || '',
          quantity: Number.isNaN(quantityNum) ? 1 : quantityNum,
          productName: p?.productName || p?.name || undefined,
          ...(p?.barcode?.length ? { barcode: p.barcode } : {}),
        }
      })
    }
    updatedRow = applyProductDefaults(updatedRow)
    return updatedRow
  })
  allRows.value.push(...rowsWithDefaults)
  saveTableDataToStorage()
  alert(`${importedRows.length}件のデータを取り込みしました`)
}

const loadOrderSourceCompanies = async () => {
  try {
    const companies = await fetchOrderSourceCompanies()
    orderSourceCompanies.value = companies
  } catch (error) {
    console.error('Failed to load order source companies:', error)
    alert('ご依頼主リストの読み込みに失敗しました')
  }
}

const loadProductsCache = async () => {
  try {
    products.value = await fetchProducts()
    if (allRows.value.length > 0) {
      allRows.value = allRows.value.map((row) => applyProductDefaults(row))
    }
  } catch (error) {
    console.error('Failed to load products:', error)
    alert('商品マスタの取得に失敗しました')
  }
}

const loadCarriers = async () => {
  try {
    carriers.value = await fetchCarriers({ enabled: true })
  } catch (error) {
    console.error('Failed to load carriers:', error)
    alert('配送会社マスタの取得に失敗しました')
  }
}

const applyProductDefaults = (row: UserOrderRow): UserOrderRow => {
  const next: UserOrderRow = { ...row }
  const pMap = productMap.value

  if (Array.isArray(next.products)) {
    next.products = next.products.map((p: any): OrderProduct => {
      const inputSku = (p.inputSku || p.sku || '').trim()
      const quantity = p.quantity ?? 1

      if (p.productId && p.inputSku) {
        return p as OrderProduct
      }

      const existingData: Partial<OrderProduct> = {}
      if (p.barcode?.length) existingData.barcode = p.barcode
      if (p.name || p.productName) existingData.productName = p.productName || p.name

      const resolved = resolveAndFillProduct(inputSku, quantity, pMap, existingData)

      return resolved
    })

    const matchedProducts = next.products.filter(p => p.productId)
    if (matchedProducts.length > 0) {
      const nextCoolType = determineCoolType(next.products)
      if (nextCoolType !== undefined) {
        next.coolType = nextCoolType
      }

      const calculatedInvoiceType = determineInvoiceType(next.products, next.invoiceType as '0' | '8' | 'A' | undefined)
      if (calculatedInvoiceType !== null) {
        next.invoiceType = calculatedInvoiceType
      }
    }
  }
  return next
}

onMounted(() => {
  loadOrderSourceCompanies()
  loadProductsCache()
  loadCarriers()

  const saved = getCookie(BUNDLE_FILTER_COOKIE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        bundleFilterKeys.value = parsed.filter((k) => typeof k === 'string')
      }
    } catch (err) {
      console.warn('Failed to parse bundle filter cookie', err)
    }
  }

  const savedMode = getCookie(BUNDLE_MODE_COOKIE_KEY)
  if (savedMode === '1') {
    bundleModeEnabled.value = true
  }

  const savedTableData = loadTableDataFromStorage()
  if (savedTableData.length > 0) {
    allRows.value = savedTableData
    alert(`${savedTableData.length}件のデータを復元しました`)
  }
})

const handleBundleFilterSave = (keys: string[]) => {
  bundleFilterKeys.value = keys
  setCookie(BUNDLE_FILTER_COOKIE_KEY, JSON.stringify(keys ?? []), 30)
  alert('同梱設定を保存しました')
}

const handleBundleFilterUpdate = (keys: string[]) => {
  bundleFilterKeys.value = keys
  setCookie(BUNDLE_FILTER_COOKIE_KEY, JSON.stringify(keys ?? []), 30)
}

const handleOpenBundleList = () => {
  if (bundleFilterKeys.value.length === 0) {
    showBundleFilterDialog.value = true
  } else {
    bundleModeEnabled.value = true
    setCookie(BUNDLE_MODE_COOKIE_KEY, '1', 30)
  }
}

const handleExitBundleMode = () => {
  bundleModeEnabled.value = false
  setCookie(BUNDLE_MODE_COOKIE_KEY, '0', 30)
}

const headerClass = (): string => {
  return ''
}

const tableProps = computed(() => {
  return {
    cellProps: ({ rowData, column }: { rowData: UserOrderRow; column: any }) => {
      const props: any = {}

      const columnConfig = baseColumns.value.find((col) => col.key === column.key || col.dataKey === column.key)
      if (columnConfig) {
        const dataKey = (columnConfig.dataKey || columnConfig.key) as string
        const backendFieldErrors = backendErrorsByRowId.value?.[rowData.id]?.[dataKey]
        const hasBackendError = Array.isArray(backendFieldErrors) && backendFieldErrors.length > 0

        const hasError = !validateCell(rowData, columnConfig) || hasBackendError
        if (hasError) {
          props.class = 'error-cell'
          props.style = {
            backgroundColor: '#ffebee',
          }
        }
      }

      return props
    },
  }
})

const buildBulkUploadPayload = () => {
  return {
    items: allRows.value.map((row) => {
      const order = {
        ...(row.sourceOrderAt && { sourceOrderAt: row.sourceOrderAt }),
        carrierId: (row as any).carrierId,
        customerManagementNumber: row.customerManagementNumber,
        orderer: {
          postalCode: row.orderer?.postalCode || '',
          prefecture: row.orderer?.prefecture || '',
          city: row.orderer?.city || '',
          street: row.orderer?.street || '',
          name: row.orderer?.name || '',
          phone: row.orderer?.phone || '',
        },
        recipient: {
          postalCode: row.recipient?.postalCode || '',
          prefecture: row.recipient?.prefecture || '',
          city: row.recipient?.city || '',
          street: row.recipient?.street || '',
          name: row.recipient?.name || '',
          phone: row.recipient?.phone || '',
        },
        honorific: row.honorific ?? '様',
        products: Array.isArray(row.products)
          ? row.products.map((p: OrderProduct) => ({
              inputSku: p.inputSku || '',
              quantity: typeof p.quantity === 'number' ? p.quantity : Number(p.quantity ?? 1),
              productId: p.productId || undefined,
              productSku: p.productSku || undefined,
              productName: p.productName || undefined,
              matchedSubSku: p.matchedSubSku ? {
                code: p.matchedSubSku.code,
                price: p.matchedSubSku.price,
                description: p.matchedSubSku.description,
              } : undefined,
              imageUrl: p.imageUrl || undefined,
              barcode: p.barcode,
              coolType: p.coolType,
              mailCalcEnabled: p.mailCalcEnabled,
              mailCalcMaxQuantity: p.mailCalcMaxQuantity,
              unitPrice: p.unitPrice,
              subtotal: p.subtotal,
            }))
          : [],
        shipPlanDate: row.shipPlanDate,
        invoiceType: row.invoiceType,
        coolType: row.coolType ?? undefined,
        deliveryTimeSlot: row.deliveryTimeSlot || undefined,
        deliveryDatePreference: row.deliveryDatePreference ? normalizeDateOnly(row.deliveryDatePreference) : undefined,
        orderSourceCompanyId: (row as any).orderSourceCompanyId || undefined,
        carrierData: row.carrierData ? {
          yamato: row.carrierData.yamato ? {
            sortingCode: row.carrierData.yamato.sortingCode || undefined,
            hatsuBaseNo1: row.carrierData.yamato.hatsuBaseNo1 || undefined,
            hatsuBaseNo2: row.carrierData.yamato.hatsuBaseNo2 || undefined,
          } : undefined,
        } : undefined,
        sender: {
          postalCode: row.sender?.postalCode || '',
          prefecture: row.sender?.prefecture || '',
          city: row.sender?.city || '',
          street: row.sender?.street || '',
          name: row.sender?.name || '',
          phone: row.sender?.phone || '',
        },
        handlingTags: Array.isArray(row.handlingTags) ? row.handlingTags : [],
        sourceRawRows: Array.isArray((row as any).sourceRawRows) ? (row as any).sourceRawRows : undefined,
      }
      return { clientId: row.id, order }
    }),
  }
}

const applyBackendErrors = (errors: Array<{ clientId?: string; field?: string; message: string }>) => {
  const next: BackendErrorByRow = {}
  for (const e of errors) {
    const rowId = e.clientId
    if (!rowId) continue
    const rawField = e.field || ''
    const baseField = rawField ? String(rawField).split('.')[0] : ''
    const fieldKey = baseField || '__row__'
    if (!next[rowId]) next[rowId] = {}
    if (!next[rowId][fieldKey]) next[rowId][fieldKey] = []
    next[rowId][fieldKey].push(e.message)
  }
  backendErrorsByRowId.value = next
}

const handleSubmitClick = async () => {
  if (isSubmitting.value) return
  clearBackendErrors()

  if (!allRows.value.length) {
    alert('登録するデータがありません')
    return
  }

  const invalidRows = allRows.value.filter((r) => hasFrontendRowErrors(r))
  if (invalidRows.length > 0) {
    displayFilter.value = 'error'
    alert(`入力に誤りがある行が${invalidRows.length}件あります。エラー行のみ表示に切り替えました。`)
    return
  }

  if (!confirm(`登録対象：${allRows.value.length}件\n出荷指示登録しますか？`)) return

  try {
    isSubmitting.value = true
    const payload = buildBulkUploadPayload()
    const res = await createShipmentOrdersBulk(payload)
    alert(res?.message || '登録しました')

    const successes = Array.isArray((res as any)?.data?.successes) ? ((res as any).data.successes as any[]) : []
    const failures = Array.isArray((res as any)?.data?.failures) ? ((res as any).data.failures as any[]) : []

    if (successes.length > 0) {
      const successIds = new Set(successes.map((s) => s?.clientId).filter(Boolean))
      allRows.value = allRows.value.filter((r) => !successIds.has(r.id))
    }

    tableSelectedKeys.value = []

    if (failures.length > 0) {
      applyBackendErrors(failures)
      displayFilter.value = 'error'
      submitErrorDialogVisible.value = true
    } else {
      allRows.value = []
      rows.value = []
      displayFilter.value = 'all'
      clearBackendErrors()
      clearTableDataStorage()
    }
  } catch (err: any) {
    if (err instanceof ShipmentOrderBulkApiError) {
      if (Array.isArray(err.errors) && err.errors.length > 0) {
        applyBackendErrors(err.errors)
        showOnlyErrors.value = true
        submitErrorDialogVisible.value = true
        alert('サーバー側のバリデーションエラーがあります。')
        return
      }
      alert(err.message || 'アップロードに失敗しました')
      return
    }
    alert(err?.message || 'アップロードに失敗しました')
  } finally {
    isSubmitting.value = false
  }
}

const handleBundleMerge = (groupKey: string) => {
  if (!groupKey) return
  const groups = new Map<string, UserOrderRow[]>()
  for (const row of filteredRows.value) {
    const keyParts = bundleFilterKeys.value.map((k) => getNestedValue(row, k) ?? '')
    const k = JSON.stringify(keyParts)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(row)
  }

  const targetGroup = groups.get(groupKey)
  if (!targetGroup || targetGroup.length < 2) {
    alert('同梱対象が2件以上必要です')
    return
  }

  const [first, ...rest] = targetGroup
  if (!first) return
  const mergedProducts = [
    ...((first.products ?? []) as any[]),
    ...rest.flatMap((r) => (Array.isArray(r.products) ? r.products : [])),
  ]
  const mergedSourceRawRows = [
    ...(((first as any).sourceRawRows ?? []) as any[]),
    ...rest.flatMap((r) => (((r as any).sourceRawRows ?? []) as any[])),
  ]

  const mergedCoolType = determineCoolType(mergedProducts)
  const mergedInvoiceType = determineInvoiceType(mergedProducts, first.invoiceType as '0' | '8' | 'A' | undefined)

  const originalRows = targetGroup.map((r) => {
    const { _bundleOriginalRows, ...cleanRow } = r as any
    return cleanRow
  })

  const mergedRow: UserOrderRow = {
    ...first,
    orderNumber: first.orderNumber || '',
    recipient: {
      postalCode: first.recipient?.postalCode || '',
      prefecture: first.recipient?.prefecture || '',
      city: first.recipient?.city || '',
      street: first.recipient?.street || '',
      name: first.recipient?.name || '',
      phone: first.recipient?.phone || '',
    },
    sender: {
      postalCode: first.sender?.postalCode || '',
      prefecture: first.sender?.prefecture || '',
      city: first.sender?.city || '',
      street: first.sender?.street || '',
      name: first.sender?.name || '',
      phone: first.sender?.phone || '',
    },
    handlingTags: first.handlingTags || [],
    products: mergedProducts,
    sourceRawRows: mergedSourceRawRows,
    coolType: mergedCoolType ?? first.coolType,
    invoiceType: mergedInvoiceType ?? first.invoiceType,
    updatedAt: new Date().toISOString(),
    id: first.id,
    _bundleOriginalRows: originalRows,
  } as any

  const groupIds = new Set(targetGroup.map((r) => r.id))
  const nextAll = [] as UserOrderRow[]
  for (const row of allRows.value) {
    if (row.id === first.id) {
      nextAll.push(mergedRow)
    } else if (!groupIds.has(row.id)) {
      nextAll.push(row)
    }
  }
  allRows.value = nextAll
  saveTableDataToStorage()
  alert(`同梱完了：${targetGroup.length}件を統合しました`)
}

const handleUnbundleSelected = async () => {
  const selectedSet = new Set(tableSelectedKeys.value)
  if (selectedSet.size === 0) {
    alert('解除する行を選択してください')
    return
  }

  const bundledRows = allRows.value.filter((row) => {
    if (!selectedSet.has(row.id)) return false
    return Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0
  })

  if (bundledRows.length === 0) {
    alert('選択された行に同梱済みの行がありません')
    return
  }

  const totalOriginalRows = bundledRows.reduce((sum, row) => sum + ((row as any)._bundleOriginalRows?.length || 0), 0)
  if (!confirm(`選択した${bundledRows.length}件の同梱を解除し、${totalOriginalRows}件の元の行に戻しますか？`)) return

  const bundledIds = new Set(bundledRows.map((r) => r.id))
  const nextAll: UserOrderRow[] = []
  let restoredCount = 0

  for (const row of allRows.value) {
    if (bundledIds.has(row.id)) {
      const originalRows = (row as any)._bundleOriginalRows as UserOrderRow[]
      if (Array.isArray(originalRows) && originalRows.length > 0) {
        for (const originalRow of originalRows) {
          const restoredRow = {
            ...originalRow,
            updatedAt: new Date().toISOString(),
          }
          nextAll.push(restoredRow)
          restoredCount++
        }
      } else {
        nextAll.push(row)
      }
    } else {
      nextAll.push(row)
    }
  }

  allRows.value = nextAll
  tableSelectedKeys.value = []
  saveTableDataToStorage()
  alert(`同梱解除完了：${restoredCount}件の行を復元しました`)
}

const handleUnbundleSingleRow = (rowId: string) => {
  const row = allRows.value.find((r) => r.id === rowId)
  if (!row) return

  const originalRows = (row as any)._bundleOriginalRows as UserOrderRow[]
  if (!Array.isArray(originalRows) || originalRows.length === 0) {
    alert('この行は同梱されていません')
    return
  }

  const nextAll: UserOrderRow[] = []
  let restoredCount = 0

  for (const r of allRows.value) {
    if (r.id === rowId) {
      for (const originalRow of originalRows) {
        const restoredRow = {
          ...originalRow,
          updatedAt: new Date().toISOString(),
        }
        nextAll.push(restoredRow)
        restoredCount++
      }
    } else {
      nextAll.push(r)
    }
  }

  allRows.value = nextAll
  saveTableDataToStorage()
  alert(`同梱解除完了：${restoredCount}件の行を復元しました`)
}

const selectedBundleGroupKeys = computed(() => {
  if (!bundleModeEnabled.value) return []
  if (!bundleFilterKeys.value.length) return []
  const selectedSet = new Set(tableSelectedKeys.value)
  if (!selectedSet.size) return []

  const keys = new Set<string>()
  for (const row of displayRows.value as any[]) {
    const id = (row as any)?.id
    const gk = (row as any)?._bundleGroupKey
    const sz = (row as any)?._bundleGroupSize
    if (!id || !gk) continue
    if (typeof sz === 'number' && sz < 2) continue
    if (selectedSet.has(id)) keys.add(String(gk))
  }
  return Array.from(keys)
})

const handleBundleMergeAllSelected = async () => {
  if (!bundleModeEnabled.value || bundleFilterKeys.value.length === 0) {
    alert('同梱モードとフィルターを有効にしてください')
    return
  }
  if (!tableSelectedKeys.value.length) {
    alert('左側のチェックで同梱したい行を選択してください')
    return
  }

  const groups = new Map<string, UserOrderRow[]>()
  for (const row of filteredRows.value) {
    const keyParts = bundleFilterKeys.value.map((k) => getNestedValue(row, k) ?? '')
    const gk = JSON.stringify(keyParts)
    if (!groups.has(gk)) groups.set(gk, [])
    groups.get(gk)!.push(row)
  }

  const selectedSet = new Set(tableSelectedKeys.value)
  const groupKeysToMerge: string[] = []
  let totalRowsToMerge = 0
  for (const [gk, rows] of groups.entries()) {
    if (rows.length < 2) continue
    if (rows.some((r) => selectedSet.has(r.id))) {
      groupKeysToMerge.push(gk)
      totalRowsToMerge += rows.length
    }
  }

  if (groupKeysToMerge.length === 0) {
    alert('選択した行に同梱可能なグループがありません')
    return
  }

  if (!confirm(`選択行を含む${groupKeysToMerge.length}グループ（合計${totalRowsToMerge}件）を同梱しますか？`)) return

  const mergedByFirstId = new Map<string, UserOrderRow>()
  const idsToRemove = new Set<string>()
  let mergedGroupCount = 0

  for (const gk of groupKeysToMerge) {
    const targetGroup = groups.get(gk)
    if (!targetGroup || targetGroup.length < 2) continue

    const [first, ...rest] = targetGroup
    if (!first) continue

    const mergedProducts = [
      ...((first.products ?? []) as any[]),
      ...rest.flatMap((r) => (Array.isArray(r.products) ? r.products : [])),
    ]
    const mergedSourceRawRows = [
      ...(((first as any).sourceRawRows ?? []) as any[]),
      ...rest.flatMap((r) => (((r as any).sourceRawRows ?? []) as any[])),
    ]

    const mergedCoolType = determineCoolType(mergedProducts)
    const mergedInvoiceType = determineInvoiceType(mergedProducts, first.invoiceType as '0' | '8' | 'A' | undefined)

    const originalRows = targetGroup.map((r) => {
      const { _bundleOriginalRows, ...cleanRow } = r as any
      return cleanRow
    })

    const mergedRow: UserOrderRow = {
      ...first,
      orderNumber: first.orderNumber || '',
      recipient: {
        postalCode: first.recipient?.postalCode || '',
        prefecture: first.recipient?.prefecture || '',
        city: first.recipient?.city || '',
        street: first.recipient?.street || '',
        name: first.recipient?.name || '',
        phone: first.recipient?.phone || '',
      },
      sender: {
        postalCode: first.sender?.postalCode || '',
        prefecture: first.sender?.prefecture || '',
        city: first.sender?.city || '',
        street: first.sender?.street || '',
        name: first.sender?.name || '',
        phone: first.sender?.phone || '',
      },
      handlingTags: first.handlingTags || [],
      products: mergedProducts,
      sourceRawRows: mergedSourceRawRows,
      coolType: mergedCoolType ?? first.coolType,
      invoiceType: mergedInvoiceType ?? first.invoiceType,
      updatedAt: new Date().toISOString(),
      id: first.id,
      _bundleOriginalRows: originalRows,
    } as any

    mergedByFirstId.set(first.id, mergedRow)
    for (const r of targetGroup) {
      if (r.id !== first.id) idsToRemove.add(r.id)
    }
    mergedGroupCount += 1
  }

  const nextAll: UserOrderRow[] = []
  for (const row of allRows.value) {
    if (idsToRemove.has(row.id)) continue
    const replacement = mergedByFirstId.get(row.id)
    nextAll.push(replacement ?? row)
  }
  allRows.value = nextAll

  tableSelectedKeys.value = []
  saveTableDataToStorage()
  alert(`全て同梱完了：${mergedGroupCount}グループを同梱しました`)
}

const handleClearAll = async () => {
  if (allRows.value.length === 0) {
    alert('クリアするデータがありません')
    return
  }

  if (!confirm(`すべてのデータ（${allRows.value.length}件）をクリアしますか？\nこの操作は元に戻せません。`)) return

  allRows.value = []
  rows.value = []
  tableSelectedKeys.value = []
  displayFilter.value = 'all'
  clearBackendErrors()
  clearTableDataStorage()
  alert('すべてのデータをクリアしました')
}
</script>

<style scoped>
.shipment-order-create {
  display: flex;
  flex-direction: column;
}

/* Clickable customer management number link */
:deep(.customer-mgmt-link) {
  color: #409eff;
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
}
:deep(.customer-mgmt-link:hover) {
  text-decoration: underline;
  color: #337ecc;
}

/* New top bar styles */
.table-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #D6D6D6;
  border-radius: 6px;
}

/* 同梱候補一覧 button style */
.bundle-list-btn {
  background-color: #f9f9f9 !important;
  border-color: #d6d6d6 !important;
  color: #000000 !important;
}

.bundle-list-btn:hover {
  background-color: #f0f0f0 !important;
  border-color: #c0c0c0 !important;
  color: #000000 !important;
}

.table-top-bar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-top-bar__center {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.table-top-bar__spacer {
  flex: 1;
}

.table-top-bar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.global-search-input {
  width: 430px;
}

.filter-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

/* Bundle mode section */
.bundle-mode-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

/* Bundle mode bar - clickable filter conditions */
.bundle-mode-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #eeeeee;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.bundle-mode-bar:hover {
  background: #e5e5e5;
}

.bundle-mode-bar__title {
  font-size: 13px;
  color: #102040;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.bundle-mode-bar__labels {
  font-size: 13px;
  color: #102040;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Bundle mode actions row */
.bundle-mode-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-header {
  margin: 20px 0;
}

.table-header h2 {
  margin: 0;
}

:deep(.required-header) {
  display: inline-flex;
  align-items: center;
}

:deep(.required-star) {
  color: #f56c6c;
  font-weight: bold;
  margin-left: 2px;
  font-size: 20px;
  font-weight: 600;
}

:deep(.error-cell) {
  background-color: #ffebee !important;
}

:deep(.hovering-column) {
  background-color: #f5f7fa !important;
}

.table-subtitle {
  margin: 4px 0 0;
  color: #909399;
  font-size: 13px;
}

.sender-bulk__meta {
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
}

.sender-bulk__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint {
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}

.bottom-bar {
  position: sticky;
  bottom: 0;
  margin-top: 16px;
  padding: 12px 14px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 10;
}

.bottom-bar__left {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bottom-bar__meta {
  color: #303133;
  font-size: 13px;
}

.bottom-bar__errors {
  color: #f56c6c;
}

.bottom-bar__unregistered {
  color: #e6a23c;
}

.bottom-bar__alert {
  max-width: 680px;
}

.bottom-bar__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.error-list__meta {
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
}

.error-list__items {
  max-height: 460px;
  overflow: auto;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.error-list__item {
  padding: 10px 12px;
  border-bottom: 1px solid #ebeef5;
}

.error-list__item:last-child {
  border-bottom: none;
}

.error-list__item-title {
  font-size: 13px;
  color: #303133;
  margin-bottom: 4px;
}

.error-list__item-msg {
  font-size: 13px;
  color: #f56c6c;
  white-space: pre-wrap;
}

.o-segmented { display:inline-flex; border:1px solid var(--o-border-color, #d6d6d6); border-radius:var(--o-border-radius, 4px); overflow:hidden; }
.o-segmented-btn { padding:0.25rem 0.75rem; border:none; background:var(--o-view-background, #fff); font-size:var(--o-font-size-small, 13px); cursor:pointer; border-right:1px solid var(--o-border-color, #d6d6d6); }
.o-segmented-btn:last-child { border-right:none; }
.o-segmented-btn.active { background:var(--o-brand-primary, #714B67); color:#fff; }

.o-form-group { margin-bottom:1rem; }
.o-form-label { display:block; font-size:var(--o-font-size-small, 13px); font-weight:500; color:var(--o-gray-700, #606266); margin-bottom:0.25rem; }

.o-checkbox { display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:13px; }
</style>
