<template>
  <div class="panel center">
    <div class="panel-title">{{ t('wms.printTemplate.canvas') }}</div>
    <div class="canvas-toolbar">
      <div class="toolbar-form">
        <div class="form-group-inline">
          <label>{{ t('wms.printTemplate.width') }}(mm)</label>
          <Input :model-value="canvas.widthMm" type="number" min="1" style="width: 110px" @update:model-value="$emit('update-canvas', 'widthMm', Number($event))" />
        </div>
        <div class="form-group-inline">
          <label>{{ t('wms.printTemplate.height') }}(mm)</label>
          <Input :model-value="canvas.heightMm" type="number" min="1" style="width: 110px" @update:model-value="$emit('update-canvas', 'heightMm', Number($event))" />
        </div>
        <div class="form-group-inline">
          <label>解像度 (px/mm)</label>
          <Input :model-value="canvas.pxPerMm" type="number" min="1" step="0.5" style="width: 110px" @update:model-value="$emit('update-canvas', 'pxPerMm', Number($event))" />
        </div>
      </div>
      <div class="row">
        <Button variant="secondary" @click="$emit('add-text')">+ テキスト</Button>
        <Button variant="secondary" @click="$emit('add-barcode')">+ バーコード</Button>
        <Button variant="secondary" @click="$emit('add-image')">+ 画像</Button>
      </div>
    </div>

    <div class="canvas-toolbar" style="margin-top: 8px">
      <div class="row">
        <input ref="bgFileInput" type="file" accept="image/*" class="hidden-input" @change="onBgFileChange" />
        <Button variant="secondary" @click="triggerBgUpload">{{ t('wms.printTemplate.uploadRefImage') }}</Button>
        <Button variant="secondary" :disabled="!bgImageUrl" @click="$emit('clear-bg-image')">{{ t('wms.printTemplate.clearRefImage') }}</Button>
      </div>
      <div class="row" style="align-items: center">
        <div class="opacity-label">{{ t('wms.printTemplate.opacity') }}</div>
        <input type="range" :value="bgOpacity" min="0" max="1" step="0.05" style="width: 220px" @input="$emit('update:bgOpacity', Number(($event.target as HTMLInputElement).value))" />
        <span style="font-size: 12px; color: #6b7280; margin-left: 4px">{{ bgOpacity.toFixed(2) }}</span>
      </div>
    </div>

    <div class="canvas-wrap">
      <div ref="stageEl" class="stage-host"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

defineProps<{
  canvas: { widthMm: number; heightMm: number; pxPerMm: number }
  bgImageUrl: string
  bgOpacity: number
}>()

const emit = defineEmits<{
  'add-text': []
  'add-barcode': []
  'add-image': []
  'clear-bg-image': []
  'bg-file-change': [file: File]
  'update-canvas': [key: string, value: number]
  'update:bgOpacity': [value: number]
}>()

const bgFileInput = ref<HTMLInputElement | null>(null)
const stageEl = ref<HTMLDivElement | null>(null)

function triggerBgUpload() {
  bgFileInput.value?.click()
}

function onBgFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input?.files?.[0]
  if (!f) return
  emit('bg-file-change', f)
}

defineExpose({ stageEl })
</script>

<style scoped>
.panel {
  border: 1px solid var(--o-border-color, #e4e7ed);
  background: var(--o-view-background, #fff);
  padding: 10px;
}
.panel-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--o-gray-800);
  margin-bottom: 8px;
}
.center .canvas-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.toolbar-form {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.form-group-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.form-group-inline label {
  white-space: nowrap;
  font-size: 12px;
  color: var(--o-gray-700);
}
.canvas-wrap {
  margin-top: 10px;
  border: 1px dashed var(--o-border-color, #e4e7ed);
  background: var(--o-gray-100, #f5f7fa);
  border-radius: 8px;
  padding: 10px;
  overflow: auto;
  height: 560px;
}
.stage-host {
  display: inline-block;
}
.hidden-input {
  display: none;
}
.opacity-label {
  font-size: 12px;
  color: var(--o-gray-700);
  width: 48px;
}
.row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
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
</style>
