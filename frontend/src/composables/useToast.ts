import { ref } from 'vue'

interface Toast {
  id: number
  message: string
  type: 'success' | 'warning' | 'danger' | 'info'
  duration?: number
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
  function show(message: string, type: Toast['type'] = 'success', duration = 3000) {
    const id = nextId++
    toasts.value = [...toasts.value, { id, message, type, duration }]
    if (duration > 0) {
      setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id)
      }, duration)
    }
  }

  function remove(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function showSuccess(message: string, duration = 3000) {
    show(message, 'success', duration)
  }

  function showError(message: string, duration = 5000) {
    show(message, 'danger', duration)
  }

  function showWarning(message: string, duration = 4000) {
    show(message, 'warning', duration)
  }

  function showInfo(message: string, duration = 3000) {
    show(message, 'info', duration)
  }

  return { toasts, show, remove, showSuccess, showError, showWarning, showInfo }
}
