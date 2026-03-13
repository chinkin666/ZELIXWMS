<template>
  <div class="page-header">
    <div class="page-header__left">
      <h2 class="page-title">出荷指示作成</h2>
      <el-input
        :model-value="globalSearchText"
        placeholder="検索..."
        :prefix-icon="Search"
        clearable
        style="width: 280px"
        @update:model-value="$emit('update:globalSearchText', $event)"
      />
    </div>
    <div class="page-header__right">
      <template v-if="activeTab === 'pending_confirm'">
        <el-button v-if="!bundleModeEnabled" @click="$emit('open-bundle-mode')">同梱モード</el-button>
        <el-button v-else type="warning" @click="$emit('exit-bundle-mode')">同梱モード終了</el-button>
        <el-button @click="$emit('import-click')">
          <el-icon><Upload /></el-icon>
          一括登録
        </el-button>
        <el-button type="primary" @click="$emit('add-click')">
          <el-icon><Plus /></el-icon>
          個別登録
        </el-button>
      </template>
      <template v-if="activeTab === 'pending_waybill'">
        <el-button type="success" @click="$emit('show-carrier-import')">
          <el-icon><Download /></el-icon>
          送り状データ取込
        </el-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, Plus, Upload, Download } from '@element-plus/icons-vue'

defineProps<{
  activeTab: string
  globalSearchText: string
  bundleModeEnabled: boolean
}>()

defineEmits<{
  'update:globalSearchText': [value: string]
  'open-bundle-mode': []
  'exit-bundle-mode': []
  'import-click': []
  'add-click': []
  'show-carrier-import': []
}>()
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-header__left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.page-header__right {
  display: flex;
  gap: 8px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}
</style>
