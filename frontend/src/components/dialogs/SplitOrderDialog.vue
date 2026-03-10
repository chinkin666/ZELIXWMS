<template>
  <el-dialog
    v-model="visible"
    title="注文分割"
    width="900px"
    :close-on-click-modal="false"
    @closed="resetState"
  >
    <div class="split-dialog-content" v-if="order">
      <!-- ヘッダ情報 -->
      <div class="order-info">
        <p>元注文番号: <strong>{{ order.orderNumber }}</strong></p>
        <p>商品総数: <strong>{{ originalTotalQuantity }}</strong>個（{{ order.products?.length || 0 }}種類）</p>
      </div>

      <!-- 未割当プール -->
      <div v-if="unallocatedItems.length > 0" class="unallocated-pool">
        <div class="pool-header">
          <span class="pool-title">未割当商品</span>
        </div>
        <div class="pool-items">
          <div
            v-for="item in unallocatedItems"
            :key="item.originalIndex"
            class="unallocated-item"
          >
            <span class="product-name">{{ item.productName || item.inputSku }}</span>
            <span class="unallocated-qty">x{{ item.remainingQty }}</span>
            <el-button
              size="small"
              type="primary"
              plain
              @click="addUnallocatedToGroup(item)"
            >
              グループに追加
            </el-button>
          </div>
        </div>
      </div>

      <!-- 分割グループ表示エリア -->
      <div class="groups-container">
        <div
          v-for="(group, groupIdx) in groups"
          :key="group.id"
          class="group-card"
        >
          <div class="group-header">
            <span class="group-title">注文 {{ groupIdx + 1 }}</span>
            <span class="group-count">{{ groupProductCount(group) }}個</span>
            <el-button
              v-if="groups.length > 2"
              type="danger"
              :icon="Delete"
              size="small"
              circle
              plain
              @click="removeGroup(groupIdx)"
            />
          </div>
          <draggable
            v-model="group.products"
            :group="{ name: 'split-products' }"
            item-key="dragKey"
            ghost-class="drag-ghost"
            animation="200"
            class="group-products"
          >
            <template #item="{ element: item }">
              <div class="product-item">
                <el-icon class="drag-icon" :size="14"><Rank /></el-icon>
                <div class="product-info">
                  <span class="product-name" :title="item.productName || item.inputSku">{{ item.productName || item.inputSku }}</span>
                  <span class="product-sku">{{ item.inputSku }}</span>
                </div>
                <div class="product-qty-control">
                  <el-input-number
                    v-model="item.quantity"
                    :min="1"
                    :max="item.maxQuantity"
                    size="small"
                    controls-position="right"
                    @change="onQuantityChange"
                  />
                </div>
                <el-button
                  type="danger"
                  :icon="Close"
                  size="small"
                  circle
                  plain
                  @click="removeProductFromGroup(groupIdx, item)"
                />
              </div>
            </template>
          </draggable>
          <div v-if="group.products.length === 0" class="group-empty">
            商品をドラッグまたは追加してください
          </div>
        </div>

        <!-- グループ追加ボタン -->
        <div class="add-group-btn" @click="addGroup">
          <el-icon :size="24"><Plus /></el-icon>
          <span>グループ追加</span>
        </div>
      </div>

      <!-- バリデーションメッセージ -->
      <div v-if="validationError" class="validation-error">
        <el-alert :title="validationError" type="error" :closable="false" show-icon />
      </div>
    </div>

    <template #footer>
      <el-button @click="handleCancel">キャンセル</el-button>
      <el-button
        type="primary"
        :loading="loading"
        :disabled="!!validationError"
        @click="handleConfirm"
      >
        分割実行
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Delete, Close, Rank } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import type { OrderDocument } from '@/types/order'
import type { SplitOrderRequest } from '@/types/carrierAutomation'

interface SplitProductItem {
  dragKey: string
  originalIndex: number
  inputSku: string
  productName?: string
  imageUrl?: string
  quantity: number
  maxQuantity: number
}

interface SplitGroup {
  id: string
  products: SplitProductItem[]
}

const props = defineProps<{
  modelValue: boolean
  order: OrderDocument | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', splitGroups: SplitOrderRequest['splitGroups']): void
  (e: 'cancel'): void
}>()

const visible = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) initializeGroups()
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const groups = ref<SplitGroup[]>([])
let dragKeyCounter = 0

const originalTotalQuantity = computed(() => {
  if (!props.order?.products) return 0
  return props.order.products.reduce((sum, p) => sum + (p.quantity || 0), 0)
})

function createDragKey(): string {
  return `drag-${++dragKeyCounter}`
}

function initializeGroups() {
  if (!props.order?.products) return
  dragKeyCounter = 0

  // グループ1: 全商品を含む
  const group1Products: SplitProductItem[] = props.order.products.map((p, idx) => ({
    dragKey: createDragKey(),
    originalIndex: idx,
    inputSku: p.inputSku,
    productName: p.productName,
    imageUrl: p.imageUrl,
    quantity: p.quantity,
    maxQuantity: p.quantity,
  }))

  // グループ2: 空
  groups.value = [
    { id: 'group-1', products: group1Products },
    { id: 'group-2', products: [] },
  ]
}

// 各商品の全グループ合計数量を追跡
function getAllocatedQuantity(originalIndex: number): number {
  let total = 0
  for (const group of groups.value) {
    for (const item of group.products) {
      if (item.originalIndex === originalIndex) {
        total += item.quantity
      }
    }
  }
  return total
}

// 未割当商品の計算
const unallocatedItems = computed(() => {
  if (!props.order?.products) return []
  const result: Array<{ originalIndex: number; inputSku: string; productName?: string; imageUrl?: string; remainingQty: number }> = []
  for (let i = 0; i < props.order.products.length; i++) {
    const p = props.order.products[i]!
    const allocated = getAllocatedQuantity(i)
    const remaining = p.quantity - allocated
    if (remaining > 0) {
      result.push({
        originalIndex: i,
        inputSku: p.inputSku,
        productName: p.productName,
        imageUrl: p.imageUrl,
        remainingQty: remaining,
      })
    }
  }
  return result
})

function onQuantityChange() {
  // maxQuantity を再計算（他グループでの使用量を考慮）
  if (!props.order?.products) return
  for (const group of groups.value) {
    for (const item of group.products) {
      const originalQty = props.order.products[item.originalIndex]?.quantity || 0
      const otherAllocated = getAllocatedQuantity(item.originalIndex) - item.quantity
      item.maxQuantity = originalQty - otherAllocated
      // 現在値がmaxを超えている場合は補正
      if (item.quantity > item.maxQuantity) {
        item.quantity = item.maxQuantity
      }
    }
  }
}

function groupProductCount(group: SplitGroup): number {
  return group.products.reduce((sum, p) => sum + p.quantity, 0)
}

function addGroup() {
  const id = `group-${Date.now()}`
  groups.value.push({ id, products: [] })
}

function removeGroup(idx: number) {
  // 削除されるグループの商品を未割当に戻す（単にグループを削除する）
  groups.value.splice(idx, 1)
}

function removeProductFromGroup(groupIdx: number, item: SplitProductItem) {
  const group = groups.value[groupIdx]!
  const itemIdx = group.products.findIndex((p) => p.dragKey === item.dragKey)
  if (itemIdx >= 0) {
    group.products.splice(itemIdx, 1)
  }
}

function addUnallocatedToGroup(item: { originalIndex: number; inputSku: string; productName?: string; imageUrl?: string; remainingQty: number }) {
  // 最後のグループに追加（空グループがあればそちら）
  let targetGroup = groups.value.find((g) => g.products.length === 0)
  if (!targetGroup) {
    targetGroup = groups.value[groups.value.length - 1]
  }
  if (!targetGroup) return

  // 既に同じ商品がグループにある場合は数量を加算
  const existing = targetGroup.products.find((p) => p.originalIndex === item.originalIndex)
  if (existing) {
    existing.quantity += item.remainingQty
    existing.maxQuantity = existing.quantity
  } else {
    targetGroup.products.push({
      dragKey: createDragKey(),
      originalIndex: item.originalIndex,
      inputSku: item.inputSku,
      productName: item.productName,
      imageUrl: item.imageUrl,
      quantity: item.remainingQty,
      maxQuantity: item.remainingQty,
    })
  }
  onQuantityChange()
}

// バリデーション
const validationError = computed(() => {
  if (groups.value.length < 2) return '最低2つのグループが必要です'

  const emptyGroups = groups.value.filter((g) => g.products.length === 0)
  if (emptyGroups.length > 0) return '空のグループがあります。商品を配置するかグループを削除してください。'

  if (unallocatedItems.value.length > 0) return '未割当の商品があります。すべての商品をグループに割り当ててください。'

  // 過剰割当チェック
  if (!props.order?.products) return null
  for (let i = 0; i < props.order.products.length; i++) {
    const originalQty = props.order.products[i]!.quantity
    const allocated = getAllocatedQuantity(i)
    if (allocated > originalQty) {
      return `商品「${props.order.products[i]!.inputSku}」の割当数量(${allocated})が元数量(${originalQty})を超えています`
    }
  }

  return null
})

function handleConfirm() {
  if (validationError.value) return

  const splitGroups: SplitOrderRequest['splitGroups'] = groups.value.map((group) => ({
    products: group.products.map((item) => ({
      productIndex: item.originalIndex,
      quantity: item.quantity,
    })),
  }))

  emit('confirm', splitGroups)
}

function handleCancel() {
  visible.value = false
  emit('cancel')
}

function resetState() {
  groups.value = []
}
</script>

<style scoped>
.split-dialog-content {
  max-height: 60vh;
  overflow-y: auto;
}

.order-info {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.order-info p {
  margin: 4px 0;
}

.unallocated-pool {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: 4px;
}

.pool-header {
  margin-bottom: 8px;
}

.pool-title {
  font-weight: 600;
  color: var(--el-color-warning);
}

.pool-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.unallocated-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: white;
  border-radius: 4px;
}

.groups-container {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.group-card {
  flex: 1;
  min-width: 300px;
  max-width: 400px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 12px;
  background: var(--el-fill-color-blank);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.group-title {
  font-weight: 600;
  font-size: 14px;
}

.group-count {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-left: auto;
}

.group-products {
  min-height: 60px;
}

.group-empty {
  text-align: center;
  padding: 20px;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
  border: 2px dashed var(--el-border-color-lighter);
  border-radius: 4px;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  margin-bottom: 4px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
  cursor: grab;
}

.product-item:active {
  cursor: grabbing;
}

.drag-icon {
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.product-name {
  display: block;
  font-size: 12px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-sku {
  display: block;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-qty-control {
  flex-shrink: 0;
  width: 80px;
}

.product-qty-control :deep(.el-input-number) {
  width: 100%;
}

.add-group-btn {
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  transition: all 0.2s;
}

.add-group-btn:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.validation-error {
  margin-top: 12px;
}

.drag-ghost {
  opacity: 0.5;
  background: var(--el-color-primary-light-9);
}
</style>
