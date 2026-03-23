<template>
  <Dialog :open="visibleProxy" @update:open="visibleProxy = $event">
    <DialogContent class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>入力エラー</DialogTitle>
      </DialogHeader>
    <div class="summary">
      <div class="alert-error">
        取込を実行できません。以下のエラーを修正してください。
      </div>
    </div>

    <div style="max-height:420px; overflow:auto">
      <Table class="o-list-table">
        <TableHeader>
          <TableRow>
            <TableHead style="width:90px">行</TableHead>
            <TableHead style="width:180px">SKU</TableHead>
            <TableHead style="width:160px">フィールド</TableHead>
            <TableHead>メッセージ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(row, idx) in errors" :key="idx">
            <TableCell>{{ (row.rowIndex ?? 0) + 1 }}</TableCell>
            <TableCell>{{ row.sku }}</TableCell>
            <TableCell>{{ row.field }}</TableCell>
            <TableCell>{{ row.message }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <DialogFooter>
      <Button variant="default" @click="visibleProxy = false">閉じる</Button>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export type InputRowError = {
  rowIndex: number
  sku?: string
  field?: string
  message: string
}

const props = defineProps<{
  modelValue: boolean
  errors: InputRowError[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visibleProxy = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
</script>

<style scoped>
.summary { margin-bottom: 12px; }
.alert-error { padding: 12px 16px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; color: #991b1b; font-weight: 500; }
</style>
