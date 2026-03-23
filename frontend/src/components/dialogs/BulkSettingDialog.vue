<!-- 一括設定ダイアログ共通コンポーネント / 批量设置对话框共用组件 -->
<!-- 繰り返しのバルクダイアログパターンを共通化 / 提取重复的批量对话框模式 -->
<template>
  <Dialog :open="open" @update:open="(val: boolean) => { if (!val) emit('close') }">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
      </DialogHeader>
    <div class="bulk-dialog">
      <div class="bulk-dialog__badge">
        対象 <strong>{{ selectedCount }}</strong> 件
      </div>
      <slot />
    </div>
    <DialogFooter>
      <Button variant="secondary" @click="emit('close')">キャンセル</Button>
      <Button variant="default" :disabled="applyDisabled" @click="emit('apply')">
        {{ applyLabel || '適用' }}
      </Button>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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
