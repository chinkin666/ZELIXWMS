<template>
  <div class="order-bottom-bar">
    <!-- 左側：操作ボタンエリア / 左侧：操作按钮区域 -->
    <div class="order-bottom-bar__left">
      <slot name="left" />
    </div>

    <!-- 中央：統計情報エリア / 中间：统计信息区域 -->
    <div class="order-bottom-bar__center">
      <slot name="center">
        <div class="order-bottom-bar__meta">
          <span v-if="totalCount !== undefined">
            {{ totalLabel }}：<strong>{{ totalCount }}</strong>件
          </span>
          <span v-if="selectedCount > 0" class="order-bottom-bar__selected">
            （選択中：<strong>{{ selectedCount }}</strong>件）
          </span>
          <span v-if="errorCount > 0" class="order-bottom-bar__errors">
            （誤り：<strong>{{ errorCount }}</strong>件）
          </span>
        </div>
      </slot>
      <slot name="alert" />
    </div>

    <!-- 右側：メイン操作ボタンエリア / 右侧：主操作按钮区域 -->
    <div class="order-bottom-bar__right">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    totalCount?: number
    selectedCount?: number
    errorCount?: number
    totalLabel?: string
  }>(),
  {
    selectedCount: 0,
    errorCount: 0,
  },
)
</script>

<style scoped>
.order-bottom-bar {
  position: sticky;
  bottom: 0;
  margin-top: auto;
  padding: 12px 14px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 10;
}

.order-bottom-bar__left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.order-bottom-bar__center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.order-bottom-bar__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.order-bottom-bar__meta {
  color: #303133;
  font-size: 13px;
  white-space: nowrap;
}

.order-bottom-bar__selected {
  color: #409eff;
}

.order-bottom-bar__errors {
  color: #f56c6c;
}
</style>
