<template>
  <div class="o-tab-fields" v-if="definitions.length > 0">
    <div v-for="def in definitions" :key="def._id" class="o-field-row">
      <label class="o-field-label">
        {{ def.labelJa || def.label }}
        <span v-if="def.required" class="o-required">*</span>
      </label>
      <div class="o-field-value">
        <!-- text -->
        <Input
          v-if="def.fieldType === 'text'"
          class="o-inline-input"
          type="text"
          :value="modelValue[def.fieldKey] ?? def.defaultValue ?? ''"
          :placeholder="def.label"
          @input="onInput(def.fieldKey, ($event.target as HTMLInputElement).value)"
        />

        <!-- number -->
        <Input
          v-else-if="def.fieldType === 'number'"
          class="o-inline-input"
          type="number"
          :value="modelValue[def.fieldKey] ?? def.defaultValue ?? ''"
          :placeholder="def.label"
          @input="onNumberInput(def.fieldKey, ($event.target as HTMLInputElement).value)"
        />

        <!-- boolean -->
        <select
          v-else-if="def.fieldType === 'boolean'"
          class="o-inline-input"
          :value="String(modelValue[def.fieldKey] ?? def.defaultValue ?? false)"
          @change="onBooleanInput(def.fieldKey, ($event.target as HTMLSelectElement).value)"
        >
          <option value="true">はい</option>
          <option value="false">いいえ</option>
        </select>

        <!-- date -->
        <Input
          v-else-if="def.fieldType === 'date'"
          class="o-inline-input"
          type="date"
          :value="modelValue[def.fieldKey] ?? def.defaultValue ?? ''"
          @input="onInput(def.fieldKey, ($event.target as HTMLInputElement).value)"
        />

        <!-- select -->
        <select
          v-else-if="def.fieldType === 'select'"
          class="o-inline-input"
          :value="modelValue[def.fieldKey] ?? def.defaultValue ?? ''"
          @change="onInput(def.fieldKey, ($event.target as HTMLSelectElement).value)"
        >
          <option value="">選択してください</option>
          <option v-for="opt in def.options" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
    </div>
  </div>
  <div v-else-if="loaded" class="o-tab-fields">
    <p class="o-empty-hint">カスタムフィールドが定義されていません</p>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { ref, onMounted, watch } from 'vue'
import {
  fetchActiveDefinitions,
  type CustomFieldDefinition,
  type CustomFieldEntityType,
} from '@/api/customField'

const props = defineProps<{
  entityType: CustomFieldEntityType
  modelValue: Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void
}>()

const definitions = ref<CustomFieldDefinition[]>([])
const loaded = ref(false)

async function loadDefinitions() {
  try {
    const res = await fetchActiveDefinitions(props.entityType)
    definitions.value = res.data
  } catch {
    // 静默处理 / サイレント処理
  } finally {
    loaded.value = true
  }
}

function onInput(key: string, value: string) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function onNumberInput(key: string, value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value === '' ? undefined : Number(value),
  })
}

function onBooleanInput(key: string, value: string) {
  emit('update:modelValue', { ...props.modelValue, [key]: value === 'true' })
}

watch(() => props.entityType, loadDefinitions)
onMounted(loadDefinitions)
</script>

<style scoped>
.o-required {
  color: #ef4444;
  margin-left: 2px;
}
.o-empty-hint {
  color: #9ca3af;
  font-size: 13px;
  padding: 8px 0;
}
</style>
