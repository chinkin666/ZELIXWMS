<!-- 一括設定ダイアログ共通コンポーネント / 批量设置对话框共用组件 -->
<!-- 繰り返しのバルクダイアログパターンを共通化 / 提取重复的批量对话框模式 -->
<template>
  <ODialog :open="open" :size="size" @close="emit('close')">
    <template #title>{{ title }}</template>
    <div class="bulk-dialog">
      <div class="bulk-dialog__badge">
        対象 <strong>{{ selectedCount }}</strong> 件
      </div>
      <slot />
    </div>
    <template #footer>
      <OButton variant="secondary" @click="emit('close')">キャンセル</OButton>
      <OButton variant="primary" :disabled="applyDisabled" @click="emit('apply')">
        {{ applyLabel || '適用' }}
      </OButton>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'

interface Props {
  open: boolean
  title: string
  selectedCount: number
  applyLabel?: string
  applyDisabled?: boolean
  size?: string
}

withDefaults(defineProps<Props>(), {
  applyLabel: '適用',
  applyDisabled: false,
  size: 'sm',
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'apply'): void
}>()
</script>

<style scoped>
.bulk-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.bulk-dialog__badge {
  font-size: 13px;
  color: var(--o-gray-600, #606266);
}
.bulk-dialog__badge strong {
  color: var(--o-brand-primary, #0052A3);
  font-weight: 700;
}
</style>
