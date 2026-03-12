<template>
  <div class="stocktaking-create">
    <ControlPanel title="棚卸作成" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" @click="$router.back()">戻る</OButton>
      </template>
    </ControlPanel>

    <div class="form-card o-card">
      <div class="form-row">
        <label class="form-label">棚卸タイプ</label>
        <select v-model="form.type" class="o-input" style="width:200px;">
          <option value="full">全棚卸</option>
          <option value="cycle">循環棚卸</option>
          <option value="spot">スポット棚卸</option>
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">予定日</label>
        <input v-model="form.scheduledDate" type="date" class="o-input" style="width:200px;" />
      </div>

      <div class="form-row">
        <label class="form-label">対象ロケーション</label>
        <div class="tag-select">
          <select class="o-input" style="width:200px;" @change="addLocation($event)">
            <option value="">-- 選択（空=全て） --</option>
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
        <label class="form-label">メモ</label>
        <textarea v-model="form.memo" class="o-input" rows="2" style="width:100%;max-width:500px;" />
      </div>

      <div class="form-actions">
        <OButton variant="primary" :disabled="isSubmitting" @click="handleCreate">
          {{ isSubmitting ? '作成中...' : '作成' }}
        </OButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { createStocktakingOrder } from '@/api/stocktakingOrder'
import { getApiBaseUrl } from '@/api/base'

const router = useRouter()
const toast = useToast()
const isSubmitting = ref(false)

const form = reactive({
  type: 'spot' as 'full' | 'cycle' | 'spot',
  scheduledDate: '',
  targetLocations: [] as string[],
  memo: '',
})

const locations = ref<Array<{ _id: string; code: string; name: string }>>([])

const loadLocations = async () => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/locations`)
    if (res.ok) {
      const data = await res.json()
      locations.value = (Array.isArray(data) ? data : data.data || []).filter(
        (l: any) => !l.type?.startsWith('virtual/')
      )
    }
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
  isSubmitting.value = true
  try {
    const result = await createStocktakingOrder({
      type: form.type,
      targetLocations: form.targetLocations.length > 0 ? form.targetLocations : undefined,
      scheduledDate: form.scheduledDate || undefined,
      memo: form.memo || undefined,
    })
    toast.showSuccess(`棚卸 ${result.orderNumber} を作成しました（明細 ${result.lines.length} 件）`)
    router.push(`/stocktaking/${result._id}`)
  } catch (e: any) {
    toast.showError(e?.message || '作成に失敗しました')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => loadLocations())
</script>

<style scoped>
.stocktaking-create { padding: 1rem; }
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
