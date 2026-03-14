import { onMounted, onBeforeUnmount } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'

export function useOrderKeyboard(
  tableSelectedKeys: Ref<(string | number)[]>,
  sortedRows: ComputedRef<UserOrderRow[]>,
  handlers: {
    selectAll: () => void
    deselectAll: () => void
    deleteSelected: () => void
    submitSelected: () => void
    exportCsv: () => void
  },
) {
  const handleKeydown = (e: KeyboardEvent) => {
    // Ignore if user is typing in an input/textarea/select
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    // Ignore if a dialog is open
    if (document.querySelector('.o-dialog-overlay')) return

    const isCtrlOrMeta = e.ctrlKey || e.metaKey

    // Ctrl/Cmd + A: Select all
    if (isCtrlOrMeta && e.key === 'a') {
      e.preventDefault()
      handlers.selectAll()
      return
    }

    // Escape: Deselect all
    if (e.key === 'Escape') {
      if (tableSelectedKeys.value.length > 0) {
        e.preventDefault()
        handlers.deselectAll()
      }
      return
    }

    // Delete / Backspace: Delete selected
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (tableSelectedKeys.value.length > 0) {
        e.preventDefault()
        handlers.deleteSelected()
      }
      return
    }

    // Ctrl/Cmd + Enter: Submit
    if (isCtrlOrMeta && e.key === 'Enter') {
      e.preventDefault()
      handlers.submitSelected()
      return
    }

    // Ctrl/Cmd + E: Export CSV
    if (isCtrlOrMeta && e.key === 'e') {
      e.preventDefault()
      handlers.exportCsv()
      return
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}
