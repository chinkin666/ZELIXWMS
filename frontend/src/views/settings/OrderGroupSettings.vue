<template>
  <div class="order-group-settings">
    <ControlPanel :title="t('wms.settings.orderGroupSettings', '検品グループ設定')" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">{{ t('wms.settings.addGroup', 'グループを追加') }}</OButton>
      </template>
    </ControlPanel>

    <div class="groups-list">
      <div v-if="isLoading" class="loading-state">{{ t('wms.settings.loading', '読み込み中...') }}</div>

      <div v-else-if="groups.length === 0" class="empty-state">
        <p>{{ t('wms.settings.noOrderGroups', '検品グループがありません') }}</p>
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
              <span style="font-size:18px;color:#c0c4cc">&#x2630;</span>
            </div>

            <div class="group-info">
              <div class="group-name">
                {{ group.name }}
                <span v-if="!group.enabled" class="o-badge o-badge-info">{{ t('wms.settings.disabled', '無効') }}</span>
              </div>
              <div class="group-meta">
                <span class="group-id">{{ group.orderGroupId }}</span>
                <span v-if="group.description" class="group-description">{{ group.description }}</span>
              </div>
            </div>

            <div class="group-actions">
              <label class="o-toggle">
                <input
                  type="checkbox"
                  :checked="group.enabled"
                  @change="handleEnableChange(group, ($event.target as HTMLInputElement).checked)"
                />
                <span class="o-toggle-slider"></span>
              </label>
              <OButton variant="primary" size="sm" @click="openEdit(group)">{{ t('wms.common.edit', '編集') }}</OButton>
              <OButton variant="danger" size="sm" @click="confirmDelete(group)">{{ t('wms.common.delete', '削除') }}</OButton>
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
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
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

const { show: showToast } = useToast()
const { t } = useI18n()

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
    showToast(e.message || t('wms.settings.fetchGroupsFailed', '検品グループの取得に失敗しました'), 'danger')
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
      showToast(t('wms.settings.groupUpdated', '検品グループを更新しました'), 'success')
    } else {
      await createOrderGroup(data)
      showToast(t('wms.settings.groupCreated', '検品グループを作成しました'), 'success')
    }
    dialogVisible.value = false
    await loadGroups()
  } catch (e: any) {
    showToast(e.message || t('wms.settings.saveFailed', '保存に失敗しました'), 'danger')
  }
}

const handleEnableChange = async (group: OrderGroup, enabled: boolean) => {
  try {
    await updateOrderGroup(group._id, { enabled })
    group.enabled = enabled
    showToast(enabled ? t('wms.settings.groupEnabled', 'グループを有効にしました') : t('wms.settings.groupDisabled', 'グループを無効にしました'), 'success')
  } catch (e: any) {
    showToast(e.message || t('wms.settings.updateFailed', '更新に失敗しました'), 'danger')
  }
}

const confirmDelete = async (group: OrderGroup) => {
  if (!confirm(t('wms.settings.confirmDeleteGroup', `検品グループ「${group.name}」を削除しますか？このグループに属する注文のグループ設定もクリアされます。`))) return
  try {
    await deleteOrderGroup(group._id)
    showToast(t('wms.settings.groupDeleted', '検品グループを削除しました'), 'success')
    await loadGroups()
  } catch (e: any) {
    showToast(e.message || t('wms.settings.deleteFailed', '削除に失敗しました'), 'danger')
  }
}

const onDragEnd = async () => {
  try {
    const orderedIds = groups.value.map((g) => g._id)
    await reorderOrderGroups(orderedIds)
  } catch (e: any) {
    showToast(e.message || t('wms.settings.reorderFailed', '優先順位の更新に失敗しました'), 'danger')
    await loadGroups()
  }
}

onMounted(() => {
  loadGroups()
})
</script>

<style scoped>
.order-group-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}
:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}



.o-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.o-badge-info { background: #f4f4f5; color: #909399; }

.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.o-toggle-slider { width: 40px; height: 20px; background: var(--o-toggle-off, #c0c4cc); border-radius: 10px; transition: 0.2s; position: relative; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-brand-primary, #714b67); }
.o-toggle input:checked + .o-toggle-slider::after { left: 22px; }

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-state,
.empty-state {
  padding: 60px 0;
  text-align: center;
  color: var(--o-gray-500, #909399);
}

.group-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border: 1px solid var(--o-border-color, #e4e7ed);
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
  padding: 4px;
  flex-shrink: 0;
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
  color: var(--o-gray-700, #303133);
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
  color: var(--o-gray-500, #909399);
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
