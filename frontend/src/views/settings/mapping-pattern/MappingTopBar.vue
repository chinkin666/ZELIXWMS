<template>
  <div class="top-bar">
    <div class="top-left">
      <div class="field">
        <div class="label">{{ t('wms.mapping.layoutType', 'レイアウトタイプ') }}</div>
        <Select :model-value="configType" @update:model-value="$emit('update:configType', $event)" :disabled="isLocked">
          <SelectTrigger class="w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ec-company-to-order">{{ t('wms.mapping.typeEcToOrder', '受注データ取込') }}</SelectItem>
            <SelectItem value="order-to-carrier">{{ t('wms.mapping.typeOrderToCarrier', '送り状データ出力') }}</SelectItem>
            <SelectItem value="order-to-sheet">{{ t('wms.mapping.typeOrderToSheet', '出荷明細リスト出力') }}</SelectItem>
            <SelectItem value="carrier-receipt-to-order">{{ t('wms.mapping.typeCarrierReceiptToOrder', '送り状データ取込') }}</SelectItem>
            <SelectItem value="product">{{ t('wms.mapping.typeProduct', '商品マスタ取込') }}</SelectItem>
            <SelectItem value="order-source-company">{{ t('wms.mapping.typeOrderSourceCompany', '依頼主マスタ取込') }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="field" v-if="configType === 'order-to-carrier' || configType === 'carrier-receipt-to-order'">
        <div class="label">{{ t('wms.mapping.carrier', '配送業者') }}</div>
        <Select :model-value="carrierId" @update:model-value="$emit('update:carrierId', $event)" :disabled="isLocked">
          <SelectTrigger class="w-[260px]">
            <SelectValue :placeholder="t('wms.mapping.selectCarrier', '配送業者を選択')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="c in carrierOptions" :key="c._id" :value="c._id">{{ c.name }}</SelectItem>
          </SelectContent>
        </Select>
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
          <Input
            ref="fileInputRef"
            type="file"
            accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            class="hidden-input"
            @change="onNativeFileSelect"
          />
          <Button variant="default" @click="fileInputRef?.click()">{{ t('wms.mapping.selectFile', 'ファイルを選択') }}</Button>
          <Select :model-value="encoding" @update:model-value="$emit('update:encoding', $event)">
            <SelectTrigger class="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shift_jis">Shift_JIS ({{ t('wms.mapping.default', '既定') }})</SelectItem>
              <SelectItem value="utf-8">UTF-8</SelectItem>
              <SelectItem value="utf-8-sig">UTF-8 (BOM)</SelectItem>
              <SelectItem value="gbk">GBK/GB18030</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="hint">{{ t('wms.mapping.fileUploadHint', 'CSV/Excel をアップロードすると、入力元に列が表示されます') }}</div>
      </div>
    </div>
    <div class="top-right">
      <div class="field">
        <div class="label">{{ t('wms.mapping.sampleData', 'サンプルデータ') }}</div>
        <Button variant="secondary" @click="$emit('load-sample-orders')">{{ t('wms.mapping.loadSampleOrders', '出荷指示サンプル読込') }}</Button>
      </div>
      <div class="field">
        <div class="label">{{ t('wms.mapping.layoutName', 'レイアウト名') }}</div>
        <Input :model-value="configName" style="width: 200px" :placeholder="t('wms.mapping.layoutNamePlaceholder', 'レイアウト名を入力')" @update:model-value="$emit('update:configName', $event)" />
      </div>
      <div class="field">
        <div class="label">{{ t('wms.mapping.description', '説明') }}</div>
        <Input :model-value="configDescription" style="width: 200px" :placeholder="t('wms.mapping.descriptionPlaceholder', '説明（任意）')" @update:model-value="$emit('update:configDescription', $event)" />
      </div>
      <div class="field">
        <Button variant="default" @click="$emit('save')" :disabled="!canSave">
          {{ t('wms.common.save', '保存') }}
        </Button>
        <Button variant="secondary" @click="$emit('load')" style="margin-left: 8px">{{ t('wms.mapping.load', '読み込み') }}</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
}
.top-left,
.top-right {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.field .label {
  font-size: 12px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
  margin-bottom: 4px;
}
.hint {
  color: var(--o-gray-400, #c0c4cc);
  font-size: 11px;
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
.{
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
</style>
