<script setup lang="ts">
import { useToast } from '../../composables/useToast'
const { toasts, remove } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="o-toast-container">
      <TransitionGroup name="o-toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="o-toast"
          :class="`o-toast--${toast.type}`"
          @click="remove(toast.id)"
        >
          <span class="o-toast-icon">
            {{ toast.type === 'success' ? '\u2713' : toast.type === 'danger' ? '\u2715' : toast.type === 'warning' ? '\u26A0' : '\u2139' }}
          </span>
          <span class="o-toast-message">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.o-toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}
.o-toast {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--o-border-radius, 4px);
  background: var(--o-view-background);
  box-shadow: var(--o-shadow-lg);
  font-size: 0.875rem;
  cursor: pointer;
  pointer-events: auto;
  min-width: 250px;
  max-width: 400px;
  border-left: 4px solid;
}
.o-toast--success { border-left-color: var(--o-success, #28a745); }
.o-toast--danger { border-left-color: var(--o-danger, #dc3545); }
.o-toast--warning { border-left-color: var(--o-warning, #ffc107); }
.o-toast--info { border-left-color: var(--o-info, #17a2b8); }
.o-toast-icon { font-weight: 700; }
.o-toast--success .o-toast-icon { color: var(--o-success, #28a745); }
.o-toast--danger .o-toast-icon { color: var(--o-danger, #dc3545); }
.o-toast--warning .o-toast-icon { color: var(--o-warning, #ffc107); }
.o-toast--info .o-toast-icon { color: var(--o-info, #17a2b8); }
.o-toast-message { flex: 1; color: var(--o-gray-900, #212529); }

.o-toast-enter-active { transition: all 0.3s ease; }
.o-toast-leave-active { transition: all 0.2s ease; }
.o-toast-enter-from { opacity: 0; transform: translateX(100%); }
.o-toast-leave-to { opacity: 0; transform: translateX(100%); }
</style>
