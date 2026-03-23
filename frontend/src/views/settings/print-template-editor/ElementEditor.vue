<template>
  <div class="panel right-top">
    <div class="panel-title">{{ t('wms.printTemplate.properties') }}</div>
    <div v-if="!selectedEl" class="placeholder">{{ t('wms.printTemplate.selectElement') }}</div>
    <div v-else class="props">
      <div class="o-form-group">
        <label>要素名</label>
        <Input :model-value="selectedEl.name" @update:model-value="updateProp('name', $event)" />
      </div>
      <div class="o-form-group">
        <label>X座標 (mm)</label>
        <Input :model-value="selectedEl.xMm" type="number" step="1" @update:model-value="updateProp('xMm', Number($event))" />
      </div>
      <div class="o-form-group">
        <label>Y座標 (mm)</label>
        <Input :model-value="selectedEl.yMm" type="number" step="1" @update:model-value="updateProp('yMm', Number($event))" />
      </div>
      <div class="o-form-group">
        <label>表示</label>
        <label class="o-toggle">
          <input type="checkbox" :checked="selectedEl.visible" @change="updateProp('visible', ($event.target as HTMLInputElement).checked)" />
          <span class="o-toggle-slider"></span>
        </label>
      </div>
      <div class="o-form-group">
        <label>ロック</label>
        <label class="o-toggle">
          <input type="checkbox" :checked="selectedEl.locked" @change="updateProp('locked', ($event.target as HTMLInputElement).checked)" />
          <span class="o-toggle-slider"></span>
        </label>
      </div>

      <template v-if="selectedEl.type === 'text'">
        <div class="o-form-group">
          <label>フォント</label>
          <Input :model-value="(selectedEl as any).fontFamily" placeholder="例: sans-serif / NotoSansJP" @update:model-value="updateProp('fontFamily', $event)" />
        </div>
        <div class="o-form-group">
          <label>文字サイズ (pt)</label>
          <Input :model-value="(selectedEl as any).fontSizePt" type="number" step="1" @update:model-value="updateProp('fontSizePt', Number($event))" />
        </div>
        <div class="o-form-group">
          <label>字間 (px)</label>
          <Input :model-value="(selectedEl as any).letterSpacingPx" type="number" step="0.5" @update:model-value="updateProp('letterSpacingPx', Number($event))" />
        </div>
        <div class="o-form-group">
          <label>揃え</label>
          <Select :model-value="(selectedEl as any).align" @update:model-value="updateProp('align', $event)">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">左揃え</SelectItem>
              <SelectItem value="right">右揃え</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="o-form-group">
          <label>{{ t('wms.printTemplate.contentTransform') }}</label>
          <Button variant="default" @click="$emit('open-transform-mapping', 'text')">
            {{ (selectedEl as any).transformMapping ? t('wms.printTemplate.editTransform') : t('wms.printTemplate.configTransform') }}
          </Button>
        </div>
        <div class="o-form-group">
          <label>{{ t('wms.printTemplate.preview') }}</label>
          <textarea :value="textPreviewValue" readonly rows="2" style="width: 100%; resize: vertical"></textarea>
        </div>
      </template>

      <template v-else-if="selectedEl.type === 'barcode'">
        <div class="o-form-group">
          <label>format</label>
          <Select :model-value="(selectedEl as any).format" @update:model-value="updateProp('format', $event)">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code128">Code 128</SelectItem>
              <SelectItem value="qrcode">QR Code</SelectItem>
              <SelectItem value="codabar">Codabar (NW-7)</SelectItem>
              <SelectItem value="ean13">EAN-13</SelectItem>
              <SelectItem value="ean8">EAN-8</SelectItem>
              <SelectItem value="code39">Code 39</SelectItem>
              <SelectItem value="code93">Code 93</SelectItem>
              <SelectItem value="interleaved2of5">Interleaved 2 of 5 (ITF)</SelectItem>
              <SelectItem value="datamatrix">Data Matrix</SelectItem>
              <SelectItem value="pdf417">PDF417</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="o-form-group">
          <label>width(mm)</label>
          <Input :model-value="(selectedEl as any).widthMm" type="number" step="1" @update:model-value="updateProp('widthMm', Number($event))" />
        </div>
        <div class="o-form-group">
          <label>height(mm)</label>
          <Input :model-value="(selectedEl as any).heightMm" type="number" step="1" @update:model-value="updateProp('heightMm', Number($event))" />
        </div>
        <div class="o-form-group">
          <label>{{ t('wms.printTemplate.contentTransform') }}</label>
          <Button variant="default" @click="$emit('open-transform-mapping', 'barcode')">
            {{ (selectedEl as any).transformMapping ? t('wms.printTemplate.editTransform') : t('wms.printTemplate.configTransform') }}
          </Button>
        </div>
        <div class="o-form-group">
          <label>{{ t('wms.printTemplate.preview') }}</label>
          <textarea :value="barcodePreviewValue" readonly rows="2" style="width: 100%; resize: vertical"></textarea>
        </div>
        <template v-if="(selectedEl as any).format === 'codabar'">
          <div class="o-form-group">
            <label>{{ t('wms.printTemplate.startChar') }}</label>
            <Select :model-value="codabarStartChar" @update:model-value="$emit('update:codabarStartChar', $event)">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="o-form-group">
            <label>{{ t('wms.printTemplate.stopChar') }}</label>
            <Select :model-value="codabarStopChar" @update:model-value="$emit('update:codabarStopChar', $event)">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </template>
        <div class="o-form-group">
          <label>options(JSON)</label>
          <textarea :value="barcodeOptionsJson" rows="4" style="width: 100%; resize: vertical" @input="$emit('update:barcodeOptionsJson', ($event.target as HTMLTextAreaElement).value)"></textarea>
        </div>
      </template>

      <template v-else-if="selectedEl.type === 'image'">
        <div class="o-form-group">
          <label>{{ t('wms.printTemplate.image') }}</label>
          <div style="display: flex; gap: 8px">
            <input ref="imageFileInput" type="file" accept="image/*" class="hidden-input" @change="onImageFileChange" />
            <Button variant="secondary" @click="triggerImageUpload">{{ t('wms.printTemplate.uploadImage') }}</Button>
            <Button variant="secondary" :disabled="!((selectedEl as any).imageData)" @click="$emit('clear-image')">{{ t('wms.printTemplate.clearImage') }}</Button>
          </div>
        </div>
        <div class="o-form-group" v-if="(selectedEl as any).imageData">
          <label>{{ t('wms.printTemplate.preview') }}</label>
          <img :src="(selectedEl as any).imageData" style="max-width: 200px; max-height: 200px; border: 1px solid #ddd;" />
        </div>
        <div class="o-form-group">
          <label>width(mm)</label>
          <Input :model-value="(selectedEl as any).widthMm" type="number" step="1" @update:model-value="updateProp('widthMm', Number($event))" />
        </div>
        <div class="o-form-group">
          <label>height(mm)</label>
          <Input :model-value="(selectedEl as any).heightMm" type="number" step="1" @update:model-value="updateProp('heightMm', Number($event))" />
        </div>
      </template>

      <div class="row">
        <Button variant="destructive" @click="$emit('remove-selected')">{{ t('wms.common.delete') }}</Button>
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
import type { PrintElement } from '@/types/printTemplate'

const { t } = useI18n()

defineProps<{
  selectedEl: PrintElement | null
  textPreviewValue: string
  barcodePreviewValue: string
  barcodeOptionsJson: string
  codabarStartChar: string
  codabarStopChar: string
}>()

const emit = defineEmits<{
  'update-prop': [key: string, value: any]
  'open-transform-mapping': [type: 'text' | 'barcode']
  'remove-selected': []
  'clear-image': []
  'image-file-change': [event: Event]
  'update:codabarStartChar': [value: string]
  'update:codabarStopChar': [value: string]
  'update:barcodeOptionsJson': [value: string]
}>()

const imageFileInput = ref<HTMLInputElement | null>(null)

function updateProp(key: string, value: any) {
  emit('update-prop', key, value)
}

function triggerImageUpload() {
  imageFileInput.value?.click()
}

function onImageFileChange(e: Event) {
  emit('image-file-change', e)
}
</script>

<style scoped>
.panel {
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  background: #fff;
  padding: 10px;
}
.panel-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.placeholder {
  color: #6b7280;
  font-size: 12px;
}
.right-top {
  max-height: 520px;
  overflow: auto;
}
.row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.hidden-input {
  display: none;
}
.o-form-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
}
.o-form-group > label {
  width: 120px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--o-gray-700);
  padding-top: 6px;
}
.o-form-group > input,
.o-form-group > select,
.o-form-group > textarea {
  flex: 1;
  min-width: 0;
}
.{
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.o-input:focus { border-color: var(--o-brand-primary, #0052A3); }
.o-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.o-toggle input { display: none; }
.o-toggle-slider {
  width: 36px;
  height: 20px;
  background: #ccc;
  border-radius: 10px;
  position: relative;
  transition: background 0.2s;
}
.o-toggle-slider::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}
.o-toggle input:checked + .o-toggle-slider {
  background: var(--o-brand-primary, #0052A3);
}
.o-toggle input:checked + .o-toggle-slider::after {
  transform: translateX(16px);
}
</style>
