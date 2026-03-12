<template>
  <div class="o-quick-stats">
    <div class="o-stat-card">
      <div class="o-stat-icon o-stat-icon-total">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/><path d="M5 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 5 8zm0-2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-1-5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zM4 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm0 2.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/></svg>
      </div>
      <div class="o-stat-info">
        <span class="o-stat-value">{{ nonHeldCount }}</span>
        <span class="o-stat-label">登録対象</span>
      </div>
    </div>
    <div class="o-stat-card">
      <div class="o-stat-icon o-stat-icon-error">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>
      </div>
      <div class="o-stat-info">
        <span class="o-stat-value">{{ errorCount }}</span>
        <span class="o-stat-label">エラー件数</span>
      </div>
    </div>
    <div class="o-stat-card">
      <div class="o-stat-icon o-stat-icon-unregistered">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M11 5.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1z"/><path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2zm13 2v5H1V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1zm-1 9H2a1 1 0 0 1-1-1v-1h14v1a1 1 0 0 1-1 1z"/></svg>
      </div>
      <div class="o-stat-info">
        <span class="o-stat-value">{{ pendingWaybillNonHeldCount }}</span>
        <span class="o-stat-label">送り状未発行</span>
      </div>
    </div>
    <div
      class="o-stat-card"
      :class="{ 'o-stat-card--clickable': holdClickable }"
      @click="$emit('hold-click')"
      title="選択中の行を保留/解除（送り状未発行・保留タブのみ）"
    >
      <div class="o-stat-icon o-stat-icon-held">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1H11v-.5A1.5 1.5 0 0 0 9.5 1h-3zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5z"/></svg>
      </div>
      <div class="o-stat-info">
        <span class="o-stat-value">{{ totalHeldCount }}</span>
        <span class="o-stat-label">保留</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  nonHeldCount: number
  errorCount: number
  pendingWaybillNonHeldCount: number
  totalHeldCount: number
  holdClickable: boolean
}>()

defineEmits<{
  (e: 'hold-click'): void
}>()
</script>

<style scoped>
.o-quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.o-stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: var(--o-border-radius, 4px);
  transition: box-shadow 0.15s;
}

.o-stat-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.o-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.o-stat-icon-total { background: #e8f0fe; color: #1a73e8; }
.o-stat-icon-error { background: #fce8e6; color: #d93025; }
.o-stat-icon-unregistered { background: #fef7e0; color: #f9ab00; }
.o-stat-icon-held { background: #fff3e0; color: #e65100; }

.o-stat-card--clickable { cursor: pointer; transition: box-shadow 0.15s; }
.o-stat-card--clickable:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }

[data-theme="dark"] .o-stat-icon-total { background: rgba(26, 115, 232, 0.15); }
[data-theme="dark"] .o-stat-icon-error { background: rgba(217, 48, 37, 0.15); }
[data-theme="dark"] .o-stat-icon-unregistered { background: rgba(249, 171, 0, 0.15); }
[data-theme="dark"] .o-stat-icon-held { background: rgba(230, 81, 0, 0.15); }

.o-stat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.o-stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--o-gray-900, #303133);
  line-height: 1.2;
}

.o-stat-label {
  font-size: var(--o-font-size-smaller, 12px);
  color: var(--o-gray-500, #909399);
  white-space: nowrap;
}
</style>
