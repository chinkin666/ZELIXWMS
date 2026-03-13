<template>
  <div class="bundle-bar">
    <div class="bundle-bar__filter" @click="$emit('open-filter')">
      <span class="bundle-bar__title">絞り込み条件：</span>
      <span class="bundle-bar__labels">{{ bundleFilterLabels || '未設定' }}</span>
      <el-icon style="margin-left: 4px;"><EditIcon /></el-icon>
    </div>
    <div class="bundle-bar__actions">
      <el-button type="primary" size="small" :disabled="selectedCount === 0" @click="$emit('merge')">同梱する</el-button>
      <el-button type="warning" size="small" :disabled="!hasUnbundleableRows" @click="$emit('unbundle')">同梱解除</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Edit as EditIcon } from '@element-plus/icons-vue'

defineProps<{
  bundleFilterLabels: string
  selectedCount: number
  hasUnbundleableRows: boolean
}>()

defineEmits<{
  'open-filter': []
  'merge': []
  'unbundle': []
}>()
</script>

<style scoped>
.bundle-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fdf6ec;
  border: 1px solid #e6a23c;
  border-radius: 6px;
  margin-bottom: 12px;
}
.bundle-bar__filter {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}
.bundle-bar__filter:hover {
  opacity: 0.8;
}
.bundle-bar__title {
  font-weight: 600;
  font-size: 13px;
  color: #e6a23c;
  flex-shrink: 0;
}
.bundle-bar__labels {
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bundle-bar__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 12px;
}
</style>
