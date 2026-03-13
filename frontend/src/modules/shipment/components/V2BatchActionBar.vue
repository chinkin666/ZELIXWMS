<template>
  <div v-if="selectedCount > 0" class="batch-bar">
    <span class="batch-bar__count">{{ selectedCount }}件選択中</span>
    <div class="batch-bar__actions">
      <template v-if="activeTab === 'pending_confirm'">
        <el-button size="small" @click="$emit('bulk-ship-plan-date')">出荷予定日一括</el-button>
        <el-button size="small" @click="$emit('bulk-sender')">ご依頼主一括</el-button>
        <el-button size="small" @click="$emit('bulk-carrier')">配送業者一括</el-button>
        <el-button size="small" @click="$emit('hold')">保留切替</el-button>
        <el-button type="danger" size="small" @click="$emit('delete')">削除</el-button>
        <el-button type="primary" size="small" :loading="isSubmitting" @click="$emit('submit')">出荷確認する</el-button>
      </template>
      <template v-if="activeTab === 'processing'">
        <el-button type="danger" size="small" @click="$emit('delete-backend')">削除</el-button>
        <el-button type="success" size="small" :loading="b2Validating || isAutoValidating" @click="$emit('confirm-print-ready')">
          {{ (b2Validating || isAutoValidating) ? '確定中...' : '再検証' }}
        </el-button>
      </template>
      <template v-if="activeTab === 'pending_waybill'">
        <el-button type="danger" size="small" @click="$emit('delete-backend')">削除</el-button>
        <el-button type="success" size="small" :loading="b2Exporting" @click="$emit('b2-export')">
          {{ b2Exporting ? '処理中...' : 'B2 Cloudで伝票作成' }}
        </el-button>
        <el-button size="small" @click="$emit('carrier-export')">配送業者データ出力</el-button>
        <el-button size="small" @click="$emit('hold-backend')">保留にする</el-button>
        <el-button type="warning" size="small" @click="$emit('unconfirm')">確認取消</el-button>
      </template>
      <template v-if="activeTab === 'held'">
        <el-button type="primary" size="small" @click="$emit('release-hold')">保留解除</el-button>
        <el-button type="danger" size="small" @click="$emit('delete-held')">削除</el-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  selectedCount: number
  activeTab: string
  isSubmitting: boolean
  b2Validating: boolean
  isAutoValidating: boolean
  b2Exporting: boolean
}>()

defineEmits<{
  'bulk-ship-plan-date': []
  'bulk-sender': []
  'bulk-carrier': []
  'hold': []
  'delete': []
  'submit': []
  'delete-backend': []
  'confirm-print-ready': []
  'b2-export': []
  'carrier-export': []
  'hold-backend': []
  'unconfirm': []
  'release-hold': []
  'delete-held': []
}>()
</script>

<style scoped>
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #ecf5ff;
  border-bottom: 1px solid #d9ecff;
}
.batch-bar__count {
  font-size: 13px;
  font-weight: 500;
  color: #409eff;
}
.batch-bar__actions {
  display: flex;
  gap: 8px;
}
</style>
