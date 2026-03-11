<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'
import OButton from './OButton.vue'

const { t } = useI18n()

interface Props {
  open: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  danger?: boolean
}

withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
  danger: false,
})

const emit = defineEmits<{
  close: []
  confirm: []
}>()


</script>

<template>
  <Teleport to="body">
    <Transition name="o-dialog">
      <div v-if="open" class="o-dialog-backdrop">
        <div class="o-dialog" :class="[`o-dialog--${size}`]">
          <div class="o-dialog-header">
            <h4 class="o-dialog-title">
              <slot name="title">{{ title }}</slot>
            </h4>
            <button class="o-dialog-close" @click="emit('close')">&times;</button>
          </div>
          <div class="o-dialog-body">
            <slot />
          </div>
          <div class="o-dialog-footer">
            <slot name="footer">
              <OButton variant="secondary" @click="emit('close')">{{ t('dialog.cancel') }}</OButton>
              <OButton
                :variant="danger ? 'danger' : 'primary'"
                @click="emit('confirm')"
              >
                <slot name="confirm-text">{{ t('dialog.confirm') }}</slot>
              </OButton>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.o-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}
.o-dialog {
  background: var(--o-view-background, #fff);
  border-radius: var(--o-border-radius, 4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.o-dialog--sm { width: 400px; }
.o-dialog--md { width: 560px; }
.o-dialog--lg { width: 800px; }
.o-dialog--xl { width: 1100px; }

.o-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--o-border-color, #dee2e6);
}
.o-dialog-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
}
.o-dialog-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--o-gray-500, #adb5bd);
  cursor: pointer;
  padding: 0;
}
.o-dialog-close:hover { color: var(--o-gray-900, #212529); }

.o-dialog-body {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
}

.o-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--o-border-color, #dee2e6);
}

.o-btn-danger {
  background: var(--o-danger, #dc3545);
  color: #fff;
  border: 1px solid var(--o-danger, #dc3545);
}
.o-btn-danger:hover { background: #c82333; border-color: #bd2130; }

/* Transition */
.o-dialog-enter-active,
.o-dialog-leave-active {
  transition: opacity 0.15s ease;
}
.o-dialog-enter-active .o-dialog,
.o-dialog-leave-active .o-dialog {
  transition: transform 0.15s ease;
}
.o-dialog-enter-from,
.o-dialog-leave-to {
  opacity: 0;
}
.o-dialog-enter-from .o-dialog {
  transform: scale(0.95) translateY(-10px);
}
.o-dialog-leave-to .o-dialog {
  transform: scale(0.95) translateY(-10px);
}
</style>
