<template>
  <div class="shipment-order-create">
    <!-- Top bar: search, filter, action buttons -->
    <div class="table-top-bar">
      <div class="table-top-bar__left">
        <el-input
          v-model="globalSearchText"
          placeholder="検索..."
          clearable
          :prefix-icon="Search"
          class="global-search-input"
        />
        <el-button
          v-if="!bundleModeEnabled"
          class="bundle-list-btn"
          @click="handleOpenBundleList"
        >
          同捆候補一覧
        </el-button>
        <el-button
          v-else
          class="bundle-list-btn"
          @click="handleExitBundleMode"
        >
          同梱モード終了
        </el-button>
      </div>
      <div class="table-top-bar__center">
        <span class="filter-label">表示データ</span>
        <el-radio-group v-model="displayFilter" size="small">
          <el-radio-button value="all">全件</el-radio-button>
          <el-radio-button value="normal">正常のみ</el-radio-button>
          <el-radio-button value="error">エラーのみ</el-radio-button>
        </el-radio-group>
        <div class="table-top-bar__spacer"></div>
      </div>
      <div class="table-top-bar__right">
        <el-button type="success" @click="handleImportClick">
          一括登録
        </el-button>
        <el-button type="primary" @click="handleAdd">
          個別登録
        </el-button>
      </div>
    </div>

    <!-- Bundle mode bar -->
    <div v-if="bundleModeEnabled" class="bundle-mode-section">
      <div class="bundle-mode-bar" @click="showBundleFilterDialog = true">
        <span class="bundle-mode-bar__title">絞り込み条件：</span>
        <span class="bundle-mode-bar__labels">{{ bundleFilterLabels || '未設定' }}</span>
      </div>
      <div class="bundle-mode-actions">
        <el-button
          type="primary"
          size="small"
          :disabled="tableSelectedKeys.length === 0 || selectedBundleGroupKeys.length === 0"
          @click="handleBundleMergeAllSelected"
        >
          同梱する
        </el-button>
        <el-button
          type="warning"
          size="small"
          plain
          :disabled="!hasUnbundleableRows"
          @click="handleUnbundleSelected"
        >
          同梱を解除する
        </el-button>
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
          <el-button
            type="primary"
            size="small"
            :disabled="tableSelectedKeys.length === 0 || selectedBundleGroupKeys.length === 0"
            @click="handleBundleMergeAllSelected"
          >
            同梱する
          </el-button>
          <el-button
            type="warning"
            size="small"
            plain
            :disabled="!hasUnbundleableRows"
            @click="handleUnbundleSelected"
          >
            同梱を解除する
          </el-button>
        </template>
        <!-- Normal mode: show standard buttons -->
        <template v-else>
          <el-button
            type="primary"
            plain
            size="small"
            :disabled="tableSelectedKeys.length === 0"
            @click="shipPlanDateDialogVisible = true"
          >
            出荷予定日一括設定
          </el-button>
          <el-button
            type="primary"
            plain
            size="small"
            :disabled="tableSelectedKeys.length === 0"
            @click="senderBulkDialogVisible = true"
          >
            ご依頼主一括設定
          </el-button>
          <el-button
            type="primary"
            plain
            size="small"
            :disabled="tableSelectedKeys.length === 0 || carriers.length === 0"
            @click="carrierBulkDialogVisible = true"
          >
            配送会社一括設定
          </el-button>
          <el-button
            v-if="tableRef?.showBulkEditButton"
            type="primary"
            plain
            size="small"
            :disabled="tableSelectedKeys.length === 0"
            @click="tableRef?.openBulkEdit()"
          >
            一括修正
          </el-button>
          <el-button
            type="danger"
            plain
            size="small"
            :disabled="allRows.length === 0"
            @click="handleClearAll"
          >
            データクリア
          </el-button>
          <el-button
            v-if="batchDeleteEnabled"
            type="danger"
            plain
            size="small"
            :disabled="tableSelectedKeys.length === 0"
            @click="tableRef?.triggerBatchDelete()"
          >
            一括削除 ({{ tableSelectedKeys.length }})
          </el-button>
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
        <el-alert
          v-if="backendErrorCount > 0"
          class="bottom-bar__alert"
          type="error"
          :closable="true"
          title="サーバー側でエラーが発生しました。エラー行のみ表示に切り替えています。"
          @close="clearBackendErrors"
        />
      </template>
      <template #right>
        <el-button
          type="primary"
          :loading="isSubmitting"
          :disabled="allRows.length === 0"
          @click="handleSubmitClick"
        >
          出荷指示登録
        </el-button>
        <el-button
          v-if="backendErrorCount > 0"
          type="danger"
          plain
          @click="submitErrorDialogVisible = true"
        >
          エラー詳細
        </el-button>
      </template>
    </OrderBottomBar>

    <!-- Backend error dialog -->
    <el-dialog
      v-model="submitErrorDialogVisible"
      title="エラー詳細"
      width="760px"
      :close-on-click-modal="false"
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
          <el-button @click="submitErrorDialogVisible = false">閉じる</el-button>
        </div>
      </template>
    </el-dialog>

    <BundleFilterDialog
      v-model="showBundleFilterDialog"
      :fields="bundleFilterFields"
      :selected-keys="bundleFilterKeys"
      @update:selected-keys="handleBundleFilterUpdate"
      @save="handleBundleFilterSave"
    />

    <!-- ご依頼主一括設定 -->
    <el-dialog
      v-model="senderBulkDialogVisible"
      title="ご依頼主一括設定"
      width="520px"
      :close-on-click-modal="false"
    >
      <div class="sender-bulk__meta">
        選択中件数：<strong>{{ tableSelectedKeys.length }}</strong>
      </div>

      <el-form label-width="120px">
        <el-form-item label="ご依頼主">
          <el-select
            v-model="senderBulkCompanyId"
            filterable
            clearable
            style="width: 100%"
            placeholder="ご依頼主を選択"
          >
            <el-option
              v-for="company in orderSourceCompanies"
              :key="company._id"
              :label="company.senderName"
              :value="company._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="発店コードの上書き">
          <div class="row">
            <el-checkbox v-model="senderBulkOverwriteBaseNo">
              既存の値を上書きする
            </el-checkbox>
            <div class="hint">
              発店コード1・2が既に設定されている場合、ご依頼主の情報で上書きします<br />
              チェックを外すと、既存の値がある場合は保持し、ない場合のみご依頼主の情報を設定します
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="sender-bulk__footer">
          <el-button @click="senderBulkDialogVisible = false">キャンセル</el-button>
          <el-button type="primary" @click="applySenderBulkCompany">確定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 配送会社一括設定 -->
    <el-dialog
      v-model="carrierBulkDialogVisible"
      title="配送会社一括設定"
      width="520px"
      :close-on-click-modal="false"
    >
      <div class="sender-bulk__meta">
        選択中件数：<strong>{{ tableSelectedKeys.length }}</strong>
      </div>

      <el-form label-width="120px">
        <el-form-item label="配送会社">
          <el-select
            v-model="carrierBulkId"
            filterable
            clearable
            style="width: 100%"
            placeholder="配送会社を選択"
          >
            <el-option
              v-for="opt in carrierOptions"
              :key="String(opt.value)"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="sender-bulk__footer">
          <el-button @click="carrierBulkDialogVisible = false">キャンセル</el-button>
          <el-button type="primary" @click="applyCarrierBulk">確定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 出荷予定日一括設定 -->
    <el-dialog
      v-model="shipPlanDateDialogVisible"
      title="出荷予定日一括設定"
      width="520px"
      :close-on-click-modal="false"
      @opened="shipPlanDateSelected = formatDateYYYYMMDD(new Date())"
    >
      <div class="sender-bulk__meta">
        選択中件数：<strong>{{ tableSelectedKeys.length }}</strong>
      </div>

      <el-form label-width="120px">
        <el-form-item label="出荷予定日">
          <el-date-picker
            v-model="shipPlanDateSelected"
            type="date"
            format="YYYY/MM/DD"
            value-format="YYYY/MM/DD"
            style="width: 100%"
            placeholder="出荷予定日を選択"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="sender-bulk__footer">
          <el-button @click="shipPlanDateDialogVisible = false">キャンセル</el-button>
          <el-button type="primary" @click="applyShipPlanDateToSelected">確定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { ElAlert, ElButton, ElDialog, ElInput, ElMessage, ElMessageBox, ElRadioButton, ElRadioGroup } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import type { HeaderClassNameGetter } from 'element-plus'
import Table from '@/components/table/OrderTable.vue'
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import FormDialog from '@/components/form/FormDialog.vue'
import ShipmentOrderImportDialog from '@/components/import/ShipmentOrderImportDialog.vue'
import BundleFilterDialog from '@/components/bundle/BundleFilterDialog.vue'
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
// 剥离可通过 productMap 恢复的快照字段，加载时通过 applyProductDefaults 恢复
// 注意：sourceRawRows 需要保留，因为上传到后端时需要
const saveTableDataToStorage = () => {
  try {
    const stripped = allRows.value.map((row: any) => {
      const base: any = {
        ...row,
        // sourceRawRows を保持（バックエンドへのアップロード時に必要）
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
          // アップロードされたバーコードを保持（商品マスタ復元時に優先使用）
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
    ElMessage.warning('左側のチェックで編集対象の行を選択してください')
    return
  }
  if (!shipPlanDateSelected.value) {
    ElMessage.warning('出荷予定日を選択してください')
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
  ElMessage.success(`出荷予定日を${shipPlanDateSelected.value}に設定しました（${changed}件）`)
  shipPlanDateDialogVisible.value = false
}

const applySenderBulkCompany = () => {
  if (!senderBulkCompanyId.value) {
    ElMessage.warning('ご依頼主を選択してください')
    return
  }
  if (!tableSelectedKeys.value.length) {
    ElMessage.warning('左側のチェックで編集対象の行を選択してください')
    return
  }

  const company =
    orderSourceCompanies.value.find((c) => c._id === senderBulkCompanyId.value) || null
  if (!company) {
    ElMessage.warning('ご依頼主が見つかりません')
    return
  }

  const keySet = new Set(tableSelectedKeys.value)
  let changed = 0
  for (const row of allRows.value) {
    if (!keySet.has(row.id)) continue
    ;(row as any).orderSourceCompanyId = company._id
    // 使用嵌套结构设置 sender 地址
    row.sender = {
      postalCode: company.senderPostalCode || '',
      prefecture: company.senderAddressPrefecture || '',
      city: company.senderAddressCity || '',
      street: company.senderAddressStreet || '',
      name: company.senderName || '',
      phone: company.senderPhone || '',
    }

    // 発店コード1・2の上書き処理（carrierData.yamato へ格納）
    if (!row.carrierData) {
      row.carrierData = {}
    }
    if (!row.carrierData.yamato) {
      row.carrierData.yamato = {}
    }

    if (senderBulkOverwriteBaseNo.value) {
      // 上書きが有効な場合、依頼主の情報で上書き
      row.carrierData.yamato.hatsuBaseNo1 = company.hatsuBaseNo1 || ''
      row.carrierData.yamato.hatsuBaseNo2 = company.hatsuBaseNo2 || ''
    } else {
      // 上書きが無効な場合、既に値がある場合は保持、ない場合は依頼主の情報を設定
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
  ElMessage.success(`ご依頼主一括設定しました（${changed}件）`)
  senderBulkDialogVisible.value = false
  senderBulkOverwriteBaseNo.value = false // リセット
}

const applyCarrierBulk = () => {
  if (!carrierBulkId.value) {
    ElMessage.warning('配送会社を選択してください')
    return
  }
  if (!tableSelectedKeys.value.length) {
    ElMessage.warning('左側のチェックで編集対象の行を選択してください')
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
  ElMessage.success(`配送会社一括設定しました（${changed}件）`)
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
  // 从数据中删除
  const index = allRows.value.findIndex((r: UserOrderRow) => r.id === row.id)
  if (index !== -1) {
    allRows.value.splice(index, 1)
    saveTableDataToStorage()
    ElMessage.success(`削除しました: ${row.orderNumber || row.id}`)
  }
}

const handleBatchDelete = async (payload: { selectedKeys: Array<string | number>; selectedRows: any[] }) => {
  const { selectedKeys, selectedRows } = payload
  
  if (selectedKeys.length === 0) {
    ElMessage.warning('削除する行を選択してください')
    return
  }

  try {
    const orderNumbers = selectedRows
      .map((row: UserOrderRow) => row.orderNumber || row.id)
      .filter(Boolean)
      .slice(0, 5)
    const orderNumbersText = orderNumbers.length > 0 ? orderNumbers.join(', ') : ''
    const moreText = selectedRows.length > 5 ? `他${selectedRows.length - 5}件` : ''

    await ElMessageBox.confirm(
      `選択した${selectedKeys.length}件の出荷指示を削除しますか？\n${orderNumbersText}${moreText ? `\n${moreText}` : ''}`,
      '一括削除確認',
      {
        confirmButtonText: '削除',
        cancelButtonText: 'キャンセル',
        type: 'warning',
        dangerouslyUseHTMLString: false,
      },
    )

    const keySet = new Set(selectedKeys)
    const beforeCount = allRows.value.length
    allRows.value = allRows.value.filter((row: UserOrderRow) => !keySet.has(row.id))
    const deletedCount = beforeCount - allRows.value.length

    tableSelectedKeys.value = []
    saveTableDataToStorage()
    ElMessage.success(`${deletedCount}件の出荷指示を削除しました`)
  } catch (e: any) {
    if (e === 'cancel') return
    ElMessage.error(e?.message || '一括削除に失敗しました')
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

// 使用统一的字段配置定义
const allFieldDefinitions = computed(() => getOrderFieldDefinitions({
  carrierOptions: carrierOptions.value,
}))

// 检查行是否包含未登录的商品SKU
const hasUnregisteredSku = (row: UserOrderRow): boolean => {
  if (!Array.isArray(row.products) || row.products.length === 0) return false
  // 检查是否有任何商品的productId为空（说明SKU未在数据库中找到）
  return row.products.some((p: OrderProduct) => !p.productId)
}

// 统计未登录SKU的行数
const unregisteredSkuRowCount = computed(() => {
  return allRows.value.filter((r) => hasUnregisteredSku(r)).length
})

// 检查行是否有错误 (validateCell is now imported from @/utils/orderValidation)
// 未登录SKU不再视为错误（仅作为参考信息显示）
const hasRowErrors = (row: UserOrderRow): boolean => {
  const hasFrontend = baseColumns.value.some((col) => !validateCell(row, col))
  const backend = backendErrorsByRowId.value?.[row.id]
  const hasBackend = backend ? Object.keys(backend).length > 0 : false
  return hasFrontend || hasBackend
}

const hasFrontendRowErrors = (row: UserOrderRow): boolean => {
  return baseColumns.value.some((col) => !validateCell(row, col))
}


// 根据使用场景过滤字段
// 表格列：仅保留「用户需要上传」的字段（order 定义里用户输入/上传的部分）
const baseColumns = computed(() => {
  const excludedDataKeys = new Set([
    // system-generated / non-uploadable
    'orderNumber',
    'createdAt',
    'updatedAt',
    'sourceRawRows',
    'carrierRawRow',
    // status fields are not user input on this page
    'status.carrierReceipt.isReceived',
    'status.confirm.isConfirmed',
    'status.printed.isPrinted',
  ])

  return (allFieldDefinitions.value || []).filter((col) => {
    // hide non-visible columns (e.g. internal tracking)
    if (col.tableVisible === false) return false

    // mapping examples are not upload targets
    const dataKey = col.dataKey ?? undefined
    if (!dataKey) return false
    if (String(dataKey).startsWith('__mappingExample_')) return false

    // only keep user-editable fields (upload targets)
    if (col.formEditable === false) return false

    if (excludedDataKeys.has(String(dataKey))) return false

    return true
  })
})

// 表单列：显示 formEditable 为 true 的字段
const formColumns = computed(() => {
  return allFieldDefinitions.value.filter(
    (col) => col.formEditable !== false && col.dataKey !== undefined
  )
})

const tableColumns = computed(() => {
  // Override customerManagementNumber to be a clickable link that opens the edit dialog
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
            // Already bundled row: show unbundle button
            if (rowData._isBundled) {
              return h(
                ElButton,
                {
                  type: 'warning',
                  size: 'small',
                  plain: true,
                  onClick: () => handleUnbundleSingleRow(rowData.id),
                },
                () => '同梱解除',
              )
            }
            // Groupable row: show bundle merge button
            return h(
              ElButton,
              {
                type: 'primary',
                size: 'small',
                plain: true,
                disabled:
                  !bundleModeEnabled.value ||
                  !rowData._bundleGroupFirst ||
                  (rowData._bundleGroupSize ?? 0) < 2,
                onClick: () => handleBundleMerge(rowData._bundleGroupKey),
              },
              () => '同梱合并',
            )
          },
        }
      : null

  const cols = bundleColumn ? [bundleColumn, ...columnsWithHeader] : [...columnsWithHeader]

  return cols
})

// 表头分组配置（使用统一的工具函数）
const headerGroupingConfig = computed<HeaderGroupingConfig>(() => {
  // 只对业务列分组：baseColumns（上传字段）
  const cols = baseColumns.value || []
  return buildOrderHeaderGroupingConfig(cols as any)
})

// 同梱設定用の候補（商品以外でユーザーが入力する列）
const bundleFilterFields = computed(() => {
  return baseColumns.value
    .filter((col: TableColumn) => col.formEditable !== false && (col.dataKey ?? col.key) !== 'products')
    .map((col: TableColumn) => ({
      key: col.dataKey ?? col.key,
      title: col.title,
      description: col.description,
    }))
})

// 選択中の名寄せ条件のラベル（表示用）
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

// 同梱済み行があるかどうか（解除ボタンの有効/無効判定用）
const hasUnbundleableRows = computed(() => {
  const selectedSet = new Set(tableSelectedKeys.value)
  if (selectedSet.size === 0) return false
  return allRows.value.some((row) => {
    if (!selectedSet.has(row.id)) return false
    return Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0
  })
})

// 计算前端数据的 _productsMeta（用于搜索）
const calculateProductsMetaForRow = (row: UserOrderRow) => {
  const products = Array.isArray(row.products) ? row.products : []
  // 使用新结构：inputSku 作为 SKU，productName 作为商品名
  const skus = [...new Set(products.map((p: OrderProduct) => p.inputSku || p.productSku).filter((s): s is string => Boolean(s)))]
  const names = [...new Set(products.map((p: OrderProduct) => p.productName).filter((name): name is string => Boolean(name && typeof name === 'string' && name.trim())))]
  // バーコードを収集（各商品の barcode 配列をフラット化して重複排除）
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

// 为行数据添加/补全 _productsMeta（用于前端搜索）
// NOTE:
// - localStorage 里可能已经存在旧版 _productsMeta（没有 names 或 barcodes）
// - 因此这里需要在缺字段时也进行补全
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

// グローバル検索テキスト
const globalSearchText = ref<string>('')

// 搜索后的行数据（グローバル検索はTableコンポーネント側で処理）
const searchedRows = computed(() => {
  // 为所有行添加 _productsMeta（如果还没有的话），以便商品搜索字段能够正常工作
  return allRows.value.map(enrichRowWithProductsMeta)
})

// 最终显示的行数据（搜索 + 表示フィルター）
const filteredRows = computed(() => {
  let result = searchedRows.value

  // 表示データフィルター
  if (displayFilter.value === 'normal') {
    // 正常のみ：エラーがない行のみ表示
    result = result.filter((row: UserOrderRow) => !hasRowErrors(row))
  } else if (displayFilter.value === 'error') {
    // エラーのみ：エラーがある行のみ表示
    result = result.filter((row: UserOrderRow) => hasRowErrors(row))
  }
  // 'all' の場合はフィルターなし

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

// 直接使用 computed 来设置 rows，确保響应式更新
const displayRows = computed(() => {
  // 同梱モード：显示可同梱的分组和已同梱的行
  if (bundleModeEnabled.value && bundleFilterKeys.value.length > 0) {
    const groups = new Map<string, UserOrderRow[]>()
    const bundledRows: UserOrderRow[] = []

    for (const row of filteredRows.value) {
      // 已同梱の行（_bundleOriginalRows がある）は別扱い
      if (Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0) {
        bundledRows.push(row)
        continue
      }

      // Use getNestedValue to support nested paths like 'carrierData.yamato.hatsuBaseNo1'
      const keyParts = bundleFilterKeys.value.map((k) => getNestedValue(row, k) ?? '')
      const groupKey = JSON.stringify(keyParts)
      if (!groups.has(groupKey)) groups.set(groupKey, [])
      groups.get(groupKey)!.push(row)
    }

    // 只保留有至少2条记录的分组，并按 key 排序以便相邻显示
    const groupedEntries = Array.from(groups.entries()).filter(([, rows]) => rows.length >= 2)
    groupedEntries.sort(([a], [b]) => a.localeCompare(b))

    const result: any[] = []

    // 先添加已同梱的行（标记为同梱済み）
    for (const row of bundledRows) {
      result.push({
        ...row,
        _bundleGroupKey: '__bundled__',
        _bundleGroupSize: 1,
        _bundleGroupFirst: true,
        _isBundled: true,
      })
    }

    // 然后添加可同梱的分组
    for (const [key, rows] of groupedEntries) {
      // Make group-internal order stable so the "first" row is predictably the top row.
      // (When bundle mode is ON, table sorting is disabled above to preserve this order.)
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

// 同步 displayRows 到 rows，确保 Table 组件能正确更新
watch(displayRows, (newRows) => {
  rows.value = newRows
}, { immediate: true })

// 监听 allRows 和 displayFilter 的变化，确保数据更新时表格刷新
watch([allRows, displayFilter], () => {
  rows.value = [...filteredRows.value]
}, { deep: true })


const handleFormSubmit = (data: Record<string, any>) => {
  const now = new Date().toISOString()

  if (editingRow.value) {
    // 编辑模式：更新现有行
    const index = allRows.value.findIndex((r: UserOrderRow) => r.id === editingRow.value!.id)
    if (index !== -1) {
      let updatedRow: UserOrderRow = {
        ...editingRow.value,
        orderNumber: editingRow.value.orderNumber || '', // システム自動生成、編集不可
        sourceOrderAt: data.sourceOrderAt !== undefined ? data.sourceOrderAt : editingRow.value.sourceOrderAt,
        carrierId: typeof data.carrierId === 'string' ? data.carrierId : (editingRow.value as any).carrierId || '',
        customerManagementNumber: data.customerManagementNumber || editingRow.value.customerManagementNumber || '',
        // 嵌套地址结构
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
      ElMessage.success('出荷指示を更新しました')
    }
  } else {
    // 新增模式：添加新行
    const tempId = generateTempId()
    let newRow: UserOrderRow = {
      id: tempId,
      orderNumber: '', // システム自動生成（保存時にバックエンドで生成）
      sourceOrderAt: data.sourceOrderAt,
      carrierId: typeof data.carrierId === 'string' ? data.carrierId : '',
      customerManagementNumber: data.customerManagementNumber || '',
      // 嵌套地址结构
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
    ElMessage.success('個別登録しました')
  }

  editingRow.value = null
}

const handleImportClick = () => {
  showImportDialog.value = true
}

const handleImport = (importedRows: UserOrderRow[]) => {
  // 追加导入的数据到现有数据中（不替换）
  const rowsWithDefaults = importedRows.map((row: UserOrderRow) => {
    let updatedRow = { ...row }
    // 规范化 products 数组为新的 OrderProduct 结构
    if (Array.isArray(updatedRow.products)) {
      updatedRow.products = updatedRow.products.map((p: any): OrderProduct => {
        const quantityNum = p?.quantity !== undefined ? Number(p.quantity) : 1
        return {
          // 兼容旧结构：使用 inputSku 或 sku
          inputSku: p?.inputSku || p?.sku || '',
          quantity: Number.isNaN(quantityNum) ? 1 : quantityNum,
          // 如果已有解析结果，保留
          productName: p?.productName || p?.name || undefined,
          // 保留上传的 barcode（优先于商品マスタ）
          ...(p?.barcode?.length ? { barcode: p.barcode } : {}),
        }
      })
    }
    updatedRow = applyProductDefaults(updatedRow)
    return updatedRow
  })
  allRows.value.push(...rowsWithDefaults)
  saveTableDataToStorage()
  ElMessage.success(`${importedRows.length}件のデータを取り込みしました`)
}

// 加载依頼主列表
const loadOrderSourceCompanies = async () => {
  try {
    const companies = await fetchOrderSourceCompanies()
    orderSourceCompanies.value = companies
  } catch (error) {
    console.error('Failed to load order source companies:', error)
    ElMessage.error('ご依頼主リストの読み込みに失敗しました')
  }
}

// 加载商品缓存
const loadProductsCache = async () => {
  try {
    products.value = await fetchProducts()
    // 商品マスタ読み込み後、既存行の商品スナップショットを再解決（localStorage復元時は最小データのみ保存のため）
    if (allRows.value.length > 0) {
      allRows.value = allRows.value.map((row) => applyProductDefaults(row))
    }
  } catch (error) {
    console.error('Failed to load products:', error)
    ElMessage.warning('商品マスタの取得に失敗しました')
  }
}

const loadCarriers = async () => {
  try {
    carriers.value = await fetchCarriers({ enabled: true })
  } catch (error) {
    console.error('Failed to load carriers:', error)
    ElMessage.warning('配送会社マスタの取得に失敗しました')
  }
}

// 根据 SKU 自动填充 送り状種類 / クール区分（必要時）并补充商品
// 送り状種類の自動計算ロジック：
// - mailCalcEnabled: true の商品のみ計算対象
// - 計算対象の商品で (quantity / mailCalcMaxQuantity) を合計
//   - 合計 < 1 → メール便 ('A')
//   - 合計 >= 1 → 宅急便 ('0')
// - mailCalcEnabled: false の商品は計算対象外（元の invoiceType を維持）
const applyProductDefaults = (row: UserOrderRow): UserOrderRow => {
  const next: UserOrderRow = { ...row }
  const pMap = productMap.value

  if (Array.isArray(next.products)) {
    // 转换为新的 OrderProduct 结构
    next.products = next.products.map((p: any): OrderProduct => {
      // 兼容旧结构：如果有inputSku就用inputSku，否则用sku
      const inputSku = (p.inputSku || p.sku || '').trim()
      const quantity = p.quantity ?? 1

      // 如果已经是新结构且有productId，保持原样（但仍需传递已有数据以保留上传值）
      if (p.productId && p.inputSku) {
        return p as OrderProduct
      }

      // 构建已有的上传数据（优先使用上传值）
      const existingData: Partial<OrderProduct> = {}
      if (p.barcode?.length) existingData.barcode = p.barcode
      if (p.name || p.productName) existingData.productName = p.productName || p.name

      // 使用共享工具解析商品（传递已有数据以优先使用上传值）
      const resolved = resolveAndFillProduct(inputSku, quantity, pMap, existingData)

      return resolved
    })

    // 自動計算 クール区分 と 送り状種類
    const matchedProducts = next.products.filter(p => p.productId)
    if (matchedProducts.length > 0) {
      // クール区分を計算
      const nextCoolType = determineCoolType(next.products)
      if (nextCoolType !== undefined) {
        next.coolType = nextCoolType
      }

      // 送り状種類を計算（新ロジック：メール便計算設定に基づく）
      const calculatedInvoiceType = determineInvoiceType(next.products, next.invoiceType as '0' | '8' | 'A' | undefined)
      if (calculatedInvoiceType !== null) {
        next.invoiceType = calculatedInvoiceType
      }
    }
  }
  return next
}

// 组件挂载时加载依頼主列表
onMounted(() => {
  loadOrderSourceCompanies()
  loadProductsCache()
  loadCarriers()

  // 初期化：从 cookie 读取同梱設定
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

  // 从 localStorage 恢复表格数据
  const savedTableData = loadTableDataFromStorage()
  if (savedTableData.length > 0) {
    allRows.value = savedTableData
    ElMessage.info(`${savedTableData.length}件のデータを復元しました`)
  }
})

// 同梱設定保存
const handleBundleFilterSave = (keys: string[]) => {
  bundleFilterKeys.value = keys
  // 保存到 cookie，保持会话后持久
  setCookie(BUNDLE_FILTER_COOKIE_KEY, JSON.stringify(keys ?? []), 30)
  ElMessage.success('同梱設定を保存しました')
}

const handleBundleFilterUpdate = (keys: string[]) => {
  bundleFilterKeys.value = keys
  setCookie(BUNDLE_FILTER_COOKIE_KEY, JSON.stringify(keys ?? []), 30)
}

// 同捆候補一覧ボタン: 同梱モードを有効化し、フィルターダイアログを開く
const handleOpenBundleList = () => {
  if (bundleFilterKeys.value.length === 0) {
    // フィルターが設定されていない場合、設定ダイアログを開く
    showBundleFilterDialog.value = true
  } else {
    // フィルターが設定されている場合、同梱モードを有効化
    bundleModeEnabled.value = true
    setCookie(BUNDLE_MODE_COOKIE_KEY, '1', 30)
  }
}

// 同梱モード終了
const handleExitBundleMode = () => {
  bundleModeEnabled.value = false
  setCookie(BUNDLE_MODE_COOKIE_KEY, '0', 30)
}

// 表头类名处理函数
// 列标题行（headerIndex === 0）使用默认背景色，不添加特殊类名
const headerClass: HeaderClassNameGetter<any> = () => {
  return ''
}

// 表格属性：用于设置单元格样式（错误标记）
const tableProps = computed(() => {
  return {
    cellProps: ({ rowData, column }: { rowData: UserOrderRow; column: any }) => {
      const props: any = {}
      
      // 检查单元格是否有错误
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
      // Backend schema expects createOrderSchema fields with nested address structure
      const order = {
        // orderNumber はシステム自動生成のため、送信時には含めない（バックエンドで生成される）
        ...(row.sourceOrderAt && { sourceOrderAt: row.sourceOrderAt }),
        carrierId: (row as any).carrierId,
        customerManagementNumber: row.customerManagementNumber,
        // Nested orderer address (optional)
        orderer: {
          postalCode: row.orderer?.postalCode || '',
          prefecture: row.orderer?.prefecture || '',
          city: row.orderer?.city || '',
          street: row.orderer?.street || '',
          name: row.orderer?.name || '',
          phone: row.orderer?.phone || '',
        },
        // Nested recipient address (required)
        recipient: {
          postalCode: row.recipient?.postalCode || '',
          prefecture: row.recipient?.prefecture || '',
          city: row.recipient?.city || '',
          street: row.recipient?.street || '',
          name: row.recipient?.name || '',
          phone: row.recipient?.phone || '',
        },
        honorific: row.honorific ?? '様',
        // 新しい OrderProduct 结构を送信
        products: Array.isArray(row.products)
          ? row.products.map((p: OrderProduct) => ({
              // === ユーザー入力 ===
              inputSku: p.inputSku || '',
              quantity: typeof p.quantity === 'number' ? p.quantity : Number(p.quantity ?? 1),
              // === auto-fill解析結果 ===
              productId: p.productId || undefined,
              productSku: p.productSku || undefined,
              productName: p.productName || undefined,
              // === 子SKU情報 ===
              matchedSubSku: p.matchedSubSku ? {
                code: p.matchedSubSku.code,
                price: p.matchedSubSku.price,
                description: p.matchedSubSku.description,
              } : undefined,
              // === 親商品からスナップショット ===
              imageUrl: p.imageUrl || undefined,
              barcode: p.barcode,
              coolType: p.coolType,
              // メール便計算設定
              mailCalcEnabled: p.mailCalcEnabled,
              mailCalcMaxQuantity: p.mailCalcMaxQuantity,
              // === 価格情報 ===
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
        // Carrier-specific data (yamato sort code, hatsuBaseNo, etc.)
        carrierData: row.carrierData ? {
          yamato: row.carrierData.yamato ? {
            sortingCode: row.carrierData.yamato.sortingCode || undefined,
            hatsuBaseNo1: row.carrierData.yamato.hatsuBaseNo1 || undefined,
            hatsuBaseNo2: row.carrierData.yamato.hatsuBaseNo2 || undefined,
          } : undefined,
        } : undefined,
        // Nested sender address (required)
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
    ElMessage.warning('登録するデータがありません')
    return
  }

  const invalidRows = allRows.value.filter((r) => hasFrontendRowErrors(r))
  if (invalidRows.length > 0) {
    displayFilter.value = 'error'
    ElMessage.error(`入力に誤りがある行が${invalidRows.length}件あります。エラー行のみ表示に切り替えました。`)
    return
  }

  try {
    await ElMessageBox.confirm(
      `登録対象：${allRows.value.length}件\n出荷指示登録しますか？`,
      '確認',
      {
        confirmButtonText: '登録',
        cancelButtonText: 'キャンセル',
        type: 'warning',
        dangerouslyUseHTMLString: false,
      },
    )
  } catch {
    return
  }

  try {
    isSubmitting.value = true
    const payload = buildBulkUploadPayload()
    const res = await createShipmentOrdersBulk(payload)
    ElMessage.success(res?.message || '登録しました')

    const successes = Array.isArray((res as any)?.data?.successes) ? ((res as any).data.successes as any[]) : []
    const failures = Array.isArray((res as any)?.data?.failures) ? ((res as any).data.failures as any[]) : []

    // Remove successfully uploaded rows, keep failures (if any)
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
      // All success: clear UI
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
        ElMessage.error('サーバー側のバリデーションエラーがあります。')
        return
      }
      ElMessage.error(err.message || 'アップロードに失敗しました')
      return
    }
    ElMessage.error(err?.message || 'アップロードに失敗しました')
  } finally {
    isSubmitting.value = false
  }
}

// 同梱合并：将同组的订单合并到首行，商品数组合并，其余字段保留首行
const handleBundleMerge = (groupKey: string) => {
  if (!groupKey) return
  const groups = new Map<string, UserOrderRow[]>()
  for (const row of filteredRows.value) {
    // Use getNestedValue to support nested paths like 'carrierData.yamato.hatsuBaseNo1'
    const keyParts = bundleFilterKeys.value.map((k) => getNestedValue(row, k) ?? '')
    const k = JSON.stringify(keyParts)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(row)
  }

  const targetGroup = groups.get(groupKey)
  if (!targetGroup || targetGroup.length < 2) {
    ElMessage.warning('同梱対象が2件以上必要です')
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

  // 同梱後、送り状種類とクール区分を再計算
  const mergedCoolType = determineCoolType(mergedProducts)
  // 同梱時は first の invoiceType をデフォルトとして使用
  const mergedInvoiceType = determineInvoiceType(mergedProducts, first.invoiceType as '0' | '8' | 'A' | undefined)

  // 保存原始行以便解除同梱時還原
  const originalRows = targetGroup.map((r) => {
    // 清除之前的同梱信息，保留原始数据
    const { _bundleOriginalRows, ...cleanRow } = r as any
    return cleanRow
  })

  const mergedRow: UserOrderRow = {
    ...first,
    orderNumber: first.orderNumber || '',
    // 嵌套地址结构
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
    // 同梱後の自動計算結果を反映
    coolType: mergedCoolType ?? first.coolType,
    invoiceType: mergedInvoiceType ?? first.invoiceType,
    updatedAt: new Date().toISOString(),
    id: first.id,
    // 保存原始行以便解除同梱
    _bundleOriginalRows: originalRows,
  } as any

  // 从 allRows 中替换分组行：保留首行位置，移除其余
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
  ElMessage.success(`同梱完了：${targetGroup.length}件を統合しました`)
}

// 同梱解除：選択された同梱済み行を元の複数行に戻す
const handleUnbundleSelected = async () => {
  const selectedSet = new Set(tableSelectedKeys.value)
  if (selectedSet.size === 0) {
    ElMessage.warning('解除する行を選択してください')
    return
  }

  // 選択された行の中から同梱済み行を取得
  const bundledRows = allRows.value.filter((row) => {
    if (!selectedSet.has(row.id)) return false
    return Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0
  })

  if (bundledRows.length === 0) {
    ElMessage.warning('選択された行に同梱済みの行がありません')
    return
  }

  try {
    const totalOriginalRows = bundledRows.reduce((sum, row) => sum + ((row as any)._bundleOriginalRows?.length || 0), 0)
    await ElMessageBox.confirm(
      `選択した${bundledRows.length}件の同梱を解除し、${totalOriginalRows}件の元の行に戻しますか？`,
      '同梱解除',
      {
        confirmButtonText: '解除',
        cancelButtonText: 'キャンセル',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  // 同梱を解除して元の行を復元
  const bundledIds = new Set(bundledRows.map((r) => r.id))
  const nextAll: UserOrderRow[] = []
  let restoredCount = 0

  for (const row of allRows.value) {
    if (bundledIds.has(row.id)) {
      // 同梱済み行を元の複数行に展開
      const originalRows = (row as any)._bundleOriginalRows as UserOrderRow[]
      if (Array.isArray(originalRows) && originalRows.length > 0) {
        for (const originalRow of originalRows) {
          // 元の行を新しいIDで追加（重複を避けるため）
          const restoredRow = {
            ...originalRow,
            updatedAt: new Date().toISOString(),
          }
          nextAll.push(restoredRow)
          restoredCount++
        }
      } else {
        // 元の行がない場合はそのまま保持
        nextAll.push(row)
      }
    } else {
      nextAll.push(row)
    }
  }

  allRows.value = nextAll
  tableSelectedKeys.value = []
  saveTableDataToStorage()
  ElMessage.success(`同梱解除完了：${restoredCount}件の行を復元しました`)
}

// 単一行の同梱解除（行内ボタンから呼び出し）
const handleUnbundleSingleRow = (rowId: string) => {
  const row = allRows.value.find((r) => r.id === rowId)
  if (!row) return

  const originalRows = (row as any)._bundleOriginalRows as UserOrderRow[]
  if (!Array.isArray(originalRows) || originalRows.length === 0) {
    ElMessage.warning('この行は同梱されていません')
    return
  }

  // 同梱を解除して元の行を復元
  const nextAll: UserOrderRow[] = []
  let restoredCount = 0

  for (const r of allRows.value) {
    if (r.id === rowId) {
      // 同梱済み行を元の複数行に展開
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
  ElMessage.success(`同梱解除完了：${restoredCount}件の行を復元しました`)
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

// 全て同梱：選択された行が含まれる同梱グループを一括で同梱する
const handleBundleMergeAllSelected = async () => {
  if (!bundleModeEnabled.value || bundleFilterKeys.value.length === 0) {
    ElMessage.warning('同梱モードとフィルターを有効にしてください')
    return
  }
  if (!tableSelectedKeys.value.length) {
    ElMessage.warning('左側のチェックで同梱したい行を選択してください')
    return
  }

  // Build groups from current filtered rows (stable order), only keep groups with >= 2 rows
  const groups = new Map<string, UserOrderRow[]>()
  for (const row of filteredRows.value) {
    // Use getNestedValue to support nested paths like 'carrierData.yamato.hatsuBaseNo1'
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
    ElMessage.warning('選択した行に同梱可能なグループがありません')
    return
  }

  try {
    await ElMessageBox.confirm(
      `選択行を含む${groupKeysToMerge.length}グループ（合計${totalRowsToMerge}件）を同梱しますか？`,
      '全て同梱',
      {
        confirmButtonText: '同梱',
        cancelButtonText: 'キャンセル',
        type: 'warning',
        dangerouslyUseHTMLString: false,
      },
    )
  } catch {
    return
  }

  // Merge all selected groups in one pass, saving once.
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

    // 同梱後、送り状種類とクール区分を再計算
    const mergedCoolType = determineCoolType(mergedProducts)
    // 同梱時は first の invoiceType をデフォルトとして使用
    const mergedInvoiceType = determineInvoiceType(mergedProducts, first.invoiceType as '0' | '8' | 'A' | undefined)

    // 保存原始行以便解除同梱時還原
    const originalRows = targetGroup.map((r) => {
      const { _bundleOriginalRows, ...cleanRow } = r as any
      return cleanRow
    })

    const mergedRow: UserOrderRow = {
      ...first,
      orderNumber: first.orderNumber || '',
      // 嵌套地址结构
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
      // 同梱後の自動計算結果を反映
      coolType: mergedCoolType ?? first.coolType,
      invoiceType: mergedInvoiceType ?? first.invoiceType,
      updatedAt: new Date().toISOString(),
      id: first.id,
      // 保存原始行以便解除同梱
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
  ElMessage.success(`全て同梱完了：${mergedGroupCount}グループを同梱しました`)
}

// 清除所有数据
const handleClearAll = async () => {
  if (allRows.value.length === 0) {
    ElMessage.info('クリアするデータがありません')
    return
  }

  try {
    await ElMessageBox.confirm(
      `すべてのデータ（${allRows.value.length}件）をクリアしますか？\nこの操作は元に戻せません。`,
      'すべてのデータをクリア',
      {
        confirmButtonText: 'クリア',
        cancelButtonText: 'キャンセル',
        type: 'warning',
        dangerouslyUseHTMLString: false,
      },
    )

    allRows.value = []
    rows.value = []
    tableSelectedKeys.value = []
    displayFilter.value = 'all'
    clearBackendErrors()
    clearTableDataStorage()
    ElMessage.success('すべてのデータをクリアしました')
  } catch (e: any) {
    if (e === 'cancel') return
    ElMessage.error('データのクリアに失敗しました')
  }
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

/* 依頼主一括設定弹窗中的行布局和提示 */
.sender-bulk__meta + .el-form .row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sender-bulk__meta + .el-form .hint {
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
</style>


