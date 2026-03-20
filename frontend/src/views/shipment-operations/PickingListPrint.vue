<template>
  <div class="picking-list-print">
    <ControlPanel :title="t('wms.shipment.pickingList', 'ピッキングリスト / 前伝票出力')" :show-search="false" />

    <!-- 検索・フィルター / 搜索/筛选 -->
    <div class="o-card filter-bar">
      <div class="form-field">
        <label class="form-label">{{ t('wms.shipment.searchOrder', '注文検索') }}</label>
        <input v-model="searchQuery" type="text" class="o-input" :placeholder="t('wms.shipment.searchPlaceholder', '注文番号...')" @keyup.enter="loadOrders" />
      </div>
      <OButton variant="primary" :disabled="isLoading" @click="loadOrders">
        {{ t('wms.common.search', '検索') }}
      </OButton>
    </div>

    <!-- 注文リスト（チェックボックス） / 订单列表（复选框） -->
    <div class="o-card">
      <h3 class="form-title">{{ t('wms.shipment.selectOrders', '対象注文を選択') }}</h3>
      <div v-if="orders.length === 0" class="empty-state">
        {{ t('wms.shipment.noOrders', '注文が見つかりません。検索してください。') }}
      </div>
      <div v-else class="order-list">
        <label class="check-all">
          <input type="checkbox" :checked="allSelected" @change="toggleAll" />
          {{ t('wms.common.selectAll', 'すべて選択') }} ({{ selectedIds.length }}/{{ orders.length }})
        </label>
        <div v-for="o in orders" :key="o._id" class="order-row">
          <input type="checkbox" :value="o._id" v-model="selectedIds" />
          <span class="order-number">{{ o.orderNumber }}</span>
          <span class="order-customer">{{ o.customerName || '-' }}</span>
          <span class="order-count">{{ o.itemCount }} {{ t('wms.common.items', '点') }}</span>
        </div>
      </div>
    </div>

    <!-- ピッキングリストプレビュー / 拣货单预览 -->
    <div v-if="pickingItems.length > 0" class="o-card">
      <h3 class="form-title">{{ t('wms.shipment.pickingPreview', 'ピッキングリスト プレビュー') }}</h3>
      <div class="table-section">
        <Table
          :columns="tableColumns"
          :data="pickingItems"
          row-key="rowKey"
          highlight-columns-on-hover
          pagination-enabled
          pagination-mode="client"
          :page-size="50"
          :page-sizes="[50, 100]"
        />
      </div>
    </div>

    <!-- アクションボタン / 操作按钮 -->
    <div v-if="selectedIds.length > 0" class="action-bar">
      <OButton variant="primary" @click="handlePrint">
        {{ t('wms.shipment.print', '印刷') }}
      </OButton>
      <OButton variant="secondary" @click="handleDownloadPdf">
        {{ t('wms.shipment.downloadPdf', 'PDF ダウンロード') }}
      </OButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import Table from '@/components/table/Table.vue'
import { apiFetch } from '@/api/http'
import { getApiBaseUrl } from '@/api/base'
import type { TableColumn } from '@/types/table'

const toast = useToast()
const { t } = useI18n()
const API_BASE_URL = getApiBaseUrl()

const searchQuery = ref('')
const isLoading = ref(false)
const selectedIds = ref<string[]>([])

interface OrderSummary {
  _id: string
  orderNumber: string
  customerName: string
  itemCount: number
}

interface PickingItem {
  rowKey: string
  sku: string
  productName: string
  quantity: number
  location: string
  pickOrder: number
}

const orders = ref<OrderSummary[]>([])
const pickingItems = ref<PickingItem[]>([])

const allSelected = computed(() => orders.value.length > 0 && selectedIds.value.length === orders.value.length)

const toggleAll = () => {
  if (allSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = orders.value.map(o => o._id)
  }
  loadPickingList()
}

const tableColumns = computed<TableColumn[]>(() => [
  { key: 'pickOrder', dataKey: 'pickOrder', title: t('wms.shipment.pickOrder', 'ピック順'), width: 80, fieldType: 'number' },
  { key: 'sku', dataKey: 'sku', title: 'SKU', width: 140, fieldType: 'string' },
  { key: 'productName', dataKey: 'productName', title: t('wms.shipment.productName', '商品名'), width: 200, fieldType: 'string' },
  { key: 'quantity', dataKey: 'quantity', title: t('wms.shipment.quantity', '数量'), width: 80, fieldType: 'number' },
  { key: 'location', dataKey: 'location', title: t('wms.shipment.location', 'ロケーション'), width: 140, fieldType: 'string' },
])

// 注文読み込み / 加载订单
const loadOrders = async () => {
  isLoading.value = true
  selectedIds.value = []
  pickingItems.value = []
  try {
    const q = searchQuery.value ? `&search=${encodeURIComponent(searchQuery.value)}` : ''
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders?status=confirmed${q}`)
    if (!res.ok) throw new Error(res.statusText)
    const data = await res.json()
    const items = data.items || data || []
    orders.value = items.map((o: any) => ({
      _id: o._id,
      orderNumber: o.orderNumber || o.order_number || '',
      customerName: o.customerName || o.clientName || '',
      itemCount: (o.items || o.orderItems || []).length,
    }))
  } catch (e: any) {
    toast.showError(e?.message || t('wms.shipment.loadFailed', '注文の取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

// ピッキングリスト生成 / 生成拣货单
const loadPickingList = async () => {
  if (selectedIds.value.length === 0) {
    pickingItems.value = []
    return
  }
  try {
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders/picking-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: selectedIds.value }),
    })
    if (!res.ok) throw new Error(res.statusText)
    const data = await res.json()
    const items = data.items || data || []
    pickingItems.value = items.map((item: any, idx: number) => ({
      rowKey: `${item.sku}-${idx}`,
      sku: item.sku || '',
      productName: item.productName || item.name || '',
      quantity: item.quantity || 0,
      location: item.location || item.locationCode || '',
      pickOrder: item.pickOrder || idx + 1,
    }))
  } catch (e: any) {
    toast.showError(e?.message || t('wms.shipment.pickingListFailed', 'ピッキングリストの生成に失敗しました'))
  }
}

// 印刷 / 打印
const handlePrint = () => {
  window.print()
}

// PDFダウンロード / PDF下载
const handleDownloadPdf = async () => {
  try {
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders/picking-list/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: selectedIds.value }),
    })
    if (!res.ok) throw new Error(res.statusText)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `picking-list_${new Date().toISOString().slice(0, 10)}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    toast.showSuccess(t('wms.shipment.pdfDownloaded', 'PDFをダウンロードしました'))
  } catch (e: any) {
    toast.showError(e?.message || t('wms.shipment.pdfFailed', 'PDFの生成に失敗しました'))
  }
}
</script>

<style scoped>
.picking-list-print { display: flex; flex-direction: column; padding: 0 20px 20px; gap: 16px; }
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.table-section { width: 100%; }
.o-card { background: var(--o-view-background, #fff); border: 1px solid var(--o-border-color, #e4e7ed); border-radius: var(--o-border-radius, 8px); padding: 1.5rem; }
.filter-bar { display: flex; gap: 1rem; align-items: flex-end; }
.form-field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.form-label { font-size: 13px; font-weight: 600; color: var(--o-gray-700, #303133); }
.form-title { font-size: 18px; font-weight: 600; color: var(--o-gray-700, #303133); margin: 0 0 1rem 0; }
.o-input { padding: 8px 12px; border: 1px solid var(--o-border-color, #dcdfe6); border-radius: var(--o-border-radius, 4px); font-size: 14px; color: var(--o-gray-700, #303133); background: var(--o-view-background, #fff); width: 100%; }
.order-list { display: flex; flex-direction: column; gap: 4px; }
.check-all { font-size: 13px; font-weight: 600; color: var(--o-gray-500, #909399); padding: 8px 0; border-bottom: 1px solid var(--o-border-color, #e4e7ed); cursor: pointer; display: flex; align-items: center; gap: 8px; }
.order-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; font-size: 14px; border-bottom: 1px solid var(--o-border-color-light, #f0f0f0); }
.order-number { font-family: monospace; font-size: 13px; color: var(--o-brand-primary, #714b67); min-width: 140px; }
.order-customer { flex: 1; color: var(--o-gray-700, #303133); }
.order-count { font-size: 12px; color: var(--o-gray-500, #909399); }
.action-bar { display: flex; gap: 8px; justify-content: flex-end; }
.empty-state { text-align: center; color: var(--o-gray-500, #909399); padding: 2rem; }
@media print { .filter-bar, .action-bar, .check-all, input[type="checkbox"] { display: none !important; } }
</style>
