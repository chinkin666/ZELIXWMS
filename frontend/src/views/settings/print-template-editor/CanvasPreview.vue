<template>
  <div class="panel center">
    <div class="panel-title">画布（Konva）</div>
    <div class="canvas-toolbar">
      <div class="toolbar-form">
        <div class="form-group-inline">
          <label>宽(mm)</label>
          <input :value="canvas.widthMm" type="number" min="1" class="o-input" style="width: 110px" @input="$emit('update-canvas', 'widthMm', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="form-group-inline">
          <label>高(mm)</label>
          <input :value="canvas.heightMm" type="number" min="1" class="o-input" style="width: 110px" @input="$emit('update-canvas', 'heightMm', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="form-group-inline">
          <label>pxPerMm</label>
          <input :value="canvas.pxPerMm" type="number" min="1" step="0.5" class="o-input" style="width: 110px" @input="$emit('update-canvas', 'pxPerMm', Number(($event.target as HTMLInputElement).value))" />
        </div>
      </div>
      <div class="row">
        <OButton variant="secondary" @click="$emit('add-text')">+ Text</OButton>
        <OButton variant="secondary" @click="$emit('add-barcode')">+ Barcode</OButton>
        <OButton variant="secondary" @click="$emit('add-image')">+ Image</OButton>
      </div>
    </div>

    <div class="canvas-toolbar" style="margin-top: 8px">
      <div class="row">
        <input ref="bgFileInput" type="file" accept="image/*" class="hidden-input" @change="onBgFileChange" />
        <OButton variant="secondary" @click="triggerBgUpload">上传参考图</OButton>
        <OButton variant="secondary" :disabled="!bgImageUrl" @click="$emit('clear-bg-image')">清除参考图</OButton>
      </div>
      <div class="row" style="align-items: center">
        <div class="opacity-label">透明度</div>
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
import OButton from '@/components/odoo/OButton.vue'

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
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 10px;
}
.panel-title {
  font-weight: 600;
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
  color: #374151;
}
.canvas-wrap {
  margin-top: 10px;
  border: 1px dashed #d1d5db;
  background: #f9fafb;
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
  color: #374151;
  width: 48px;
}
.row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
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
