<template>
  <div class="panel right-bottom">
    <div class="panel-title">{{ t('wms.printTemplate.layer') }}</div>
    <div class="layers">
      <div
        v-for="(e, idx) in elements"
        :key="e.id"
        class="layer"
        :class="{ active: e.id === selectedId }"
        @click="$emit('select', e.id)"
      >
        <div class="name">{{ idx + 1 }}. {{ e.name }} <span class="type">({{ e.type }})</span></div>
        <div class="ops">
          <button class="o-btn-text" @click.stop="$emit('toggle-visible', e)">{{ e.visible === false ? t('wms.printTemplate.show') : t('wms.printTemplate.hide') }}</button>
          <button class="o-btn-text" @click.stop="$emit('toggle-locked', e)">{{ e.locked ? t('wms.printTemplate.unlock') : t('wms.printTemplate.lock') }}</button>
          <button class="o-btn-text" @click.stop="$emit('duplicate-layer', idx)">{{ t('wms.printTemplate.duplicate') }}</button>
          <button class="o-btn-text" :disabled="idx === 0" @click.stop="$emit('move-layer', idx, -1)">{{ t('wms.printTemplate.moveUp') }}</button>
          <button class="o-btn-text" :disabled="idx === elements.length - 1" @click.stop="$emit('move-layer', idx, 1)">
            {{ t('wms.printTemplate.moveDown') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { PrintElement } from '@/types/printTemplate'

const { t } = useI18n()

defineProps<{
  elements: PrintElement[]
  selectedId: string
}>()

defineEmits<{
  'select': [id: string]
  'toggle-visible': [e: PrintElement]
  'toggle-locked': [e: PrintElement]
  'duplicate-layer': [idx: number]
  'move-layer': [idx: number, delta: -1 | 1]
}>()
</script>

<style scoped>
.panel {
  border: 1px solid var(--o-border-color);
  border-radius: 8px;
  background: var(--o-view-background);
  padding: 10px;
}
.panel-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.right-bottom {
  max-height: 360px;
  overflow: auto;
}
.layers {
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--o-gray-200);
  border-radius: 6px;
  padding: 6px;
}
.layer {
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
}
.layer.active {
  background: var(--o-info-bg);
}
.layer .name {
  font-size: 12px;
  font-weight: 600;
}
.layer .type {
  color: var(--o-gray-500);
  font-weight: 400;
}
.layer .ops {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.o-btn-text {
  background: none;
  border: none;
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
  color: var(--o-brand-primary, #0052A3);
}
.o-btn-text:hover { text-decoration: underline; }
.o-btn-text:disabled { opacity: 0.4; cursor: not-allowed; text-decoration: none; }
</style>
