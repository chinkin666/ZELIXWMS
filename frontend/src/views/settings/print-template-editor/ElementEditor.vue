<template>
  <div class="panel right-top">
    <div class="panel-title">属性</div>
    <div v-if="!selectedEl" class="placeholder">请选择一个元素</div>
    <div v-else class="props">
      <div class="o-form-group">
        <label>name</label>
        <input :value="selectedEl.name" class="o-input" @input="updateProp('name', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="o-form-group">
        <label>x(mm)</label>
        <input :value="selectedEl.xMm" type="number" step="1" class="o-input" @input="updateProp('xMm', Number(($event.target as HTMLInputElement).value))" />
      </div>
      <div class="o-form-group">
        <label>y(mm)</label>
        <input :value="selectedEl.yMm" type="number" step="1" class="o-input" @input="updateProp('yMm', Number(($event.target as HTMLInputElement).value))" />
      </div>
      <div class="o-form-group">
        <label>visible</label>
        <label class="o-toggle">
          <input type="checkbox" :checked="selectedEl.visible" @change="updateProp('visible', ($event.target as HTMLInputElement).checked)" />
          <span class="o-toggle-slider"></span>
        </label>
      </div>
      <div class="o-form-group">
        <label>locked</label>
        <label class="o-toggle">
          <input type="checkbox" :checked="selectedEl.locked" @change="updateProp('locked', ($event.target as HTMLInputElement).checked)" />
          <span class="o-toggle-slider"></span>
        </label>
      </div>

      <template v-if="selectedEl.type === 'text'">
        <div class="o-form-group">
          <label>fontFamily</label>
          <input :value="(selectedEl as any).fontFamily" class="o-input" placeholder="例: sans-serif / NotoSansJP" @input="updateProp('fontFamily', ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="o-form-group">
          <label>fontSize(pt)</label>
          <input :value="(selectedEl as any).fontSizePt" type="number" step="1" class="o-input" @input="updateProp('fontSizePt', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="o-form-group">
          <label>letterSpacing(px)</label>
          <input :value="(selectedEl as any).letterSpacingPx" type="number" step="0.5" class="o-input" @input="updateProp('letterSpacingPx', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="o-form-group">
          <label>align</label>
          <select :value="(selectedEl as any).align" class="o-input" style="width: 100%" @change="updateProp('align', ($event.target as HTMLSelectElement).value)">
            <option value="left">left</option>
            <option value="right">right</option>
          </select>
        </div>
        <div class="o-form-group">
          <label>内容转换</label>
          <OButton variant="primary" @click="$emit('open-transform-mapping', 'text')">
            {{ (selectedEl as any).transformMapping ? '编辑转换' : '配置转换' }}
          </OButton>
        </div>
        <div class="o-form-group">
          <label>预览</label>
          <textarea :value="textPreviewValue" readonly rows="2" class="o-input" style="width: 100%; resize: vertical"></textarea>
        </div>
      </template>

      <template v-else-if="selectedEl.type === 'barcode'">
        <div class="o-form-group">
          <label>format</label>
          <select :value="(selectedEl as any).format" class="o-input" style="width: 100%" @change="updateProp('format', ($event.target as HTMLSelectElement).value)">
            <option value="code128">Code 128</option>
            <option value="qrcode">QR Code</option>
            <option value="codabar">Codabar (NW-7)</option>
            <option value="ean13">EAN-13</option>
            <option value="ean8">EAN-8</option>
            <option value="code39">Code 39</option>
            <option value="code93">Code 93</option>
            <option value="interleaved2of5">Interleaved 2 of 5 (ITF)</option>
            <option value="datamatrix">Data Matrix</option>
            <option value="pdf417">PDF417</option>
          </select>
        </div>
        <div class="o-form-group">
          <label>width(mm)</label>
          <input :value="(selectedEl as any).widthMm" type="number" step="1" class="o-input" @input="updateProp('widthMm', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="o-form-group">
          <label>height(mm)</label>
          <input :value="(selectedEl as any).heightMm" type="number" step="1" class="o-input" @input="updateProp('heightMm', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="o-form-group">
          <label>内容转换</label>
          <OButton variant="primary" @click="$emit('open-transform-mapping', 'barcode')">
            {{ (selectedEl as any).transformMapping ? '编辑转换' : '配置转換' }}
          </OButton>
        </div>
        <div class="o-form-group">
          <label>预览</label>
          <textarea :value="barcodePreviewValue" readonly rows="2" class="o-input" style="width: 100%; resize: vertical"></textarea>
        </div>
        <template v-if="(selectedEl as any).format === 'codabar'">
          <div class="o-form-group">
            <label>起始字符</label>
            <select :value="codabarStartChar" class="o-input" style="width: 100%" @change="$emit('update:codabarStartChar', ($event.target as HTMLSelectElement).value)">
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
          <div class="o-form-group">
            <label>终止字符</label>
            <select :value="codabarStopChar" class="o-input" style="width: 100%" @change="$emit('update:codabarStopChar', ($event.target as HTMLSelectElement).value)">
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
        </template>
        <div class="o-form-group">
          <label>options(JSON)</label>
          <textarea :value="barcodeOptionsJson" rows="4" class="o-input" style="width: 100%; resize: vertical" @input="$emit('update:barcodeOptionsJson', ($event.target as HTMLTextAreaElement).value)"></textarea>
        </div>
      </template>

      <template v-else-if="selectedEl.type === 'image'">
        <div class="o-form-group">
          <label>图片</label>
          <div style="display: flex; gap: 8px">
            <input ref="imageFileInput" type="file" accept="image/*" class="hidden-input" @change="onImageFileChange" />
            <OButton variant="secondary" @click="triggerImageUpload">上传图片</OButton>
            <OButton variant="secondary" :disabled="!((selectedEl as any).imageData)" @click="$emit('clear-image')">清除图片</OButton>
          </div>
        </div>
        <div class="o-form-group" v-if="(selectedEl as any).imageData">
          <label>预览</label>
          <img :src="(selectedEl as any).imageData" style="max-width: 200px; max-height: 200px; border: 1px solid #ddd;" />
        </div>
        <div class="o-form-group">
          <label>width(mm)</label>
          <input :value="(selectedEl as any).widthMm" type="number" step="1" class="o-input" @input="updateProp('widthMm', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="o-form-group">
          <label>height(mm)</label>
          <input :value="(selectedEl as any).heightMm" type="number" step="1" class="o-input" @input="updateProp('heightMm', Number(($event.target as HTMLInputElement).value))" />
        </div>
      </template>

      <div class="row">
        <OButton variant="danger" @click="$emit('remove-selected')">删除</OButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import type { PrintElement } from '@/types/printTemplate'

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
  border: 1px solid #e5e7eb;
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
  color: #374151;
  padding-top: 6px;
}
.o-form-group > input,
.o-form-group > select,
.o-form-group > textarea {
  flex: 1;
  min-width: 0;
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
  background: var(--o-primary, #714B67);
}
.o-toggle input:checked + .o-toggle-slider::after {
  transform: translateX(16px);
}
</style>
