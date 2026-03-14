<script setup lang="ts">
// 404ページ / 404 Not Found page
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const router = useRouter()

function goHome() {
  router.push('/home')
}
</script>

<template>
  <div class="not-found">
    <div class="not-found__content">
      <h1 class="not-found__code">404</h1>
      <h2 class="not-found__title">{{ t('wms.ui.pageNotFound', 'ページが見つかりません') }}</h2>
      <p class="not-found__description">
        {{ t('wms.ui.pageNotFoundDescription', 'お探しのページは存在しないか、移動した可能性があります。') }}
      </p>
      <button class="not-found__button" @click="goHome">
        {{ t('wms.ui.goHome', 'ホームに戻る') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--o-webclient-background, #FAF7F5);
}

.not-found__content {
  text-align: center;
  padding: 2rem;
}

.not-found__code {
  font-size: 6rem;
  font-weight: 700;
  color: var(--o-brand-primary, #D97756);
  margin: 0;
  line-height: 1;
  opacity: 0.8;
}

.not-found__title {
  font-size: 1.5rem;
  color: var(--o-gray-800, #303133);
  margin: 1rem 0 0.5rem;
}

.not-found__description {
  color: var(--o-gray-500, #909399);
  margin-bottom: 2rem;
}

.not-found__button {
  padding: 0.75rem 2rem;
  background: var(--o-brand-primary, #D97756);
  color: #fff;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.not-found__button:hover {
  background: var(--o-brand-hover-dark, #B85D3A);
}
</style>
