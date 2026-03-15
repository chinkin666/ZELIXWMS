<template>
  <div class="order-group-settings">
    <ControlPanel :title="t('wms.settings.orderGroupSettings', '出荷グループ設定')" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">{{ t('wms.settings.addGroup', 'グループを追加') }}</OButton>
      </template>
    </ControlPanel>

    <div class="groups-list">
      <div v-if="isLoading" class="loading-state">{{ t('wms.settings.loading', '読み込み中...') }}</div>

      <div v-else-if="groups.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" style="opacity:0.2">
          <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
        </svg>
        <p>出荷グループがまだ作成されていません</p>
        <p class="empty-hint">グループを作成して出荷指示を分類できます（例: VIP、通常、冷凍品）</p>
        <OButton variant="primary" @click="openCreate" style="margin-top:12px">最初のグループを作成</OButton>
      </div>

      <draggable
        v-else
        v-model="groups"
        item-key="_id"
        handle=".drag-handle"
        ghost-class="drag-ghost"
        @end="onDragEnd"
      >
        <template #item="{ element: group, index }">
          <div
            class="group-card"
            :class="{ disabled: !group.enabled }"
          >
            <div class="drag-handle" :title="'ドラッグで並び替え'">
              <span class="drag-icon">&#x2630;</span>
            </div>

            <div class="group-rank">{{ index + 1 }}</div>

            <div class="group-info">
              <div class="group-name">
                {{ group.name }}
                <span v-if="!group.enabled" class="group-badge group-badge--off">無効</span>
              </div>
              <div class="group-meta">
                <span class="group-id">{{ group.orderGroupId }}</span>
                <span v-if="group.description" class="group-description">— {{ group.description }}</span>
              </div>
              <div class="group-stats" v-if="groupOrderCounts[group.orderGroupId] !== undefined">
                <span>{{ groupOrderCounts[group.orderGroupId] }}件の注文</span>
              </div>
            </div>

            <div class="group-actions">
              <label class="o-toggle" :title="group.enabled ? '無効にする' : '有効にする'">
                <input
                  type="checkbox"
                  :checked="group.enabled"
                  @change="handleEnableChange(group, ($event.target as HTMLInputElement).checked)"
                />
                <span class="o-toggle-slider"></span>
              </label>
              <OButton variant="secondary" size="sm" @click="openEdit(group)">編集</OButton>
              <button class="delete-icon-btn" @click="confirmDelete(group)" title="削除">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5.5l1-1h3l1 1H14a1 1 0 0 1 1 1v1z"/></svg>
              </button>
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
const groupOrderCounts = ref<Record<string, number>>({})

const loadGroups = async () => {
  isLoading.value = true
  try {
    groups.value = await fetchOrderGroups()
    // 各グループの注文数を取得 / 各グループの注文数を取得
    loadGroupCounts()
  } catch (e: any) {
    showToast(e.message || t('wms.settings.fetchGroupsFailed', '出荷グループの取得に失敗しました'), 'danger')
  } finally {
    isLoading.value = false
  }
}

async function loadGroupCounts() {
  try {
    const { http } = await import('@/api/http')
    const data = await http.get<Array<{ _id: string; count: number }>>('/shipment-orders/group-counts')
    const counts: Record<string, number> = {}
    for (const item of data) {
      if (item._id) counts[item._id] = item.count
    }
    groupOrderCounts.value = counts
  } catch {
    // 失敗してもUIに影響なし / 失敗してもUIに影響なし
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
      showToast(t('wms.settings.groupUpdated', '出荷グループを更新しました'), 'success')
    } else {
      await createOrderGroup(data)
      showToast(t('wms.settings.groupCreated', '出荷グループを作成しました'), 'success')
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
  if (!confirm(t('wms.settings.confirmDeleteGroup', `出荷グループ「${group.name}」を削除しますか？このグループに属する注文のグループ設定もクリアされます。`))) return
  try {
    await deleteOrderGroup(group._id)
    showToast(t('wms.settings.groupDeleted', '出荷グループを削除しました'), 'success')
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

.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.o-toggle-slider { width: 40px; height: 20px; background: var(--o-toggle-off, #c0c4cc); border-radius: 10px; transition: 0.2s; position: relative; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-brand-primary, #0052A3); }
.o-toggle input:checked + .o-toggle-slider::after { left: 22px; }

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-state {
  padding: 60px 0;
  text-align: center;
  color: var(--o-gray-500, #909399);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 20px;
  text-align: center;
  color: var(--o-gray-400, #c0c4cc);
}
.empty-state p { margin: 0; }
.empty-hint { font-size: 13px; color: var(--o-gray-400); }

.group-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--o-view-background, #fff);
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
.drag-icon { font-size: 18px; color: var(--o-gray-400, #c0c4cc); }
.drag-handle:active { cursor: grabbing; }
.drag-handle:active .drag-icon { color: var(--o-brand-primary); }

.group-rank {
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  background: var(--o-gray-100, #f5f7fa);
  color: var(--o-gray-500);
  font-size: 12px; font-weight: 700;
  flex-shrink: 0;
}

.drag-ghost {
  opacity: 0.4;
  background: var(--o-brand-lighter, #FAF0EA);
  border: 1px dashed var(--o-brand-primary, #0052A3);
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

.group-badge {
  display: inline-block;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
}
.group-badge--off { background: var(--o-gray-200); color: var(--o-gray-500); }

.group-stats {
  margin-top: 2px;
  font-size: 12px;
  color: var(--o-brand-primary, #0052A3);
  font-weight: 500;
}

.delete-icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  border: none; background: none;
  color: var(--o-gray-400);
  cursor: pointer;
  transition: color 0.15s;
}
.delete-icon-btn:hover { color: var(--o-danger, #C0392B); }

.group-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
