import { ref, onMounted, onUnmounted, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

const LEAVE_MESSAGE = 'You have unsaved changes. Leave anyway?'

export function useUnsavedChanges() {
  const isDirty = ref(false)
  const initialState = ref<string | null>(null)

  function markDirty(): void {
    isDirty.value = true
  }

  function markClean(): void {
    isDirty.value = false
  }

  function setInitialState<T>(state: T): void {
    initialState.value = JSON.stringify(state)
  }

  function hasChanges<T>(currentState: T): boolean {
    if (initialState.value === null) return false
    return JSON.stringify(currentState) !== initialState.value
  }

  function confirmLeave(): boolean {
    if (!isDirty.value) return true
    return window.confirm(LEAVE_MESSAGE)
  }

  function handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!isDirty.value) return
    event.preventDefault()
    event.returnValue = LEAVE_MESSAGE
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  // Vue Router guard integration
  try {
    onBeforeRouteLeave((_to, _from, next) => {
      if (confirmLeave()) {
        next()
      } else {
        next(false)
      }
    })
  } catch {
    // onBeforeRouteLeave may fail if not inside a router-enabled component
  }

  return {
    isDirty,
    markDirty,
    markClean,
    setInitialState,
    hasChanges,
    confirmLeave,
  }
}
