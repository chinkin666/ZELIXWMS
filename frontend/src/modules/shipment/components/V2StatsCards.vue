<template>
  <el-row :gutter="16" class="stats-row">
    <el-col :span="6">
      <div class="stat-card" :class="{ active: activeTab === 'pending_confirm' }" @click="$emit('update:activeTab', 'pending_confirm')">
        <div class="stat-card__label">出荷確認待ち</div>
        <div class="stat-card__value">{{ pendingConfirmCount }}</div>
      </div>
    </el-col>
    <el-col :span="6">
      <div class="stat-card" :class="{ active: activeTab === 'processing' }" @click="$emit('update:activeTab', 'processing')">
        <div class="stat-card__label">処理中</div>
        <div class="stat-card__value">{{ processingCount }}</div>
      </div>
    </el-col>
    <el-col :span="6">
      <div class="stat-card" :class="{ active: activeTab === 'pending_waybill' }" @click="$emit('update:activeTab', 'pending_waybill')">
        <div class="stat-card__label">送り状未発行</div>
        <div class="stat-card__value">{{ pendingWaybillCount }}</div>
      </div>
    </el-col>
    <el-col :span="6">
      <div class="stat-card" :class="{ active: activeTab === 'held' }" @click="$emit('update:activeTab', 'held')">
        <div class="stat-card__label">保留</div>
        <div class="stat-card__value">{{ heldCount }}</div>
      </div>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
defineProps<{
  activeTab: string
  pendingConfirmCount: number
  processingCount: number
  pendingWaybillCount: number
  heldCount: number
}>()

defineEmits<{ 'update:activeTab': [tab: string] }>()
</script>

<style scoped>
.stats-row {
  margin-bottom: 16px;
}
.stat-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.stat-card:hover {
  border-color: #c0c4cc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.stat-card.active {
  border-color: #409eff;
  background: #ecf5ff;
}
.stat-card__label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}
.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}
.stat-card.active .stat-card__value {
  color: #409eff;
}
</style>
