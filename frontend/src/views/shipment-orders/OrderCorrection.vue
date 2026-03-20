<template>
  <div class="order-correction">
    <ControlPanel :title="t('wms.shipment.orderCorrection', '受注データ訂正')" :show-search="false" />

    <!-- 検索 / 搜索 -->
    <div class="o-card search-bar">
      <div class="form-field">
        <label class="form-label">{{ t('wms.shipment.searchOrder', '注文番号 / 顧客管理番号') }}</label>
        <div class="search-row">
          <input v-model="searchQuery" type="text" class="o-input" :placeholder="t('wms.shipment.searchPlaceholder', '注文番号または管理番号を入力...')" @keyup.enter="handleSearch" />
          <OButton variant="primary" :disabled="!searchQuery || isSearching" @click="handleSearch">
            {{ t('wms.common.search', '検索') }}
          </OButton>
        </div>
      </div>
    </div>

    <!-- 注文詳細編集フォーム / 订单详情编辑表单 -->
    <div v-if="order" class="o-card">
      <h3 class="form-title">{{ t('wms.shipment.orderDetail', '注文詳細') }}: {{ order.orderNumber }}</h3>

      <div class="form-grid">
        <!-- 届け先情報 / 收件人信息 -->
        <div class="form-field" style="grid-column: 1 / -1">
          <label class="form-label section-label">{{ t('wms.shipment.recipientInfo', '届け先情報') }}</label>
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.shipment.recipientName', '届け先氏名') }}</label>
          <input v-model="order.recipientName" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.shipment.recipientPhone', '電話番号') }}</label>
          <input v-model="order.recipientPhone" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.shipment.postalCode', '郵便番号') }}</label>
          <input v-model="order.postalCode" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.shipment.prefecture', '都道府県') }}</label>
          <input v-model="order.prefecture" type="text" class="o-input" />
        </div>
        <div class="form-field" style="grid-column: 1 / -1">
          <label class="form-label">{{ t('wms.shipment.address', '住所') }}</label>
          <input v-model="order.address" type="text" class="o-input" />
        </div>

        <!-- 商品明細 / 商品明细 -->
        <div class="form-field" style="grid-column: 1 / -1">
          <label class="form-label section-label">{{ t('wms.shipment.orderItems', '商品明細') }}</label>
        </div>
      </div>

      <!-- 商品行 / 商品行 -->
      <div class="items-table">
        <div class="items-header">
          <span class="col-sku">SKU</span>
          <span class="col-name">{{ t('wms.shipment.productName', '商品名') }}</span>
          <span class="col-qty">{{ t('wms.shipment.quantity', '数量') }}</span>
          <span class="col-action"></span>
        </div>
        <div v-for="(item, idx) in order.items" :key="idx" class="items-row">
          <input v-model="item.sku" type="text" class="o-input col-sku" />
          <input v-model="item.productName" type="text" class="o-input col-name" />
          <input v-model.number="item.quantity" type="number" min="1" class="o-input col-qty" />
          <OButton variant="secondary" size="sm" @click="removeItem(idx)">{{ t('wms.common.delete', '削除') }}</OButton>
        </div>
        <OButton variant="secondary" size="sm" style="margin-top: 8px" @click="addItem">
          {{ t('wms.shipment.addItem', '+ 商品追加') }}
        </OButton>
      </div>

      <div class="form-actions">
        <OButton variant="primary" :disabled="isSaving" @click="handleSave">
          {{ isSaving ? t('wms.common.processing', '処理中...') : t('wms.common.save', '保存') }}
        </OButton>
      </div>
    </div>

    <!-- 検索結果なし / 无搜索结果 -->
    <div v-else-if="searchDone" class="o-card empty-state">
      {{ t('wms.shipment.noOrderFound', '該当する注文が見つかりませんでした。') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { apiFetch } from '@/api/http'
import { getApiBaseUrl } from '@/api/base'

const toast = useToast()
const { t } = useI18n()
const API_BASE_URL = getApiBaseUrl()

const searchQuery = ref('')
const isSearching = ref(false)
const isSaving = ref(false)
const searchDone = ref(false)

interface OrderItem {
  sku: string
  productName: string
  quantity: number
}

interface OrderData {
  _id: string
  orderNumber: string
  recipientName: string
  recipientPhone: string
  postalCode: string
  prefecture: string
  address: string
  items: OrderItem[]
}

const order = ref<OrderData | null>(null)

// 注文検索 / 搜索订单
const handleSearch = async () => {
  if (!searchQuery.value) return
  isSearching.value = true
  searchDone.value = false
  order.value = null
  try {
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders?search=${encodeURIComponent(searchQuery.value)}`)
    if (!res.ok) throw new Error(res.statusText)
    const data = await res.json()
    const items = data.items || data || []
    if (items.length > 0) {
      const raw = items[0]
      order.value = {
        _id: raw._id,
        orderNumber: raw.orderNumber || raw.order_number || '',
        recipientName: raw.recipientName || raw.consigneeName || '',
        recipientPhone: raw.recipientPhone || raw.consigneePhone || '',
        postalCode: raw.postalCode || raw.consigneePostalCode || '',
        prefecture: raw.prefecture || raw.consigneePrefecture || '',
        address: raw.address || raw.consigneeAddress || '',
        items: (raw.items || raw.orderItems || []).map((i: any) => ({
          sku: i.sku || '',
          productName: i.productName || i.name || '',
          quantity: i.quantity || 1,
        })),
      }
    }
    searchDone.value = true
  } catch (e: any) {
    toast.showError(e?.message || t('wms.shipment.searchFailed', '検索に失敗しました'))
  } finally {
    isSearching.value = false
  }
}

// 商品行追加 / 添加商品行
const addItem = () => {
  if (!order.value) return
  order.value.items.push({ sku: '', productName: '', quantity: 1 })
}

// 商品行削除 / 删除商品行
const removeItem = (idx: number) => {
  if (!order.value) return
  order.value.items.splice(idx, 1)
}

// 保存 / 保存
const handleSave = async () => {
  if (!order.value) return
  isSaving.value = true
  try {
    const body = {
      recipientName: order.value.recipientName,
      recipientPhone: order.value.recipientPhone,
      postalCode: order.value.postalCode,
      prefecture: order.value.prefecture,
      address: order.value.address,
      items: order.value.items,
    }
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders/${order.value._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
    toast.showSuccess(t('wms.shipment.orderSaved', '注文を更新しました'))
  } catch (e: any) {
    toast.showError(e?.message || t('wms.shipment.saveFailed', '注文の更新に失敗しました'))
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.order-correction { display: flex; flex-direction: column; padding: 0 20px 20px; gap: 16px; }
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.o-card { background: var(--o-view-background, #fff); border: 1px solid var(--o-border-color, #e4e7ed); border-radius: var(--o-border-radius, 8px); padding: 1.5rem; }
.search-bar { display: flex; gap: 1rem; align-items: flex-end; }
.search-row { display: flex; gap: 8px; align-items: center; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--o-gray-700, #303133); }
.form-title { font-size: 18px; font-weight: 600; color: var(--o-gray-700, #303133); margin: 0 0 1rem 0; }
.section-label { font-size: 14px; font-weight: 700; color: var(--o-brand-primary, #714b67); border-bottom: 1px solid var(--o-border-color, #e4e7ed); padding-bottom: 4px; margin-top: 0.5rem; }
.o-input { padding: 8px 12px; border: 1px solid var(--o-border-color, #dcdfe6); border-radius: var(--o-border-radius, 4px); font-size: 14px; color: var(--o-gray-700, #303133); background: var(--o-view-background, #fff); width: 100%; }
.items-table { margin-top: 0.5rem; }
.items-header, .items-row { display: flex; gap: 8px; align-items: center; padding: 4px 0; }
.items-header { font-size: 12px; font-weight: 600; color: var(--o-gray-500, #909399); border-bottom: 1px solid var(--o-border-color, #e4e7ed); }
.col-sku { width: 140px; flex-shrink: 0; }
.col-name { flex: 1; }
.col-qty { width: 80px; flex-shrink: 0; }
.col-action { width: 60px; flex-shrink: 0; }
.form-actions { margin-top: 1.5rem; text-align: right; }
.empty-state { text-align: center; color: var(--o-gray-500, #909399); padding: 2rem; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
</style>
