<script setup lang="ts">
/**
 * ローディング・空状態コンポーネント / 加载·空状态组件
 *
 * テーブルやリストの読み込み中・データなし状態を統一表示する
 * 统一显示表格/列表的加载中和无数据状态
 */
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

defineProps<{
  loading?: boolean
  empty?: boolean
  loadingText?: string
  emptyText?: string
  emptyIcon?: boolean
}>()
</script>

<template>
  <div v-if="loading" class="o-loading-state">
    <div class="o-loading-spinner" />
    <span class="o-loading-text">{{ loadingText || t('wms.common.loading', '読み込み中...') }}</span>
  </div>
  <div v-else-if="empty" class="o-empty-state">
    <svg v-if="emptyIcon !== false" width="48" height="48" viewBox="0 0 16 16" fill="currentColor" class="o-empty-icon">
      <path d="M2.5 0A2.5 2.5 0 0 0 0 2.5v11A2.5 2.5 0 0 0 2.5 16h11a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 13.5 0h-11zM1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11z"/>
      <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
    </svg>
    <span class="o-empty-text">{{ emptyText || t('wms.common.noData', 'データがありません') }}</span>
  </div>
  <slot v-else />
</template>

<style scoped>
.o-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  gap: 12px;
}

.o-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--o-gray-200, #e4e7ed);
  border-top-color: var(--o-brand-primary, #0052A3);
  border-radius: 50%;
  animation: o-spin 0.8s linear infinite;
}

@keyframes o-spin {
  to { transform: rotate(360deg); }
}

.o-loading-text {
  font-size: 14px;
  color: var(--o-gray-500, #909399);
}

.o-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  gap: 12px;
}

.o-empty-icon {
  color: var(--o-gray-300, #c0c4cc);
}

.o-empty-text {
  font-size: 14px;
  color: var(--o-gray-400, #c0c4cc);
}
</style>
