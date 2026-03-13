<template>
  <div class="status-tags">
    <el-tag v-if="row._validationError || (activeTab === 'pending_confirm' && hasFrontendErrors)" type="danger" size="small" effect="dark">エラー</el-tag>
    <el-tag v-else-if="row._isValidating || isB2ValidationError" size="small" effect="dark" color="#e6a23c">検証中</el-tag>
    <el-tag v-else-if="held" type="info" size="small" effect="dark">保留</el-tag>
    <el-tag v-else-if="activeTab === 'pending_waybill'" type="warning" size="small">未発行</el-tag>
    <el-tag v-if="deliverySpec" size="small" effect="dark" color="#e6a23c" style="color:#fff">配送指定</el-tag>
    <el-tag v-if="okinawa" type="danger" size="small" effect="dark">沖縄配送</el-tag>
    <el-tag v-if="remoteIsland" type="danger" size="small" effect="dark">離島配送</el-tag>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  row: any
  activeTab: string
  hasFrontendErrors: boolean
  isB2ValidationError: boolean
  held: boolean
  deliverySpec: boolean
  okinawa: boolean
  remoteIsland: boolean
}>()
</script>

<style scoped>
.status-tags {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
