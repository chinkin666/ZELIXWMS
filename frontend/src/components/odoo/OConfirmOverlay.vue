<script setup lang="ts">
import { Button } from '@/components/ui/button'
/**
 * グローバル確認ダイアログ / 全局确认弹窗
 * window.confirm() を美化版に置き換える
 */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const isOpen = ref(false)
const message = ref('')
const isDanger = ref(false)
const okBtnRef = ref<HTMLButtonElement | null>(null)
let resolvePromise: ((value: boolean) => void) | null = null

const dangerKeywords = ['削除', '取消', 'キャンセル', '無効', 'リセット', '解除', '取り消せません']

function handleConfirm() {
  isOpen.value = false
  resolvePromise?.(true)
  resolvePromise = null
}

function handleCancel() {
  isOpen.value = false
  resolvePromise?.(false)
  resolvePromise = null
}

function handleKeydown(e: KeyboardEvent) {
  if (!isOpen.value) return
  if (e.key === 'Escape') { e.preventDefault(); handleCancel() }
  if (e.key === 'Enter') { e.preventDefault(); handleConfirm() }
}

const originalConfirm = window.confirm.bind(window)

onMounted(() => {
  // @ts-ignore
  window.confirm = (msg: string): any => {
    message.value = msg || '確認しますか？'
    isDanger.value = dangerKeywords.some(kw => msg.includes(kw))
    isOpen.value = true
    nextTick(() => okBtnRef.value?.focus())
    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
  }
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.confirm = originalConfirm
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="cfd">
      <div v-if="isOpen" class="cfd-backdrop" @click.self="handleCancel">
        <div class="cfd-card" :class="{ 'cfd-card--danger': isDanger }">
          <!-- ヘッダー / 头部 -->
          <div class="cfd-header">
            <div class="cfd-icon" :class="isDanger ? 'cfd-icon--danger' : 'cfd-icon--info'">
              <!-- 危険: シールド警告 / 危险: 盾牌警告 -->
              <svg v-if="isDanger" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 2L2 6v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V6l-8-4z"/>
                <line x1="10" y1="8" x2="10" y2="12"/>
                <circle cx="10" cy="15" r="0.5" fill="currentColor"/>
              </svg>
              <!-- 通常: チェックサークル / 普通: 确认圈 -->
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="10" cy="10" r="8"/>
                <path d="M10 6v5"/>
                <circle cx="10" cy="14" r="0.5" fill="currentColor"/>
              </svg>
            </div>
            <h3 class="cfd-title">{{ isDanger ? '操作の確認' : '確認' }}</h3>
            <Button class="cfd-close" @click="handleCancel" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
              </svg>
            </button>
          </div>

          <!-- 本文 / 正文 -->
          <div class="cfd-body">
            <p class="cfd-message">{{ message }}</p>
          </div>

          <!-- フッター / 底部 -->
          <div class="cfd-footer">
            <Button class="cfd-btn cfd-btn--cancel" @click="handleCancel">
              キャンセル
            </button>
            <Button
              ref="okBtnRef"
              class="cfd-btn"
              :class="isDanger ? 'cfd-btn--danger' : 'cfd-btn--primary'"
              @click="handleConfirm"
            >
              {{ isDanger ? '削除する' : 'OK' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── 背景 / 背景 ── */
.cfd-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

/* ── カード / 卡片 ── */
.cfd-card {
  background: var(--o-view-background, #fff);
  border-radius: 10px;
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.05),
    0 8px 30px rgba(0,0,0,0.12),
    0 2px 6px rgba(0,0,0,0.06);
  width: 400px;
  max-width: calc(100vw - 32px);
  overflow: hidden;
}

/* ── ヘッダー / 头部 ── */
.cfd-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 16px 0 20px;
}

.cfd-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cfd-icon--danger {
  background: #FEF2F2;
  color: #DC2626;
}

.cfd-icon--info {
  background: #EFF6FF;
  color: #2563EB;
}

.cfd-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--o-gray-800, #1f2937);
  margin: 0;
  line-height: 1.3;
}

.cfd-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  border-radius: 6px;
  color: var(--o-gray-400, #9ca3af);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.cfd-close:hover {
  background: var(--o-gray-100, #f3f4f6);
  color: var(--o-gray-600, #4b5563);
}

/* ── 本文 / 正文 ── */
.cfd-body {
  padding: 12px 20px 0;
}

.cfd-message {
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--o-gray-600, #4b5563);
  margin: 0;
  white-space: pre-line;
  word-break: break-word;
}

/* ── フッター / 底部 ── */
.cfd-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  margin-top: 4px;
}

.cfd-btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
}

.cfd-btn:focus-visible {
  outline: 2px solid #2563EB;
  outline-offset: 1px;
}

.cfd-btn--cancel {
  background: var(--o-view-background, #fff);
  border-color: var(--o-gray-200, #e5e7eb);
  color: var(--o-gray-700, #374151);
}

.cfd-btn--cancel:hover {
  background: var(--o-gray-50, #f9fafb);
  border-color: var(--o-gray-300, #d1d5db);
}

.cfd-btn--primary {
  background: #2563EB;
  color: #fff;
}

.cfd-btn--primary:hover {
  background: #1D4ED8;
}

.cfd-btn--danger {
  background: #DC2626;
  color: #fff;
}

.cfd-btn--danger:hover {
  background: #B91C1C;
}

/* ── Transition ── */
.cfd-enter-active {
  transition: opacity 0.12s ease-out;
}
.cfd-leave-active {
  transition: opacity 0.08s ease-in;
}
.cfd-enter-active .cfd-card {
  transition: transform 0.12s cubic-bezier(0, 0, 0.2, 1);
}
.cfd-leave-active .cfd-card {
  transition: transform 0.08s ease-in;
}
.cfd-enter-from,
.cfd-leave-to {
  opacity: 0;
}
.cfd-enter-from .cfd-card {
  transform: scale(0.96) translateY(-6px);
}
.cfd-leave-to .cfd-card {
  transform: scale(0.98);
}

/* ── Dark mode / ダークモード ── */
:global([data-theme="dark"]) .cfd-card {
  background: #1C1C1E;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.06),
    0 8px 30px rgba(0,0,0,0.4);
}

:global([data-theme="dark"]) .cfd-icon--danger {
  background: rgba(220, 38, 38, 0.15);
}

:global([data-theme="dark"]) .cfd-icon--info {
  background: rgba(37, 99, 235, 0.15);
}

:global([data-theme="dark"]) .cfd-close:hover {
  background: rgba(255,255,255,0.08);
}

:global([data-theme="dark"]) .cfd-btn--cancel {
  background: transparent;
  border-color: rgba(255,255,255,0.12);
  color: #d1d5db;
}

:global([data-theme="dark"]) .cfd-btn--cancel:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.18);
}
</style>
