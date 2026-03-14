<script setup lang="ts">
/**
 * 邮编自动填写输入组件 / 郵便番号自動入力コンポーネント
 *
 * 输入 7 位邮编后自动查询地址，回调填写都道府県/市区町村/町名。
 * 7桁の郵便番号入力後、住所を自動検索し、都道府県/市区町村/町名をコールバックで返す。
 */
import { ref } from 'vue'
import { lookupPostalCode, type PostalResult } from '@/utils/postalCode'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'resolved': [result: PostalResult]
}>()

const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

let debounce: ReturnType<typeof setTimeout> | null = null

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  emit('update:modelValue', val)

  const cleaned = val.replace(/[-\s]/g, '')
  if (cleaned.length === 7) {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => lookup(), 300)
  } else {
    message.value = ''
  }
}

async function lookup() {
  const code = props.modelValue.replace(/[-\s]/g, '')
  if (!/^\d{7}$/.test(code)) {
    message.value = '7桁の数字を入力してください'
    messageType.value = 'error'
    return
  }
  loading.value = true
  message.value = ''
  try {
    const result = await lookupPostalCode(code)
    if (result) {
      emit('resolved', result)
      message.value = `${result.prefecture}${result.city}${result.street}`
      messageType.value = 'success'
    } else {
      message.value = '該当する住所が見つかりません'
      messageType.value = 'error'
    }
  } catch {
    message.value = '検索に失敗しました'
    messageType.value = 'error'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="postal-input">
    <div class="postal-input__row">
      <input
        class="o-input"
        :value="modelValue"
        @input="onInput"
        placeholder="例: 2310058"
        maxlength="8"
      />
      <button
        class="postal-input__btn"
        :disabled="loading"
        @click="lookup"
        title="住所検索"
        type="button"
      >
        <svg v-if="!loading" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
        <span v-else class="postal-input__spinner" />
      </button>
    </div>
    <span v-if="message" class="postal-input__msg" :class="messageType">{{ message }}</span>
  </div>
</template>

<style scoped>
.postal-input__row {
  display: flex;
  gap: 4px;
}
.postal-input__row .o-input { flex: 1; }
.postal-input__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--o-brand-primary, #D97756);
  background: var(--o-brand-primary, #D97756);
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}
.postal-input__btn:hover { background: var(--o-brand-hover-dark, #B85D3A); }
.postal-input__btn:disabled { opacity: 0.6; cursor: not-allowed; }
.postal-input__spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: postal-spin 0.6s linear infinite;
}
@keyframes postal-spin { to { transform: rotate(360deg); } }
.postal-input__msg { font-size: 11px; margin-top: 2px; display: block; }
.postal-input__msg.success { color: var(--o-success, #3D8B37); }
.postal-input__msg.error { color: var(--o-danger, #C0392B); }
</style>
