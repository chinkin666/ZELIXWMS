<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

interface BatchAction {
  readonly id: string
  readonly label: string
  readonly icon?: string
  readonly variant?: 'primary' | 'danger' | 'secondary' | 'warning'
}

interface Props {
  selectedCount: number
  actions: readonly BatchAction[]
}

const props = withDefaults(defineProps<Props>(), {
  actions: () => [],
})

const emit = defineEmits<{
  'action-click': [actionId: string]
  'select-all': []
  'deselect-all': []
}>()

const confirmingAction = ref<BatchAction | null>(null)

const isVisible = computed(() => props.selectedCount > 0)

const DESTRUCTIVE_VARIANTS = new Set(['danger'])

function isDestructive(action: BatchAction): boolean {
  return DESTRUCTIVE_VARIANTS.has(action.variant ?? '')
}

function onActionClick(action: BatchAction): void {
  if (isDestructive(action)) {
    confirmingAction.value = action
  } else {
    emit('action-click', action.id)
  }
}

function onConfirm(): void {
  if (confirmingAction.value) {
    emit('action-click', confirmingAction.value.id)
    confirmingAction.value = null
  }
}

function onCancelConfirm(): void {
  confirmingAction.value = null
}

function variantClass(variant: string | undefined): string {
  switch (variant) {
    case 'danger': return 'o-batch-btn--danger'
    case 'warning': return 'o-batch-btn--warning'
    case 'secondary': return 'o-batch-btn--secondary'
    default: return 'o-batch-btn--primary'
  }
}

function getIconSvg(icon: string | undefined): string {
  switch (icon) {
    case 'delete':
      return '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>'
    case 'archive':
      return '<path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5z"/>'
    case 'export':
      return '<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>'
    case 'tag':
      return '<path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>'
    default:
      return '<circle cx="12" cy="12" r="3"/>'
  }
}
</script>

<template>
  <Transition name="o-batch-slide">
    <div v-if="isVisible" class="o-batch-bar">
      <div class="o-batch-bar-inner">
        <div class="o-batch-info">
          <span class="o-batch-count">
            {{ t('batch.selectedCount', { count: String(selectedCount) }) }}
          </span>
          <button class="o-batch-link" @click="emit('select-all')">
            {{ t('batch.selectAll') }}
          </button>
          <button class="o-batch-link" @click="emit('deselect-all')">
            {{ t('batch.deselectAll') }}
          </button>
        </div>

        <div class="o-batch-actions">
          <button
            v-for="action in actions"
            :key="action.id"
            class="o-batch-btn"
            :class="variantClass(action.variant)"
            @click="onActionClick(action)"
          >
            <svg
              v-if="action.icon"
              class="o-batch-btn-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              v-html="getIconSvg(action.icon)"
            />
            {{ action.label }}
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Confirmation dialog for destructive actions -->
  <Teleport to="body">
    <Transition name="o-batch-fade">
      <div
        v-if="confirmingAction"
        class="o-batch-confirm-backdrop"
        @click.self="onCancelConfirm"
      >
        <div class="o-batch-confirm-dialog">
          <div class="o-batch-confirm-header">
            <h4 class="o-batch-confirm-title">
              {{ t('batch.confirmTitle') }}
            </h4>
          </div>
          <div class="o-batch-confirm-body">
            <p>
              {{ t('batch.confirmMessage', {
                action: confirmingAction.label,
                count: String(selectedCount),
              }) }}
            </p>
          </div>
          <div class="o-batch-confirm-footer">
            <button class="o-btn o-btn-secondary" @click="onCancelConfirm">
              {{ t('dialog.cancel') }}
            </button>
            <button class="o-btn o-btn-danger" @click="onConfirm">
              {{ confirmingAction.label }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.o-batch-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1040;
  background: var(--o-brand-primary, #714B67);
  color: #fff;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.15);
}

.o-batch-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  gap: 1rem;
}

.o-batch-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.o-batch-count {
  font-weight: 600;
  font-size: 0.9375rem;
}

.o-batch-link {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 0.8125rem;
  text-decoration: underline;
  padding: 0;
}

.o-batch-link:hover {
  color: #fff;
}

.o-batch-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.o-batch-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4375rem 0.875rem;
  border-radius: var(--o-border-radius, 4px);
  border: 1px solid transparent;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.o-batch-btn-icon {
  flex-shrink: 0;
}

.o-batch-btn--primary {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}
.o-batch-btn--primary:hover {
  background: rgba(255, 255, 255, 0.25);
}

.o-batch-btn--secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
  border-color: rgba(255, 255, 255, 0.2);
}
.o-batch-btn--secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.o-batch-btn--danger {
  background: var(--o-danger, #dc3545);
  color: #fff;
  border-color: var(--o-danger, #dc3545);
}
.o-batch-btn--danger:hover {
  background: #c82333;
}

.o-batch-btn--warning {
  background: var(--o-warning, #ffc107);
  color: #212529;
  border-color: var(--o-warning, #ffc107);
}
.o-batch-btn--warning:hover {
  background: #e0a800;
}

/* Slide transition */
.o-batch-slide-enter-active,
.o-batch-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.o-batch-slide-enter-from,
.o-batch-slide-leave-to {
  transform: translateY(100%);
}

/* Confirm dialog */
.o-batch-confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1055;
}

.o-batch-confirm-dialog {
  background: var(--o-view-background, #fff);
  border-radius: var(--o-border-radius, 4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 420px;
  max-width: 90vw;
  color: var(--o-gray-900, #212529);
}

.o-batch-confirm-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--o-border-color, #dee2e6);
}

.o-batch-confirm-title {
  font-size: 1.0625rem;
  font-weight: 600;
  margin: 0;
}

.o-batch-confirm-body {
  padding: 1.25rem;
}

.o-batch-confirm-body p {
  margin: 0;
  line-height: 1.5;
}

.o-batch-confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--o-border-color, #dee2e6);
}

.o-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4375rem 1rem;
  border-radius: var(--o-border-radius, 4px);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}

.o-btn-secondary {
  background: var(--o-gray-100, #f8f9fa);
  color: var(--o-gray-700, #495057);
  border-color: var(--o-border-color, #dee2e6);
}
.o-btn-secondary:hover {
  background: var(--o-gray-200, #e9ecef);
}

.o-btn-danger {
  background: var(--o-danger, #dc3545);
  color: #fff;
  border-color: var(--o-danger, #dc3545);
}
.o-btn-danger:hover {
  background: #c82333;
  border-color: #bd2130;
}

/* Fade transition */
.o-batch-fade-enter-active,
.o-batch-fade-leave-active {
  transition: opacity 0.15s ease;
}
.o-batch-fade-enter-from,
.o-batch-fade-leave-to {
  opacity: 0;
}
</style>
