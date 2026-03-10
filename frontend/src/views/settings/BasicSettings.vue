<template>
  <div class="basic-settings">
    <h2 class="page-title">基本設定</h2>

    <el-card class="settings-card">
      <template #header>
        <span class="card-title">表示設定</span>
      </template>

      <el-form label-width="180px" label-position="left">
        <el-form-item label="受注一覧の検索パネル">
          <el-radio-group v-model="orderSearchStyle" @change="handleSearchStyleChange">
            <el-radio value="classic">伝統スタイル（フィールド固定）</el-radio>
            <el-radio value="modern">新式スタイル（フィルター選択式）</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore, type OrderSearchStyle } from '@/stores/settings'
import { ElMessage } from 'element-plus'

const settingsStore = useSettingsStore()

const orderSearchStyle = ref<OrderSearchStyle>('classic')

onMounted(() => {
  orderSearchStyle.value = settingsStore.orderSearchStyle
})

const handleSearchStyleChange = (value: OrderSearchStyle) => {
  settingsStore.setOrderSearchStyle(value)
  ElMessage.success('設定を保存しました')
}
</script>

<style scoped>
.basic-settings {
  padding: 0;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #303133;
}

.settings-card {
  max-width: 800px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
}

:deep(.el-form-item) {
  margin-bottom: 24px;
}

:deep(.el-radio-group) {
  display: flex;
  flex-direction: row;
  gap: 24px;
}

:deep(.el-radio) {
  height: auto;
}

:deep(.el-radio__label) {
  font-size: 14px;
}
</style>
