<script setup lang="ts">
import { Input } from '@/components/ui/input'
/**
 * FBA箱管理ページ / FBA箱管理页面
 */
import { ref, onMounted } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const route = useRoute()
const router = useRouter()
const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()
const { showSuccess, showError } = useToast()

const orderId = route.params.orderId as string
const boxes = ref<any[]>([])
const validation = ref<any>(null)
const loading = ref(false)

// 新規箱フォーム / 新建箱表单
const showAddDialog = ref(false)
const addForm = ref({
  items: [{ sku: '', fnsku: '', quantity: 0, productId: '000000000000000000000000' }],
  weight: 0,
  length: 0,
  width: 0,
  height: 0,
  destinationFc: '',
})

async function loadBoxes() {
  loading.value = true
  try {
    const [boxRes, valRes] = await Promise.all([
      fetch(`${baseUrl}/fba-boxes?inboundOrderId=${orderId}`, { headers: { Authorization: `Bearer ${userStore.token}` } }),
      fetch(`${baseUrl}/fba-boxes/validate/${orderId}`, { headers: { Authorization: `Bearer ${userStore.token}` } }),
    ])
    const boxData = await boxRes.json()
    boxes.value = boxData.data || []
    validation.value = await valRes.json()
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function createBox() {
  try {
    const res = await fetch(`${baseUrl}/fba-boxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userStore.token}` },
      body: JSON.stringify({ ...addForm.value, inboundOrderId: orderId }),
    })
    if (res.ok) {
      showSuccess('箱を作成しました / 箱已创建')
      showAddDialog.value = false
      addForm.value = { items: [{ sku: '', fnsku: '', quantity: 0, productId: '000000000000000000000000' }], weight: 0, length: 0, width: 0, height: 0, destinationFc: '' }
      await loadBoxes()
    }
  } catch (e: any) { showError(e.message) }
}

async function sealBox(boxId: string) {
  try {
    await fetch(`${baseUrl}/fba-boxes/${boxId}/seal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userStore.token}` },
      body: JSON.stringify({ sealedBy: userStore.currentUser?.displayName }),
    })
    showSuccess('封箱完了')
    await loadBoxes()
  } catch (e: any) { showError(e.message) }
}

async function deleteBox(boxId: string) {
  try {
    await fetch(`${baseUrl}/fba-boxes/${boxId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userStore.token}` },
    })
    await loadBoxes()
  } catch (e: any) { showError(e.message) }
}

function getValidation(boxNumber: string) {
  return validation.value?.results?.find((r: any) => r.boxNumber === boxNumber)
}

onMounted(loadBoxes)
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-3 p-4">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>
    <template v-else>
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px">
        <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent" @click="router.back()">戻る</Button>
        <h2 style="margin: 0">FBA箱管理</h2>
        <div style="flex: 1" />
        <span v-if="validation" :class="validation.allValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">
          {{ validation.allValid ? '全箱検証OK' : '検証エラーあり' }} ({{ validation.totalBoxes }}箱)
        </span>
        <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90" @click="showAddDialog = true">+ 箱追加</Button>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div v-for="box in boxes" :key="box._id" class="rounded-lg border bg-card shadow-sm p-4" style="margin-bottom: 12px">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
            <span style="font-weight: bold; font-size: 16px">{{ box.boxNumber }}</span>
            <span :class="box.status === 'sealed' ? 'bg-green-100 text-green-800' : box.status === 'labeled' ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-muted-foreground'" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">
              {{ box.status }}
            </span>
          </div>

          <!-- 箱内容 / 箱内容 -->
          <div v-for="item in box.items" :key="item.sku" style="font-size: 12px; color: #606266">
            {{ item.sku }} ({{ item.fnsku }}) × {{ item.quantity }}
          </div>

          <!-- 物理属性 / 物理属性 -->
          <div style="font-size: 12px; color: #909399; margin-top: 8px">
            {{ box.weight || '--' }}kg | {{ box.length || '--' }}×{{ box.width || '--' }}×{{ box.height || '--' }}cm
          </div>

          <!-- 検証結果 / 校验结果 -->
          <div v-if="getValidation(box.boxNumber)" style="margin-top: 8px">
            <span v-if="getValidation(box.boxNumber).valid" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">規格OK</span>
            <div v-else>
              <span v-for="(err, i) in getValidation(box.boxNumber).errors" :key="i" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" style="margin: 2px">
                {{ err }}
              </span>
            </div>
          </div>

          <!-- 操作 / 操作 -->
          <div style="display: flex; gap: 4px; margin-top: 8px">
            <Button v-if="box.status === 'packing'" class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-green-600 text-white hover:bg-green-700" @click="sealBox(box._id)">封箱</Button>
            <Button v-if="box.status === 'packing'" class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="deleteBox(box._id)">削除</Button>
          </div>
        </div>
      </div>

      <div v-if="!loading && boxes.length === 0" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>箱がありません / 暂无箱</p>
      </div>

      <!-- 新規箱ダイアログ / 新建箱对话框 -->
      <Dialog :open="showAddDialog" @update:open="showAddDialog = $event">
        <DialogContent class="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>箱追加 / 添加箱</DialogTitle>
          </DialogHeader>
          <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <label class="text-right text-sm">SKU</label>
              <Input v-model="addForm.items[0]!.sku" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label class="text-right text-sm">FNSKU</label>
              <Input v-model="addForm.items[0]!.fnsku" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label class="text-right text-sm">数量</label>
              <Input v-model.number="addForm.items[0]!.quantity" type="number" min="1" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label class="text-right text-sm">重量(kg)</label>
              <Input v-model.number="addForm.weight" type="number" min="0" step="0.1" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label class="text-right text-sm">長さ(cm)</label>
              <Input v-model.number="addForm.length" type="number" min="0" step="0.1" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label class="text-right text-sm">幅(cm)</label>
              <Input v-model.number="addForm.width" type="number" min="0" step="0.1" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label class="text-right text-sm">高さ(cm)</label>
              <Input v-model.number="addForm.height" type="number" min="0" step="0.1" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label class="text-right text-sm">目的FC</label>
              <Input v-model="addForm.destinationFc" placeholder="NRT5" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent" @click="showAddDialog = false">キャンセル</Button>
            <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90" @click="createBox">作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </template>
  </div>
</template>
