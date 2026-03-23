<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ref, computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  modelValue: string[]
  placeholder?: string
  maxTags?: number
  suggestions?: string[]
  allowCustom?: boolean
}>(), {
  placeholder: '',
  maxTags: 0,
  suggestions: () => [],
  allowCustom: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const inputValue = ref('')
const isFocused = ref(false)
const showSuggestions = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const filteredSuggestions = computed(() => {
  if (!inputValue.value.trim()) return []
  const query = inputValue.value.toLowerCase()
  return props.suggestions.filter(
    s => s.toLowerCase().includes(query) && !props.modelValue.includes(s)
  )
})

const isAtLimit = computed(() => props.maxTags > 0 && props.modelValue.length >= props.maxTags)

function addTag(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return
  if (props.modelValue.includes(trimmed)) return
  if (isAtLimit.value) return
  if (!props.allowCustom && !props.suggestions.includes(trimmed)) return
  emit('update:modelValue', [...props.modelValue, trimmed])
  inputValue.value = ''
  showSuggestions.value = false
}

function removeTag(index: number) {
  const updated = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', updated)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addTag(inputValue.value)
  } else if (event.key === 'Backspace' && !inputValue.value && props.modelValue.length > 0) {
    removeTag(props.modelValue.length - 1)
  } else if (event.key === 'Escape') {
    showSuggestions.value = false
  }
}

function onInput() {
  showSuggestions.value = inputValue.value.trim().length > 0
}

function selectSuggestion(suggestion: string) {
  addTag(suggestion)
  inputRef.value?.focus()
}

function onFocus() {
  isFocused.value = true
}

function onBlur() {
  isFocused.value = false
  setTimeout(() => { showSuggestions.value = false }, 150)
}

function focusInput() {
  inputRef.value?.focus()
}
</script>

<template>
  <div class="o-tag-input-wrapper">
    <div
      class="o-tag-input"
      :class="{ 'o-tag-input--focused': isFocused }"
      @click="focusInput"
    >
      <span
        v-for="(tag, index) in modelValue"
        :key="tag"
        class="o-tag-chip"
      >
        <span class="o-tag-chip-label">{{ tag }}</span>
        <Button
          class="o-tag-chip-remove"
          type="button"
          :aria-label="t('common.remove') || 'Remove'"
          @click.stop="removeTag(index)"
        >
          &times;
        </button>
      </span>
      <Input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        class="o-tag-input-field"
        :placeholder="modelValue.length === 0 ? placeholder : ''"
        :disabled="isAtLimit"
        @keydown="onKeydown"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      />
    </div>
    <p v-if="isAtLimit" class="o-tag-input-warning">
      {{ t('common.maxReached') || `Maximum of ${maxTags} tags reached` }}
    </p>
    <ul v-if="showSuggestions && filteredSuggestions.length > 0" class="o-tag-suggestions">
      <li
        v-for="suggestion in filteredSuggestions"
        :key="suggestion"
        class="o-tag-suggestion-item"
        @mousedown.prevent="selectSuggestion(suggestion)"
      >
        {{ suggestion }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.o-tag-input-wrapper {
  position: relative;
  width: 100%;
}

.o-tag-input {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  min-height: 38px;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  background: var(--o-view-background, #fff);
  cursor: text;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.o-tag-input--focused {
  border-color: var(--o-brand-primary, #0052A3);
  box-shadow: 0 0 0 2px rgba(0, 82, 163, 0.15);
}

.o-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  background: var(--o-brand-lightest, #e8dfe6);
  color: var(--o-brand-primary, #0052A3);
  border-radius: var(--o-border-radius-sm, 3px);
  padding: 0.125rem 0.375rem;
  font-size: var(--o-font-size-small, 0.8125rem);
  font-weight: 500;
  line-height: 1.4;
  max-width: 180px;
}

.o-tag-chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.o-tag-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--o-brand-primary, #0052A3);
  font-size: 1rem;
  line-height: 1;
  padding: 0 0.125rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.1s;
}

.o-tag-chip-remove:hover {
  opacity: 1;
}

.o-tag-input-field {
  flex: 1;
  min-width: 80px;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--o-font-size-base, 0.875rem);
  color: var(--o-gray-900, #212529);
  padding: 0.125rem 0;
  font-family: inherit;
}

.o-tag-input-field::placeholder {
  color: var(--o-gray-500, #adb5bd);
}

.o-tag-input-field:disabled {
  cursor: not-allowed;
}

.o-tag-input-warning {
  margin-top: 0.25rem;
  font-size: var(--o-font-size-smaller, 0.75rem);
  color: var(--o-warning-text, #856404);
}

.o-tag-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1050;
  margin-top: 2px;
  padding: 0.25rem 0;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  box-shadow: var(--o-shadow-md);
  list-style: none;
  max-height: 180px;
  overflow-y: auto;
}

.o-tag-suggestion-item {
  padding: 0.375rem 0.75rem;
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-800, #343a40);
  cursor: pointer;
  transition: background 0.1s;
}

.o-tag-suggestion-item:hover {
  background: var(--o-brand-light, #f0e6ed);
  color: var(--o-brand-primary, #0052A3);
}

[data-theme="dark"] .o-tag-input {
  background: var(--o-gray-200);
  border-color: var(--o-gray-300);
}

[data-theme="dark"] .o-tag-input--focused {
  border-color: var(--o-brand-primary);
  box-shadow: 0 0 0 2px rgba(0, 82, 163, 0.25);
}

[data-theme="dark"] .o-tag-chip {
  background: var(--o-brand-lightest);
  color: var(--o-brand-primary);
}

[data-theme="dark"] .o-tag-input-field {
  color: var(--o-gray-900);
}

[data-theme="dark"] .o-tag-suggestions {
  background: var(--o-gray-200);
  border-color: var(--o-gray-300);
}

[data-theme="dark"] .o-tag-suggestion-item {
  color: var(--o-gray-800);
}

[data-theme="dark"] .o-tag-suggestion-item:hover {
  background: var(--o-brand-light);
}
</style>
