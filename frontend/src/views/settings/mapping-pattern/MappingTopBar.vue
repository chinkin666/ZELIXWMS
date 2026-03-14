<template>
  <div class="top-bar">
    <div class="top-left">
      <div class="field">
        <div class="label">{{ t('wms.mapping.layoutType', 'レイアウトタイプ') }}</div>
        <select :value="configType" class="o-input" style="width: 260px" @change="$emit('update:configType', ($event.target as HTMLSelectElement).value)" :disabled="isLocked">
          <option value="ec-company-to-order">{{ t('wms.mapping.typeEcToOrder', '受注データ取込') }}</option>
          <option value="order-to-carrier">{{ t('wms.mapping.typeOrderToCarrier', '送り状データ出力') }}</option>
          <option value="order-to-sheet">{{ t('wms.mapping.typeOrderToSheet', '出荷明細リスト出力') }}</option>
          <option value="carrier-receipt-to-order">{{ t('wms.mapping.typeCarrierReceiptToOrder', '送り状データ取込') }}</option>
          <option value="product">{{ t('wms.mapping.typeProduct', '商品マスタ取込') }}</option>
          <option value="order-source-company">{{ t('wms.mapping.typeOrderSourceCompany', '依頼主マスタ取込') }}</option>
        </select>
      </div>
      <div class="field" v-if="configType === 'order-to-carrier' || configType === 'carrier-receipt-to-order'">
        <div class="label">{{ t('wms.mapping.carrier', '配送業者') }}</div>
        <select
          :value="carrierId"
          class="o-input"
          style="width: 260px"
          @change="$emit('update:carrierId', ($event.target as HTMLSelectElement).value)"
          :disabled="isLocked"
        >
          <option value="" disabled>{{ t('wms.mapping.selectCarrier', '配送業者を選択') }}</option>
          <option v-for="c in carrierOptions" :key="c._id" :value="c._id">{{ c.name }}</option>
        </select>
      </div>
      <div
        class="field"
        v-if="
          configType === 'ec-company-to-order' ||
          configType === 'carrier-receipt-to-order' ||
          configType === 'product' ||
          configType === 'order-source-company'
        "
      >
        <div class="label">{{ t('wms.mapping.fileUpload', 'ファイルアップロード') }}</div>
        <div class="upload-row">
          <input
            ref="fileInputRef"
            type="file"
            accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            class="hidden-input"
            @change="onNativeFileSelect"
          />
          <OButton variant="primary" @click="fileInputRef?.click()">{{ t('wms.mapping.selectFile', 'ファイルを選択') }}</OButton>
          <select :value="encoding" class="o-input" style="width: 160px" @change="$emit('update:encoding', ($event.target as HTMLSelectElement).value)">
            <option value="shift_jis">Shift_JIS ({{ t('wms.mapping.default', '既定') }})</option>
            <option value="utf-8">UTF-8</option>
            <option value="utf-8-sig">UTF-8 (BOM)</option>
            <option value="gbk">GBK/GB18030</option>
          </select>
        </div>
        <div class="hint">{{ t('wms.mapping.fileUploadHint', 'CSV/Excel をアップロードすると、入力元に列が表示されます') }}</div>
      </div>
    </div>
    <div class="top-right">
      <div class="field">
        <div class="label">{{ t('wms.mapping.sampleData', 'サンプルデータ') }}</div>
        <OButton variant="secondary" @click="$emit('load-sample-orders')">{{ t('wms.mapping.loadSampleOrders', '注文サンプルを読み込む') }}</OButton>
      </div>
      <div class="field">
        <div class="label">{{ t('wms.mapping.layoutName', 'レイアウト名') }}</div>
        <input :value="configName" class="o-input" style="width: 200px" :placeholder="t('wms.mapping.layoutNamePlaceholder', 'レイアウト名を入力')" @input="$emit('update:configName', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="field">
        <div class="label">{{ t('wms.mapping.description', '説明') }}</div>
        <input :value="configDescription" class="o-input" style="width: 200px" :placeholder="t('wms.mapping.descriptionPlaceholder', '説明（任意）')" @input="$emit('update:configDescription', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="field">
        <OButton variant="primary" @click="$emit('save')" :disabled="!canSave">
          {{ t('wms.common.save', '保存') }}
        </OButton>
        <OButton variant="secondary" @click="$emit('load')" style="margin-left: 8px">{{ t('wms.mapping.load', '読み込み') }}</OButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

defineProps<{
  configType: string
  carrierId: string | null
  carrierOptions: any[]
  configName: string
  configDescription: string
  encoding: string
  isLocked: boolean
  canSave: boolean
}>()

const emit = defineEmits<{
  'update:configType': [value: string]
  'update:carrierId': [value: string]
  'update:encoding': [value: string]
  'update:configName': [value: string]
  'update:configDescription': [value: string]
  'load-sample-orders': []
  'save': []
  'load': []
  'file-select': [file: File]
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)

function onNativeFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  emit('file-select', file)
  // Reset input so same file can be selected again
  if (input) input.value = ''
}
</script>

<style scoped>
.top-bar {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 8px 0 4px;
}
.top-left,
.top-right {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.field .label {
  font-weight: 600;
  margin-bottom: 4px;
}
.hint {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}
.upload-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.hidden-input {
  display: none;
}
.o-input {
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.o-input:focus { border-color: var(--o-primary, #714B67); }
</style>
