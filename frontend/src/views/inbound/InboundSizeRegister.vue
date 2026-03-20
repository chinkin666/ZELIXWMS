<template>
  <div class="inbound-size-register">
    <ControlPanel :title="t('wms.inbound.sizeRegister', '入庫サイズ登録')" :show-search="false" />

    <!-- サイズ登録フォーム / 尺寸登录表单 -->
    <div class="o-card">
      <h3 class="form-title">{{ t('wms.inbound.registerDimensions', '商品サイズ登録') }}</h3>
      <p class="form-desc">{{ t('wms.inbound.sizeRegisterDesc', '入庫時に商品の寸法・重量を登録します。') }}</p>

      <div class="form-grid">
        <div class="form-field" style="grid-column: 1 / -1">
          <label class="form-label">{{ t('wms.inbound.product', '商品') }} <span class="required-badge">必須</span></label>
          <select v-model="form.productId" class="o-input">
            <option value="">{{ t('wms.inbound.selectProduct', '商品を選択...') }}</option>
            <option v-for="p in products" :key="p._id" :value="p._id">
              {{ p.sku }} - {{ p.name }}
            </option>
          </select>
        </div>

        <!-- 商品サイズ / 商品尺寸 -->
        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.width', '幅 (cm)') }}</label>
          <input v-model.number="form.width" type="number" step="0.1" min="0" class="o-input" placeholder="cm" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.depth', '奥行 (cm)') }}</label>
          <input v-model.number="form.depth" type="number" step="0.1" min="0" class="o-input" placeholder="cm" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.height', '高さ (cm)') }}</label>
          <input v-model.number="form.height" type="number" step="0.1" min="0" class="o-input" placeholder="cm" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.weight', '重量 (kg)') }}</label>
          <input v-model.number="form.weight" type="number" step="0.01" min="0" class="o-input" placeholder="kg" />
        </div>

        <!-- 外箱サイズ / 外箱尺寸 -->
        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.outerWidth', '外箱 幅 (cm)') }}</label>
          <input v-model.number="form.outerWidth" type="number" step="0.1" min="0" class="o-input" placeholder="cm" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.outerDepth', '外箱 奥行 (cm)') }}</label>
          <input v-model.number="form.outerDepth" type="number" step="0.1" min="0" class="o-input" placeholder="cm" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.outerHeight', '外箱 高さ (cm)') }}</label>
          <input v-model.number="form.outerHeight" type="number" step="0.1" min="0" class="o-input" placeholder="cm" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.outerWeight', '外箱 重量 (kg)') }}</label>
          <input v-model.number="form.outerWeight" type="number" step="0.01" min="0" class="o-input" placeholder="kg" />
        </div>
      </div>

      <div class="form-actions">
        <OButton variant="primary" :disabled="!canSubmit || isSubmitting" @click="handleSubmit">
          {{ isSubmitting ? t('wms.common.processing', '処理中...') : t('wms.inbound.saveSizes', 'サイズを保存') }}
        </OButton>
      </div>
    </div>

    <!-- 最近の登録 / 最近登录记录 -->
    <div class="section-title">{{ t('wms.inbound.recentEntries', '最近の登録') }}</div>
    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="recentEntries"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="10"
        :page-sizes="[10, 20]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import Table from '@/components/table/Table.vue'
import { apiFetch } from '@/api/http'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import type { TableColumn } from '@/types/table'

const toast = useToast()
const { t } = useI18n()

const products = ref<Product[]>([])
const isSubmitting = ref(false)
const recentEntries = ref<Product[]>([])

const form = ref({
  productId: '',
  width: null as number | null,
  depth: null as number | null,
  height: null as number | null,
  weight: null as number | null,
  outerWidth: null as number | null,
  outerDepth: null as number | null,
  outerHeight: null as number | null,
  outerWeight: null as number | null,
})

const canSubmit = computed(() => !!form.value.productId)

const tableColumns = computed<TableColumn[]>(() => [
  { key: 'sku', dataKey: 'sku', title: 'SKU', width: 120, fieldType: 'string' },
  { key: 'name', dataKey: 'name', title: t('wms.inbound.productName', '商品名'), width: 180, fieldType: 'string' },
  { key: 'width', dataKey: 'width', title: t('wms.inbound.width', '幅'), width: 80, fieldType: 'number' },
  { key: 'depth', dataKey: 'depth', title: t('wms.inbound.depth', '奥行'), width: 80, fieldType: 'number' },
  { key: 'height', dataKey: 'height', title: t('wms.inbound.height', '高さ'), width: 80, fieldType: 'number' },
  { key: 'weight', dataKey: 'weight', title: t('wms.inbound.weight', '重量'), width: 80, fieldType: 'number' },
  { key: 'outerWidth', dataKey: 'outerWidth', title: t('wms.inbound.outerWidth', '外箱幅'), width: 80, fieldType: 'number' },
  { key: 'outerDepth', dataKey: 'outerDepth', title: t('wms.inbound.outerDepth', '外箱奥行'), width: 80, fieldType: 'number' },
  { key: 'outerHeight', dataKey: 'outerHeight', title: t('wms.inbound.outerHeight', '外箱高さ'), width: 80, fieldType: 'number' },
  { key: 'outerWeight', dataKey: 'outerWeight', title: t('wms.inbound.outerWeight', '外箱重量'), width: 80, fieldType: 'number' },
])

// サイズ保存 / 保存尺寸
const handleSubmit = async () => {
  if (!canSubmit.value) return
  isSubmitting.value = true
  try {
    const body: Record<string, number | null> = {
      width: form.value.width,
      depth: form.value.depth,
      height: form.value.height,
      weight: form.value.weight,
      outerWidth: form.value.outerWidth,
      outerDepth: form.value.outerDepth,
      outerHeight: form.value.outerHeight,
      outerWeight: form.value.outerWeight,
    }
    const res = await apiFetch(`/api/products/${form.value.productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText)
    toast.showSuccess(t('wms.inbound.sizeSaved', 'サイズを保存しました'))
    await loadRecentEntries()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.sizeSaveFailed', 'サイズの保存に失敗しました'))
  } finally {
    isSubmitting.value = false
  }
}

// 最近の登録を取得 / 获取最近登录记录
const loadRecentEntries = async () => {
  try {
    const all = await fetchProducts()
    recentEntries.value = all.filter(p => p.width || p.height || p.depth || p.weight).slice(0, 20)
  } catch {
    toast.showError(t('wms.inbound.loadFailed', 'データの取得に失敗しました'))
  }
}

onMounted(async () => {
  try {
    products.value = await fetchProducts()
  } catch {
    toast.showError(t('wms.inbound.productLoadFailed', '商品の取得に失敗しました'))
  }
  await loadRecentEntries()
})
</script>

<style scoped>
.inbound-size-register { display: flex; flex-direction: column; padding: 0 20px 20px; gap: 16px; }
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.table-section { width: 100%; }
.o-card { background: var(--o-view-background, #fff); border: 1px solid var(--o-border-color, #e4e7ed); border-radius: var(--o-border-radius, 8px); padding: 1.5rem; }
.form-title { font-size: 18px; font-weight: 600; color: var(--o-gray-700, #303133); margin: 0 0 4px 0; }
.form-desc { font-size: 13px; color: var(--o-gray-500, #909399); margin: 0 0 1.5rem 0; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1rem; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--o-gray-700, #303133); }
.required-badge { display:inline-block;background:#dc3545;color:#fff;font-size:10px;font-weight:700;line-height:1;padding:2px 5px;border-radius:3px;white-space:nowrap;vertical-align:middle;margin-left:4px; }
.form-actions { margin-top: 1.5rem; text-align: right; }
.section-title { font-size: 16px; font-weight: 600; color: var(--o-gray-700, #303133); padding-bottom: 8px; border-bottom: 1px solid var(--o-border-color, #e4e7ed); }
.o-input { padding: 8px 12px; border: 1px solid var(--o-border-color, #dcdfe6); border-radius: var(--o-border-radius, 4px); font-size: 14px; color: var(--o-gray-700, #303133); background: var(--o-view-background, #fff); width: 100%; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr 1fr; } }
</style>
