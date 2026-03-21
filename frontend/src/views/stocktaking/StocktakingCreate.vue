<template>
  <div class="stocktaking-create">
    <ControlPanel :title="t('wms.stocktaking.create', '棚卸作成')" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" @click="$router.back()">{{ t('wms.stocktaking.back', '戻る') }}</OButton>
      </template>
    </ControlPanel>

    <div class="form-card o-card">
      <div class="form-row">
        <label class="form-label">{{ t('wms.stocktaking.warehouse', '倉庫') }} <span style="color: #f56c6c">*</span></label>
        <select v-model="form.warehouseId" class="o-input" style="width:200px;">
          <option value="">{{ t('wms.stocktaking.selectWarehousePlaceholder', '-- 倉庫を選択 / 选择仓库 --') }}</option>
          <option v-for="wh in warehouses" :key="wh._id" :value="wh._id">{{ wh.code }} - {{ wh.name }}</option>
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">{{ t('wms.stocktaking.type', '棚卸タイプ') }}</label>
        <select v-model="form.type" class="o-input" style="width:200px;">
          <option value="full">{{ t('wms.stocktaking.typeFull', '全棚卸') }}</option>
          <option value="cycle">{{ t('wms.stocktaking.typeCycle', '循環棚卸') }}</option>
          <option value="spot">{{ t('wms.stocktaking.typeSpot', 'スポット棚卸') }}</option>
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">{{ t('wms.stocktaking.scheduledDate', '予定日') }}</label>
        <input v-model="form.scheduledDate" type="date" class="o-input" style="width:200px;" />
      </div>

      <div class="form-row">
        <label class="form-label">{{ t('wms.stocktaking.targetLocations', '対象ロケーション') }}</label>
        <div class="tag-select">
          <select class="o-input" style="width:200px;" @change="addLocation($event)">
            <option value="">{{ t('wms.stocktaking.selectLocationPlaceholder', '-- 選択（空=全て） --') }}</option>
            <option v-for="loc in locations" :key="loc._id" :value="loc._id" :disabled="form.targetLocations.includes(loc._id)">
              {{ loc.code }} - {{ loc.name }}
            </option>
          </select>
          <div class="tags">
            <span v-for="id in form.targetLocations" :key="id" class="tag">
              {{ locationName(id) }}
              <button class="tag-remove" @click="form.targetLocations = form.targetLocations.filter(x => x !== id)">&times;</button>
            </span>
          </div>
        </div>
      </div>

      <div class="form-row">
        <label class="form-label">{{ t('wms.stocktaking.memo', 'メモ') }}</label>
        <textarea v-model="form.memo" class="o-input" rows="2" style="width:100%;max-width:500px;" />
      </div>

      <div class="form-actions">
        <OButton variant="primary" :disabled="isSubmitting" @click="handleCreate">
          {{ isSubmitting ? t('wms.stocktaking.creating', '作成中...') : t('wms.common.create', '作成') }}
        </OButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { ElMessage } from 'element-plus'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { createStocktakingOrder } from '@/api/stocktakingOrder'
import { fetchWarehouses } from '@/api/warehouse'
import type { Warehouse } from '@/api/warehouse'
import { http } from '@/api/http'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const isSubmitting = ref(false)

const form = reactive({
  warehouseId: '',
  type: 'spot' as 'full' | 'cycle' | 'spot',
  scheduledDate: '',
  targetLocations: [] as string[],
  memo: '',
})

const warehouses = ref<Warehouse[]>([])

const locations = ref<Array<{ _id: string; code: string; name: string }>>([])

const loadWarehouses = async () => {
  try {
    const res = await fetchWarehouses({ isActive: 'true' })
    warehouses.value = res.data || []
  } catch { /* ignore */ }
}

const loadLocations = async () => {
  try {
    const data = await http.get<any>('/locations')
    locations.value = (Array.isArray(data) ? data : data.data || []).filter(
      (l: any) => !l.type?.startsWith('virtual/')
    )
  } catch { /* ignore */ }
}

const locationName = (id: string) => {
  const loc = locations.value.find(l => l._id === id)
  return loc ? `${loc.code}` : id
}

const addLocation = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  if (val && !form.targetLocations.includes(val)) {
    form.targetLocations.push(val)
  }
  ;(e.target as HTMLSelectElement).value = ''
}

const handleCreate = async () => {
  // バリデーション / 表单验证
  if (!form.warehouseId) {
    ElMessage.warning('倉庫を選択してください / 请选择仓库')
    return
  }
  isSubmitting.value = true
  try {
    const result = await createStocktakingOrder({
      warehouseId: form.warehouseId,
      type: form.type,
      targetLocations: form.targetLocations.length > 0 ? form.targetLocations : undefined,
      scheduledDate: form.scheduledDate || undefined,
      memo: form.memo || undefined,
    })
    toast.showSuccess(t('wms.stocktaking.createSuccess', `棚卸 ${result.orderNumber} を作成しました（明細 ${result.lines.length} 件）`))
    router.push(`/stocktaking/${result._id}`)
  } catch (e: any) {
    toast.showError(e?.message || t('wms.stocktaking.createFailed', '作成に失敗しました'))
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  loadWarehouses()
  loadLocations()
})
</script>

<style scoped>
.stocktaking-create { display: flex; flex-direction: column; gap: 16px; padding: 0 20px 20px; }
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.form-card { max-width: 700px; padding: 1.5rem; }
.form-row { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 4px; }
.form-label { font-weight: 600; font-size: 13px; color: var(--o-gray-700); }
.form-actions { margin-top: 1.5rem; }
.tag-select { display: flex; flex-direction: column; gap: 6px; }
.tags { display: flex; flex-wrap: wrap; gap: 4px; }
.tag {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--o-gray-100, #f5f7fa); padding: 2px 8px; border-radius: 4px; font-size: 12px;
}
.tag-remove { background: none; border: none; cursor: pointer; color: #f56c6c; font-size: 14px; padding: 0 2px; }
.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
}
</style>
