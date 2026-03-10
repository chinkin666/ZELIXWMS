<template>
  <div class="order-group-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">検品グループ設定</h1>
        <p class="page-subtitle">検品グループを管理します。ドラッグで並び替えできます。</p>
      </div>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">グループを追加</el-button>
      </div>
    </div>

    <div class="groups-list" v-loading="isLoading">
      <div v-if="groups.length === 0" class="empty-state">
        <el-empty description="検品グループがありません" />
      </div>

      <draggable
        v-else
        v-model="groups"
        item-key="_id"
        handle=".drag-handle"
        ghost-class="drag-ghost"
        @end="onDragEnd"
      >
        <template #item="{ element: group }">
          <div
            class="group-card"
            :class="{ disabled: !group.enabled }"
          >
            <div class="drag-handle">
              <el-icon :size="18"><Rank /></el-icon>
            </div>

            <div class="group-info">
              <div class="group-name">
                {{ group.name }}
                <el-tag v-if="!group.enabled" type="info" size="small">無効</el-tag>
              </div>
              <div class="group-meta">
                <span class="group-id">{{ group.orderGroupId }}</span>
                <span v-if="group.description" class="group-description">{{ group.description }}</span>
              </div>
            </div>

            <div class="group-actions">
              <el-switch
                :model-value="group.enabled"
                @change="(val: boolean) => handleEnableChange(group, val)"
              />
              <el-button type="primary" plain size="small" @click="openEdit(group)">編集</el-button>
              <el-button type="danger" plain size="small" @click="confirmDelete(group)">削除</el-button>
            </div>
          </div>
        </template>
      </draggable>
    </div>

    <!-- 创建/编辑对话框 -->
    <OrderGroupFormDialog
      v-model="dialogVisible"
      :is-editing="isEditing"
      :initial-data="editingGroup"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Rank } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'
import {
  fetchOrderGroups,
  createOrderGroup,
  updateOrderGroup,
  deleteOrderGroup,
  reorderOrderGroups,
} from '@/api/orderGroup'
import type { OrderGroup, OrderGroupFormData } from '@/types/orderGroup'
import OrderGroupFormDialog from '@/components/order-group/OrderGroupFormDialog.vue'

const groups = ref<OrderGroup[]>([])
const isLoading = ref(false)
const dialogVisible = ref(false)
const isEditing = ref(false)
const editingGroup = ref<OrderGroup | null>(null)

const loadGroups = async () => {
  isLoading.value = true
  try {
    groups.value = await fetchOrderGroups()
  } catch (e: any) {
    ElMessage.error(e.message || '検品グループの取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

const openCreate = () => {
  isEditing.value = false
  editingGroup.value = null
  dialogVisible.value = true
}

const openEdit = (group: OrderGroup) => {
  isEditing.value = true
  editingGroup.value = group
  dialogVisible.value = true
}

const handleSubmit = async (data: OrderGroupFormData) => {
  try {
    if (isEditing.value && editingGroup.value) {
      await updateOrderGroup(editingGroup.value._id, data)
      ElMessage.success('検品グループを更新しました')
    } else {
      await createOrderGroup(data)
      ElMessage.success('検品グループを作成しました')
    }
    dialogVisible.value = false
    await loadGroups()
  } catch (e: any) {
    ElMessage.error(e.message || '保存に失敗しました')
  }
}

const handleEnableChange = async (group: OrderGroup, enabled: boolean) => {
  try {
    await updateOrderGroup(group._id, { enabled })
    group.enabled = enabled
    ElMessage.success(enabled ? 'グループを有効にしました' : 'グループを無効にしました')
  } catch (e: any) {
    ElMessage.error(e.message || '更新に失敗しました')
  }
}

const confirmDelete = async (group: OrderGroup) => {
  try {
    await ElMessageBox.confirm(
      `検品グループ「${group.name}」を削除しますか？このグループに属する注文のグループ設定もクリアされます。`,
      '削除の確認',
      {
        confirmButtonText: '削除',
        cancelButtonText: 'キャンセル',
        type: 'warning',
      }
    )
    await deleteOrderGroup(group._id)
    ElMessage.success('検品グループを削除しました')
    await loadGroups()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '削除に失敗しました')
    }
  }
}

const onDragEnd = async () => {
  try {
    const orderedIds = groups.value.map((g) => g._id)
    await reorderOrderGroups(orderedIds)
  } catch (e: any) {
    ElMessage.error(e.message || '優先順位の更新に失敗しました')
    await loadGroups()
  }
}

onMounted(() => {
  loadGroups()
})
</script>

<style scoped>
.order-group-settings {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.page-actions {
  display: flex;
  gap: 12px;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  padding: 60px 0;
}

.group-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: box-shadow 0.2s;
}

.group-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.group-card.disabled {
  opacity: 0.6;
  background: #f5f7fa;
}

.drag-handle {
  display: flex;
  align-items: center;
  cursor: grab;
  color: #c0c4cc;
  padding: 4px;
  flex-shrink: 0;
}

.drag-handle:hover {
  color: #909399;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-ghost {
  opacity: 0.4;
  background: #ecf5ff;
  border: 1px dashed #409eff;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.group-id {
  font-family: monospace;
  font-size: 12px;
  color: #a8abb2;
}

.group-description {
  font-size: 13px;
  color: #909399;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.group-actions :deep(.el-button) {
  margin: 0;
  min-width: 54px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  border-width: 1px;
}

.group-actions :deep(.el-button--primary.is-plain) {
  border-color: var(--el-color-primary);
}

.group-actions :deep(.el-button--danger.is-plain) {
  border-color: var(--el-color-danger);
}
</style>
