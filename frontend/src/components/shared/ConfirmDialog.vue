<script setup lang="ts">
/**
 * グローバル確認ダイアログ（shadcn AlertDialog ベース）
 * 全局确认弹窗（基于 shadcn AlertDialog）
 *
 * App.vue に配置し、useConfirmDialog() から呼び出す
 * 放置于 App.vue 中，通过 useConfirmDialog() 调用
 */
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const { isOpen, title, message, isDanger, confirmText, cancelText, handleConfirm, handleCancel } = useConfirmDialog()
</script>

<template>
  <AlertDialog :open="isOpen" @update:open="handleCancel">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ message }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleCancel">{{ cancelText }}</AlertDialogCancel>
        <AlertDialogAction
          :class="isDanger ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
