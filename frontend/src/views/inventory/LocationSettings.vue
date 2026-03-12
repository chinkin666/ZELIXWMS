<template>
  <div class="location-settings">
    <ControlPanel title="ロケーション管理" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" :disabled="isSeeding" @click="handleSeed">
            {{ isSeeding ? '作成中...' : '初期データ作成' }}
          </OButton>
          <OButton variant="primary" size="sm" @click="openCreateDialog">
            新規作成
          </OButton>
        </div>
      </template>
    </ControlPanel>

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:160px;">コード</th>
            <th class="o-table-th" style="width:160px;">名称</th>
            <th class="o-table-th" style="width:100px;">タイプ</th>
            <th class="o-table-th" style="width:250px;">フルパス</th>
            <th class="o-table-th" style="width:80px;">温度帯</th>
            <th class="o-table-th" style="width:60px;">有効</th>
            <th class="o-table-th" style="width:60px;">順序</th>
            <th class="o-table-th" style="width:200px;">メモ</th>
            <th class="o-table-th" style="width:120px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="9" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="locations.length === 0">
            <td colspan="9" class="o-table-empty">ロケーションがありません。「初期データ作成」を実行してください。</td>
          </tr>
          <tr v-for="loc in locations" :key="loc._id" class="o-table-row">
            <td class="o-table-td">
              <span class="location-code" :style="{ paddingLeft: getIndent(loc) + 'px' }">
                {{ loc.code }}
              </span>
            </td>
            <td class="o-table-td">{{ loc.name }}</td>
            <td class="o-table-td">
              <span class="type-badge" :class="'type--' + loc.type.replace('/', '-')">{{ typeLabel(loc.type) }}</span>
            </td>
            <td class="o-table-td text-muted">{{ loc.fullPath }}</td>
            <td class="o-table-td">
              <span v-if="loc.coolType === '1'" style="color:#409eff;">冷凍</span>
              <span v-else-if="loc.coolType === '2'" style="color:#67c23a;">冷蔵</span>
              <span v-else>-</span>
            </td>
            <td class="o-table-td">
              <span :style="{ color: loc.isActive ? '#67c23a' : '#f56c6c' }">{{ loc.isActive ? '有効' : '無効' }}</span>
            </td>
            <td class="o-table-td" style="text-align:right;">{{ loc.sortOrder }}</td>
            <td class="o-table-td">{{ loc.memo || '-' }}</td>
            <td class="o-table-td o-table-td--actions">
              <div style="display:inline-flex;gap:4px;">
                <OButton variant="primary" size="sm" @click="openEditDialog(loc)">編集</OButton>
                <OButton
                  variant="secondary" size="sm"
                  style="border-color:#f56c6c;color:#f56c6c;"
                  :disabled="loc.type.startsWith('virtual/')"
                  @click="handleDelete(loc)"
                >
                  削除
                </OButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogVisible" :title="editingId ? 'ロケーション編集' : 'ロケーション新規作成'" size="md">
      <div class="dialog-form">
        <div class="form-field">
          <label class="form-label">コード <span class="required">*</span></label>
          <input v-model="dialogForm.code" type="text" class="o-input" placeholder="例: WH-MAIN/A-01" />
        </div>
        <div class="form-field">
          <label class="form-label">名称 <span class="required">*</span></label>
          <input v-model="dialogForm.name" type="text" class="o-input" placeholder="例: A棟 1列" />
        </div>
        <div class="form-field">
          <label class="form-label">タイプ <span class="required">*</span></label>
          <select v-model="dialogForm.type" class="o-input">
            <option value="warehouse">倉庫</option>
            <option value="zone">ゾーン</option>
            <option value="shelf">棚</option>
            <option value="bin">区画</option>
            <option value="staging">出荷準備</option>
            <option value="receiving">入庫検品</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">親ロケーション</label>
          <select v-model="dialogForm.parentId" class="o-input">
            <option value="">なし（最上位）</option>
            <option v-for="loc in parentCandidates" :key="loc._id" :value="loc._id">
              {{ loc.code }} ({{ loc.name }})
            </option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">温度帯</label>
          <select v-model="dialogForm.coolType" class="o-input">
            <option value="">指定なし</option>
            <option value="0">常温</option>
            <option value="1">冷凍</option>
            <option value="2">冷蔵</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">表示順</label>
          <input v-model.number="dialogForm.sortOrder" type="number" class="o-input" />
        </div>
        <div class="form-field" style="grid-column:1/-1;">
          <label class="form-label">メモ</label>
          <input v-model="dialogForm.memo" type="text" class="o-input" />
        </div>
      </div>
      <template #footer>
        <OButton variant="secondary" @click="dialogVisible = false">キャンセル</OButton>
        <OButton variant="primary" :disabled="!canSaveDialog || isSaving" @click="handleSaveDialog">
          {{ isSaving ? '保存中...' : '保存' }}
        </OButton>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation as apiDeleteLocation,
  seedLocations,
} from '@/api/location'
import type { Location } from '@/types/inventory'

const toast = useToast()
const isLoading = ref(false)
const isSeeding = ref(false)
const isSaving = ref(false)
const locations = ref<Location[]>([])

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const dialogForm = ref({
  code: '',
  name: '',
  type: 'shelf' as string,
  parentId: '',
  coolType: '',
  sortOrder: 0,
  memo: '',
})

const parentCandidates = computed(() =>
  locations.value.filter(l =>
    !l.type.startsWith('virtual/') && l._id !== editingId.value,
  ),
)

const canSaveDialog = computed(() =>
  dialogForm.value.code.trim() && dialogForm.value.name.trim() && dialogForm.value.type,
)

const typeLabel = (t: string) => {
  const map: Record<string, string> = {
    warehouse: '倉庫',
    zone: 'ゾーン',
    shelf: '棚',
    bin: '区画',
    staging: '出荷準備',
    receiving: '入庫検品',
    'virtual/supplier': '仮想:仕入先',
    'virtual/customer': '仮想:顧客',
  }
  return map[t] || t
}

const getIndent = (loc: Location) => {
  return loc.parentId ? 20 : 0
}

const loadLocations = async () => {
  isLoading.value = true
  try {
    locations.value = await fetchLocations()
  } catch (e: any) {
    toast.showError(e?.message || 'ロケーションの取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

const handleSeed = async () => {
  isSeeding.value = true
  try {
    const result = await seedLocations()
    toast.showSuccess(result.message)
    await loadLocations()
  } catch (e: any) {
    toast.showError(e?.message || '初期データ作成に失敗しました')
  } finally {
    isSeeding.value = false
  }
}

const openCreateDialog = () => {
  editingId.value = null
  dialogForm.value = { code: '', name: '', type: 'shelf', parentId: '', coolType: '', sortOrder: 0, memo: '' }
  dialogVisible.value = true
}

const openEditDialog = (loc: Location) => {
  editingId.value = loc._id
  dialogForm.value = {
    code: loc.code,
    name: loc.name,
    type: loc.type,
    parentId: loc.parentId || '',
    coolType: loc.coolType || '',
    sortOrder: loc.sortOrder,
    memo: loc.memo || '',
  }
  dialogVisible.value = true
}

const handleSaveDialog = async () => {
  if (!canSaveDialog.value) return
  isSaving.value = true
  try {
    const data = {
      code: dialogForm.value.code.trim(),
      name: dialogForm.value.name.trim(),
      type: dialogForm.value.type,
      parentId: dialogForm.value.parentId || undefined,
      coolType: dialogForm.value.coolType || undefined,
      sortOrder: dialogForm.value.sortOrder,
      memo: dialogForm.value.memo || undefined,
    }

    if (editingId.value) {
      await updateLocation(editingId.value, data as any)
      toast.showSuccess('ロケーションを更新しました')
    } else {
      await createLocation(data as any)
      toast.showSuccess('ロケーションを作成しました')
    }

    dialogVisible.value = false
    await loadLocations()
  } catch (e: any) {
    toast.showError(e?.message || '保存に失敗しました')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (loc: Location) => {
  if (!confirm(`ロケーション "${loc.code}" を削除しますか？`)) return
  try {
    await apiDeleteLocation(loc._id)
    toast.showSuccess('ロケーションを削除しました')
    await loadLocations()
  } catch (e: any) {
    toast.showError(e?.message || '削除に失敗しました')
  }
}

onMounted(() => loadLocations())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.location-settings {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.location-code {
  font-family: monospace;
  font-weight: 600;
  color: var(--o-brand-primary, #714b67);
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
  background: var(--o-gray-100, #f5f7fa);
  color: var(--o-gray-600, #606266);
}

.type--warehouse { background: #d9ecff; color: #409eff; }
.type--zone { background: #e1f3d8; color: #67c23a; }
.type--shelf { background: #fdf6ec; color: #e6a23c; }
.type--bin { background: #f4f4f5; color: #909399; }
.type--staging { background: #fef0f0; color: #f56c6c; }
.type--receiving { background: #ecf5ff; color: #409eff; }
.type--virtual-supplier { background: #f4f4f5; color: #909399; font-style: italic; }
.type--virtual-customer { background: #f4f4f5; color: #909399; font-style: italic; }

.text-muted { color: var(--o-gray-500, #909399); font-size: 12px; }

.dialog-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
}

.required { color: #f56c6c; }

.o-input {
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 14px;
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
  width: 100%;
}
</style>
