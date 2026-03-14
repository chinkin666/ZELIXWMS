<script setup lang="ts">
// 错误边界组件 / エラーバウンダリコンポーネント
// Catches errors from child components and displays a fallback UI
import { ref, onErrorCaptured } from 'vue'

const error = ref<Error | null>(null)

onErrorCaptured((err: Error) => {
  error.value = err
  console.error('[ErrorBoundary] キャプチャされたエラー / Captured error:', err)
  // エラーの伝播を停止 / Stop error propagation
  return false
})

function reset() {
  error.value = null
}
</script>

<template>
  <slot v-if="!error" />
  <div v-else class="error-boundary">
    <div class="error-boundary__icon">!</div>
    <h3 class="error-boundary__title">予期しないエラーが発生しました</h3>
    <p class="error-boundary__message">{{ error.message }}</p>
    <button class="error-boundary__button" @click="reset">再試行</button>
  </div>
</template>

<style scoped>
.error-boundary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 2rem;
  text-align: center;
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 8px;
  margin: 1rem;
}

.error-boundary__icon {
  width: 48px;
  height: 48px;
  line-height: 48px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #f56c6c;
  background: #fde2e2;
  border-radius: 50%;
  margin-bottom: 1rem;
}

.error-boundary__title {
  color: #f56c6c;
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.error-boundary__message {
  color: #909399;
  margin: 0 0 1.5rem;
  max-width: 400px;
  word-break: break-word;
}

.error-boundary__button {
  padding: 0.5rem 1.5rem;
  background: #f56c6c;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.error-boundary__button:hover {
  background: #f78989;
}
</style>
