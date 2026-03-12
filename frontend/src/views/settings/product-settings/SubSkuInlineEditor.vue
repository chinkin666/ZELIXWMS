<template>
  <div class="sub-sku-inline-section">
    <div class="o-divider">
      <span class="o-divider-text">子SKU管理</span>
    </div>
    <table class="o-list-table" style="width: 100%">
      <thead>
        <tr>
          <th :style="{ width: skuColumnWidth }">子SKUコード</th>
          <th :style="{ width: priceColumnWidth }">価格</th>
          <th>説明</th>
          <th style="width: 60px; text-align: center">有効</th>
          <th style="width: 60px; text-align: center"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, $index) in subSkus" :key="$index">
          <td>
            <div>
              <input
                v-model="row.subSku"
                type="text"
                class="o-input o-input-sm"
                :class="{ 'is-error': validationErrors[$index] }"
                placeholder="子SKUコード"
                @blur="$emit('validate', $index)"
              />
              <div v-if="validationErrors[$index]" class="sku-error-message">
                {{ validationErrors[$index] }}
              </div>
            </div>
          </td>
          <td>
            <input
              v-model.number="row.price"
              type="number"
              class="o-input o-input-sm"
              :min="0"
              placeholder="親価格"
              style="width: 100%"
            />
          </td>
          <td>
            <input v-model="row.description" type="text" class="o-input o-input-sm" placeholder="説明（例: セール価格）" />
          </td>
          <td style="text-align: center">
            <input type="checkbox" v-model="row.isActive" />
          </td>
          <td style="text-align: center">
            <OButton variant="danger" size="sm" @click="$emit('remove', $index)">削除</OButton>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="sub-sku-actions">
      <OButton variant="primary" size="sm" @click="$emit('add')">+ 子SKUを追加</OButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import OButton from '@/components/odoo/OButton.vue'
import type { SubSku } from '@/types/product'

withDefaults(defineProps<{
  subSkus: SubSku[]
  validationErrors: Record<number, string>
  skuColumnWidth?: string
  priceColumnWidth?: string
}>(), {
  skuColumnWidth: '200px',
  priceColumnWidth: '100px',
})

defineEmits<{
  (e: 'add'): void
  (e: 'remove', index: number): void
  (e: 'validate', index: number): void
}>()
</script>

<style scoped>
.sub-sku-inline-section {
  padding: 0 20px 20px;
}

.sub-sku-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-start;
}

.sku-error-message {
  color: #f56c6c;
  font-size: 11px;
  line-height: 1.3;
  margin-top: 2px;
  word-break: break-word;
}

.o-input.is-error {
  border-color: #f56c6c;
  box-shadow: 0 0 0 1px #f56c6c inset;
}

.o-divider {
  display: flex;
  align-items: center;
  margin: 16px 0 12px;
  border: 0;
  white-space: nowrap;
}
.o-divider::before,
.o-divider::after {
  content: '';
  flex: 1;
  border-top: 1px solid #dcdfe6;
}
.o-divider-text {
  padding: 0 12px;
  font-weight: 600;
  color: #409eff;
  font-size: 14px;
}
</style>
