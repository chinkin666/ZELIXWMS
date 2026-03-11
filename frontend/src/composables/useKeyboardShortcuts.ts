import { onMounted, onBeforeUnmount } from 'vue'

export interface Shortcut {
  key: string
  alt?: boolean
  ctrl?: boolean
  shift?: boolean
  description: string
  handler: () => void
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  function onKeyDown(e: KeyboardEvent) {
    for (const s of shortcuts) {
      const altMatch = s.alt ? e.altKey : !e.altKey
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey

      if (e.key.toLowerCase() === s.key.toLowerCase() && altMatch && ctrlMatch && shiftMatch) {
        const target = e.target as HTMLElement
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && !s.alt && !s.ctrl) {
          return
        }
        e.preventDefault()
        s.handler()
        return
      }
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', onKeyDown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeyDown)
  })

  return { shortcuts }
}
