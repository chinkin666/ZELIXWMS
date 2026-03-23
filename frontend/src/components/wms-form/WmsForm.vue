<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
/**
 * WMS動的フォーム / WMS动态表单
 *
 * JSON Schema駆動 — form-itemのハードコーディングは一切なし。
 * JSON Schema驱动 — 不存在硬编码的form-item。
 */
import type { WmsFieldSchema } from '@/components/wms-table/types'
import { computed, reactive, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = defineProps<{
  schema: WmsFieldSchema[]
  modelValue: Record<string, any>
  readonly?: boolean
  submitLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [data: Record<string, any>]
  submit: [data: Record<string, any>]
}>()

// フォームデータ / 表单数据
const formData = reactive<Record<string, any>>({ ...props.modelValue })

watch(() => props.modelValue, (v) => Object.assign(formData, v), { deep: true })

// バリデーション状態 / 验证状态
const errors = reactive<Record<string, string>>({})

// 表示可能フィールド（条件表示対応）/ 可见字段（支持条件显示）
const visibleFields = computed(() =>
  props.schema.filter(field => {
    if (typeof field.visible === 'function') return field.visible(formData)
    return field.visible !== false
  }),
)

// グループ化フィールド / 分组字段
const groupedFields = computed(() => {
  const groups: Array<{ label: string | null; fields: WmsFieldSchema[] }> = []
  let currentGroup: string | null = null

  for (const field of visibleFields.value) {
    if (field.group && field.group !== currentGroup) {
      currentGroup = field.group
      groups.push({ label: currentGroup, fields: [field] })
    } else if (groups.length === 0) {
      groups.push({ label: null, fields: [field] })
    } else {
      groups[groups.length - 1].fields.push(field)
    }
  }
  return groups
})

function updateField(key: string, value: any) {
  formData[key] = value
  emit('update:modelValue', { ...formData })
  // クリアエラー / 清除错误
  if (errors[key]) delete errors[key]
}

function isDisabled(field: WmsFieldSchema): boolean {
  if (props.readonly) return true
  if (typeof field.disabled === 'function') return field.disabled(formData)
  return !!field.disabled
}

function validate(): boolean {
  let valid = true
  for (const key of Object.keys(errors)) delete errors[key]

  for (const field of visibleFields.value) {
    const value = formData[field.key]
    const v = field.validation

    if (field.required && (value == null || value === '')) {
      errors[field.key] = `${field.label}は必須です`
      valid = false
      continue
    }

    if (v) {
      if (v.minLength && typeof value === 'string' && value.length < v.minLength) {
        errors[field.key] = v.message || `${v.minLength}文字以上入力してください`
        valid = false
      }
      if (v.maxLength && typeof value === 'string' && value.length > v.maxLength) {
        errors[field.key] = v.message || `${v.maxLength}文字以下で入力してください`
        valid = false
      }
      if (v.min != null && Number(value) < v.min) {
        errors[field.key] = v.message || `${v.min}以上の値を入力してください`
        valid = false
      }
      if (v.max != null && Number(value) > v.max) {
        errors[field.key] = v.message || `${v.max}以下の値を入力してください`
        valid = false
      }
      if (v.pattern && !v.pattern.test(String(value ?? ''))) {
        errors[field.key] = v.message || '形式が正しくありません'
        valid = false
      }
      if (v.custom) {
        const msg = v.custom(value, formData)
        if (msg) {
          errors[field.key] = msg
          valid = false
        }
      }
    }
  }
  return valid
}

function handleSubmit() {
  if (validate()) {
    emit('submit', { ...formData })
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <template v-for="(group, gi) in groupedFields" :key="gi">
      <!-- グループヘッダー / 分组标题 -->
      <div v-if="group.label" class="border-b pb-2 mb-4">
        <h4 class="text-sm font-semibold text-foreground">{{ group.label }}</h4>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div
          v-for="field in group.fields"
          :key="field.key"
          :class="field.colSpan === 2 ? 'md:col-span-2' : ''"
          class="flex flex-col space-y-2"
        >
          <Label :for="field.key">
            {{ field.label }}
            <span v-if="field.required" class="text-destructive ml-0.5">*</span>
          </Label>

          <!-- Text / Number -->
          <Input
            v-if="field.type === 'text' || field.type === 'number'"
            :id="field.key"
            :type="field.type === 'number' ? 'number' : 'text'"
            :placeholder="field.placeholder"
            :disabled="isDisabled(field)"
            :model-value="formData[field.key]"
            @update:model-value="updateField(field.key, $event)"
          />

          <!-- Textarea -->
          <Textarea
            v-else-if="field.type === 'textarea'"
            :id="field.key"
            :placeholder="field.placeholder"
            :disabled="isDisabled(field)"
            :value="formData[field.key]"
            rows="3"
            class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            @input="updateField(field.key, ($event.target as HTMLTextAreaElement).value)"
          />

          <!-- Select -->
          <Select
            v-else-if="field.type === 'select'"
            :model-value="String(formData[field.key] ?? '')"
            :disabled="isDisabled(field)"
            @update:model-value="updateField(field.key, $event)"
          >
            <SelectTrigger :id="field.key">
              <SelectValue :placeholder="field.placeholder ?? '選択してください'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="opt in field.options"
                :key="String(opt.value)"
                :value="String(opt.value)"
              >
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <!-- Date -->
          <Input
            v-else-if="field.type === 'date' || field.type === 'datetime'"
            :id="field.key"
            :type="field.type === 'datetime' ? 'datetime-local' : 'date'"
            :disabled="isDisabled(field)"
            :model-value="formData[field.key]"
            @update:model-value="updateField(field.key, $event)"
          />

          <!-- Switch -->
          <div v-else-if="field.type === 'switch'" class="flex items-center space-x-2">
            <Switch
              :id="field.key"
              :checked="!!formData[field.key]"
              :disabled="isDisabled(field)"
              @update:checked="updateField(field.key, $event)"
            />
            <Label :for="field.key" class="text-sm text-muted-foreground">
              {{ formData[field.key] ? '有効' : '無効' }}
            </Label>
          </div>

          <!-- ヘルプテキスト / 帮助文本 -->
          <p v-if="field.helpText" class="text-xs text-muted-foreground">{{ field.helpText }}</p>

          <!-- エラーメッセージ / 错误消息 -->
          <p v-if="errors[field.key]" class="text-xs text-destructive">{{ errors[field.key] }}</p>
        </div>
      </div>
    </template>

    <!-- 送信ボタン / 提交按钮 -->
    <div v-if="!readonly" class="flex justify-end gap-2 pt-4 border-t">
      <slot name="footer">
        <Button type="submit">{{ submitLabel ?? '保存' }}</Button>
      </slot>
    </div>
  </form>
</template>
