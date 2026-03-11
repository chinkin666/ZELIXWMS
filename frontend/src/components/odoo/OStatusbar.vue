<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

// ---------- Types ----------

interface Stage {
  readonly value: string
  readonly label: string
  readonly fold?: boolean
  readonly type?: 'cancel'
}

interface Props {
  stages: readonly (string | Stage)[]
  modelValue?: string
  currentStage?: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  currentStage: undefined,
  readonly: false,
})

const emit = defineEmits<{
  'update:modelValue': [newStage: string]
}>()

// ---------- Responsive collapse ----------

const isMobile = ref(false)
const dropdownOpen = ref(false)
const confirmTarget = ref<string | null>(null)

function checkMobile() {
  isMobile.value = window.matchMedia('(max-width: 640px)').matches
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})

// ---------- Stage normalization ----------

function normalizeStage(s: string | Stage): Stage {
  if (typeof s === 'string') return { value: s, label: s }
  return s
}

const normalizedStages = computed(() => props.stages.map(normalizeStage))

const effectiveValue = computed(() => props.currentStage ?? props.modelValue ?? '')

// ---------- Stage status ----------

const currentIndex = computed(() =>
  normalizedStages.value.findIndex((s) => s.value === effectiveValue.value),
)

function stageStatus(stage: Stage): 'done' | 'current' | 'future' {
  const stageIdx = normalizedStages.value.indexOf(stage)
  if (stageIdx < currentIndex.value) return 'done'
  if (stageIdx === currentIndex.value) return 'current'
  return 'future'
}

const currentLabel = computed(() => {
  const found = normalizedStages.value.find((s) => s.value === effectiveValue.value)
  return found?.label ?? effectiveValue.value
})

// ---------- Visible stages (non-folded or current) ----------

const visibleStages = computed(() =>
  normalizedStages.value.filter((s) => !s.fold || s.value === effectiveValue.value),
)

// ---------- Click handling ----------

function onStageClick(stage: Stage) {
  if (props.readonly) return
  if (stage.value === effectiveValue.value) return

  const targetIdx = normalizedStages.value.indexOf(stage)
  const isBackward = targetIdx < currentIndex.value

  if (isBackward) {
    confirmTarget.value = stage.value
  } else {
    emit('update:modelValue', stage.value)
  }
}

function confirmBackward() {
  if (confirmTarget.value !== null) {
    emit('update:modelValue', confirmTarget.value)
    confirmTarget.value = null
  }
}

function cancelBackward() {
  confirmTarget.value = null
}

// ---------- Dropdown ----------

function selectFromDropdown(stage: Stage) {
  dropdownOpen.value = false
  onStageClick(stage)
}
</script>

<template>
  <div class="o-statusbar">
    <div class="o-statusbar-buttons">
      <slot name="buttons" />
    </div>

    <!-- Desktop: pipeline bar -->
    <div v-if="!isMobile" class="o-statusbar-stages">
      <button
        v-for="stage in visibleStages"
        :key="stage.value"
        class="o-stage"
        :class="[
          stageStatus(stage),
          { 'o-stage--cancel': stage.type === 'cancel' },
          { 'o-stage--readonly': readonly },
        ]"
        :disabled="readonly"
        @click="onStageClick(stage)"
      >
        <span v-if="stageStatus(stage) === 'done'" class="o-stage-check">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
          </svg>
        </span>
        {{ stage.label }}
      </button>
    </div>

    <!-- Mobile: dropdown -->
    <div v-else class="o-statusbar-dropdown">
      <button class="o-statusbar-dropdown-toggle" @click="dropdownOpen = !dropdownOpen">
        {{ currentLabel }}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div v-if="dropdownOpen" class="o-statusbar-dropdown-menu">
        <button
          v-for="stage in normalizedStages"
          :key="stage.value"
          class="o-statusbar-dropdown-item"
          :class="[
            stageStatus(stage),
            { 'o-stage--cancel': stage.type === 'cancel' },
          ]"
          :disabled="readonly"
          @click="selectFromDropdown(stage)"
        >
          <span v-if="stageStatus(stage) === 'done'" class="o-stage-check">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
            </svg>
          </span>
          <span v-if="stageStatus(stage) === 'current'" class="o-stage-dot" />
          {{ stage.label }}
        </button>
      </div>
    </div>

    <!-- Backward confirm dialog -->
    <Teleport to="body">
      <Transition name="o-dialog">
        <div v-if="confirmTarget !== null" class="o-confirm-backdrop" @click.self="cancelBackward">
          <div class="o-confirm-dialog">
            <p class="o-confirm-message">
              {{ t('statusbar.confirmBackward') || 'Move back to a previous stage?' }}
            </p>
            <div class="o-confirm-actions">
              <button class="o-btn o-btn-secondary" @click="cancelBackward">
                {{ t('dialog.cancel') || 'Cancel' }}
              </button>
              <button class="o-btn o-btn-primary" @click="confirmBackward">
                {{ t('dialog.confirm') || 'Confirm' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.o-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--o-border-color, #dee2e6);
  margin-bottom: 1.25rem;
}

.o-statusbar-buttons {
  display: flex;
  gap: 0.375rem;
}

.o-statusbar-stages {
  display: flex;
  gap: 0;
}

.o-stage {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.875rem;
  font-size: var(--o-font-size-small, 0.8125rem);
  font-weight: 500;
  border: 1px solid var(--o-border-color, #dee2e6);
  background: var(--o-view-background, #fff);
  color: var(--o-gray-600, #6c757d);
  cursor: pointer;
  transition: all 0.12s;
  position: relative;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%);
  padding-left: 1rem;
  padding-right: 1rem;
  margin-left: -4px;
}

.o-stage:first-child {
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%);
  border-radius: var(--o-border-radius, 4px) 0 0 var(--o-border-radius, 4px);
  margin-left: 0;
  padding-left: 0.875rem;
}

.o-stage:last-child {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 8px 50%);
  border-radius: 0 var(--o-border-radius, 4px) var(--o-border-radius, 4px) 0;
  padding-right: 0.875rem;
}

.o-stage.done {
  background: color-mix(in srgb, var(--o-brand-primary, #714B67) 15%, transparent);
  border-color: color-mix(in srgb, var(--o-brand-primary, #714B67) 30%, transparent);
  color: var(--o-brand-primary, #714B67);
}

.o-stage.current {
  background: var(--o-brand-primary, #714B67);
  border-color: var(--o-brand-primary, #714B67);
  color: #fff;
  font-weight: 600;
}

.o-stage.future:hover:not(:disabled) {
  background: var(--o-gray-100, #f8f9fa);
  color: var(--o-gray-800, #343a40);
}

.o-stage--cancel.current {
  background: var(--o-danger, #dc3545);
  border-color: var(--o-danger, #dc3545);
}

.o-stage--cancel.done {
  background: color-mix(in srgb, var(--o-danger, #dc3545) 15%, transparent);
  border-color: color-mix(in srgb, var(--o-danger, #dc3545) 30%, transparent);
  color: var(--o-danger, #dc3545);
}

.o-stage--readonly {
  cursor: default;
  opacity: 0.85;
}

.o-stage-check {
  display: flex;
  align-items: center;
}

/* ---------- Mobile dropdown ---------- */

.o-statusbar-dropdown {
  position: relative;
}

.o-statusbar-dropdown-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: var(--o-font-size-small, 0.8125rem);
  font-weight: 600;
  border: 1px solid var(--o-brand-primary, #714B67);
  border-radius: var(--o-border-radius, 4px);
  background: var(--o-brand-primary, #714B67);
  color: #fff;
  cursor: pointer;
}

.o-statusbar-dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  min-width: 180px;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  box-shadow: var(--o-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.15));
  z-index: 100;
  padding: 0.25rem 0;
}

.o-statusbar-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-700, #495057);
  cursor: pointer;
  text-align: left;
}

.o-statusbar-dropdown-item:hover {
  background: var(--o-gray-100, #f8f9fa);
}

.o-statusbar-dropdown-item.current {
  color: var(--o-brand-primary, #714B67);
  font-weight: 600;
}

.o-statusbar-dropdown-item.done {
  color: var(--o-brand-primary, #714B67);
}

.o-statusbar-dropdown-item.o-stage--cancel.current {
  color: var(--o-danger, #dc3545);
}

.o-stage-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--o-brand-primary, #714B67);
}

/* ---------- Confirm dialog ---------- */

.o-confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.o-confirm-dialog {
  background: var(--o-view-background, #fff);
  border-radius: var(--o-border-radius-lg, 8px);
  box-shadow: var(--o-shadow-lg, 0 8px 32px rgba(0, 0, 0, 0.2));
  padding: 1.5rem;
  max-width: 360px;
  width: 90%;
}

.o-confirm-message {
  margin: 0 0 1.25rem;
  font-size: 0.9375rem;
  color: var(--o-gray-800, #343a40);
}

.o-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* ---------- Transition ---------- */

.o-dialog-enter-active,
.o-dialog-leave-active {
  transition: opacity 0.15s ease;
}

.o-dialog-enter-from,
.o-dialog-leave-to {
  opacity: 0;
}
</style>
