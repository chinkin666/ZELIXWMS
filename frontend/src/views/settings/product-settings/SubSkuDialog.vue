<template>
  <Dialog :open="open" @update:open="val => { if (!val) { $emit('update:open', false) } }">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ t('wms.product.subSkuManagement', '子SKU管理') }}</DialogTitle></DialogHeader>
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

    <DialogFooter>
      <Button variant="secondary" @click="$emit('update:open', false)">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
      <Button variant="default" :disabled="saving" @click="$emit('save')">
        <span v-if="saving">...</span>
        <span v-else>{{ t('wms.common.save', '保存') }}</span>
      </Button>
    </DialogFooter>
  </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
