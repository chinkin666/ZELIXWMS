<template>
  <div class="sub-sku-inline-section">
    <div>
      <span class="o-divider-text">{{ t('wms.product.subSkuManagement', '子SKU管理') }}</span>
    </div>
    <Table style="width: 100%">
      <TableHeader>
        <TableRow>
          <TableHead :style="{ width: skuColumnWidth }">{{ t('wms.product.subSkuCode', '子SKUコード') }}</TableHead>
          <TableHead :style="{ width: priceColumnWidth }">{{ t('wms.product.price', '価格') }}</TableHead>
          <TableHead>{{ t('wms.product.description', '説明') }}</TableHead>
          <TableHead style="width: 60px; text-align: center">{{ t('wms.product.active', '有効') }}</TableHead>
          <TableHead style="width: 60px; text-align: center"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="(row, $index) in subSkus" :key="$index">
          <TableCell>
            <div>
              <Input v-model="row.subSku" type="text" :class="{ 'is-error': validationErrors[$index] }" :placeholder="t('wms.product.subSkuCode', '子SKUコード')" @blur="$emit('validate', $index)" />
              <div v-if="validationErrors[$index]" class="sku-error-message">
                {{ validationErrors[$index] }}
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Input v-model.number="row.price" type="number" :min="0" :placeholder="t('wms.product.parentPrice', '親価格')" style="width: 100%" />
          </TableCell>
          <TableCell>
            <Input v-model="row.description" type="text" :placeholder="t('wms.product.descriptionExample', '説明（例: セール価格）')" />
          </TableCell>
          <TableCell style="text-align: center">
            <Checkbox :checked="row.isActive" @update:checked="val => row.isActive = val" />
          </TableCell>
          <TableCell style="text-align: center">
            <Button variant="destructive" size="sm" @click="$emit('remove', $index)">{{ t('wms.common.delete', '削除') }}</Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div class="sub-sku-actions">
      <Button variant="default" size="sm" @click="$emit('add')">+ {{ t('wms.product.addSubSku', '子SKUを追加') }}</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'
import type { SubSku } from '@/types/product'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const { t } = useI18n()

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
