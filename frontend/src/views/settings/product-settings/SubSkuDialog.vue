<template>
  <ODialog
    :open="open"
    :title="t('wms.product.subSkuManagement', '子SKU管理')"
    size="lg"
    @close="$emit('update:open', false)"
  >
    <div v-if="editingProduct" class="sub-sku-header">
      <p><strong>{{ t('wms.product.parentProduct', '親商品') }}:</strong> {{ editingProduct.sku }} - {{ editingProduct.name }}</p>
      <p v-if="editingProduct.price"><strong>{{ t('wms.product.parentProductPrice', '親商品価格') }}:</strong> &yen;{{ editingProduct.price.toLocaleString() }}</p>
    </div>

    <SubSkuInlineEditor
      :sub-skus="subSkus"
      :validation-errors="validationErrors"
      sku-column-width="220px"
      price-column-width="120px"
      @add="$emit('add')"
      @remove="(index) => $emit('remove', index)"
      @validate="(index) => $emit('validate', index)"
    />

    <template #footer>
      <OButton variant="secondary" @click="$emit('update:open', false)">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
      <OButton variant="primary" :disabled="saving" @click="$emit('save')">
        <span v-if="saving">...</span>
        <span v-else>{{ t('wms.common.save', '保存') }}</span>
      </OButton>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import { useI18n } from '@/composables/useI18n'
import SubSkuInlineEditor from './SubSkuInlineEditor.vue'
import type { Product, SubSku } from '@/types/product'

const { t } = useI18n()

defineProps<{
  open: boolean
  editingProduct: Product | null
  subSkus: SubSku[]
  validationErrors: Record<number, string>
  saving: boolean
}>()

defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'add'): void
  (e: 'remove', index: number): void
  (e: 'validate', index: number): void
  (e: 'save'): void
}>()
</script>

<style scoped>
.sub-sku-header {
  margin-bottom: 16px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.sub-sku-header p {
  margin: 0 0 4px;
  font-size: 14px;
}

.sub-sku-header p:last-child {
  margin-bottom: 0;
}
</style>
