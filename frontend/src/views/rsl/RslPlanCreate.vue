<template>
  <div class="rsl-plan-create">
    <PageHeader :title="isEditMode ? 'RSLプラン編集' : 'RSLプラン作成'" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <Button variant="outline" size="sm" @click="$router.push('/rsl/plans')">戻る</Button>
        </div>
      </template>
    </PageHeader>

    <div class="form-container">
      <!-- 基本情報 / 基本信息 -->
      <div class="form-section">
        <h3 class="section-title">基本情報</h3>
        <div class="form-fields">
          <div class="o-field-row">
            <label class="o-field-label">配送先倉庫 <span class="text-destructive text-xs">*</span></label>
            <div class="o-field-value">
              <Select :model-value="form.destinationWarehouse || '__none__'" @update:model-value="(v: string) => { form.destinationWarehouse = v === '__none__' ? '' : v }" :disabled="isViewOnly">
                <SelectTrigger class="o-inline-input"><SelectValue placeholder="選択してください" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="wh in rslWarehouseList" :key="wh" :value="wh">
                    {{ wh }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="o-field-row">
            <label class="o-field-label">出荷予定日</label>
            <div class="o-field-value">
              <Input class="o-inline-input" type="date" :value="form.shipDate" @input="handleShipDateChange" :disabled="isViewOnly" />
            </div>
          </div>
          <div class="o-field-row">
            <label class="o-field-label">追跡番号</label>
            <div class="o-field-value">
              <Input class="o-inline-input" :value="form.trackingNumber" @input="handleTrackingChange" placeholder="追跡番号" :disabled="isViewOnly" />
            </div>
          </div>
          <div class="o-field-row">
            <label class="o-field-label">箱数</label>
            <div class="o-field-value">
              <Input class="o-inline-input" type="number" :value="form.boxCount" @input="handleBoxCountChange" placeholder="箱数" min="1" :disabled="isViewOnly" />
            </div>
          </div>
          <div class="o-field-row">
            <label class="o-field-label">メモ</label>
            <div class="o-field-value">
              <Input class="o-inline-input" :value="form.memo" @input="handleMemoChange" placeholder="メモ" :disabled="isViewOnly" />
            </div>
          </div>
        </div>
      </div>

      <!-- 商品選択 / 商品选择 -->
      <div class="form-section">
        <h3 class="section-title">商品一覧</h3>
        <div v-if="!isViewOnly" class="product-search">
          <Input
            class="o-inline-input"
            :value="productSearchText"
            @input="(e: Event) => productSearchText = (e.target as HTMLInputElement).value"
            placeholder="SKU / 商品名で検索してRSL対応商品を追加..."
          />
          <!-- 検索結果ドロップダウン / 搜索结果下拉 -->
          <div v-if="filteredProducts.length > 0 && productSearchText" class="product-dropdown">
            <div
              v-for="product in filteredProducts"
              :key="product._id"
              class="product-dropdown-item"
              @click="addProduct(product)"
            >
              <span class="product-sku">{{ product.sku }}</span>
              <span class="product-name">{{ product.name }}</span>
              <span v-if="product.rakutenSku" class="product-rakuten-sku">楽天SKU: {{ product.rakutenSku }}</span>
            </div>
          </div>
        </div>

        <Table v-if="form.items.length > 0">
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>楽天SKU</TableHead>
              <TableHead>商品名</TableHead>
              <TableHead style="width:120px;">数量</TableHead>
              <TableHead v-if="!isViewOnly" style="width:50px;"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(item, index) in form.items" :key="item.productId">
              <TableCell>{{ item.sku }}</TableCell>
              <TableCell>
                <Input
                  v-if="!isViewOnly"
                  class="o-inline-input"
                  :value="item.rakutenSku"
                  @input="(e: Event) => updateItem(index, 'rakutenSku', (e.target as HTMLInputElement).value)"
                  placeholder="楽天SKU"
                />
                <span v-else>{{ item.rakutenSku || '-' }}</span>
              </TableCell>
              <TableCell>{{ item.productName }}</TableCell>
              <TableCell>
                <Input
                  v-if="!isViewOnly"
                  class="o-inline-input"
                  type="number"
                  :value="item.quantity"
                  @input="(e: Event) => updateItem(index, 'quantity', Number((e.target as HTMLInputElement).value))"
                  min="1"
                />
                <span v-else>{{ item.quantity }}</span>
              </TableCell>
              <TableCell v-if="!isViewOnly" style="text-align:center;">
                <Button variant="destructive" @click="removeItem(index)" title="削除">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div v-else class="empty-items">
          商品が追加されていません。上の検索欄からRSL対応商品を追加してください。
        </div>
      </div>

      <!-- フッターアクション / 页脚操作 -->
      <div v-if="!isViewOnly" class="form-actions">
        <Button variant="outline" @click="$router.push('/rsl/plans')">キャンセル</Button>
        <div style="display:flex;gap:8px;">
          <Button variant="outline" :disabled="submitting" @click="handleSaveDraft">下書き保存</Button>
          <Button variant="default" :disabled="submitting" @click="handleSaveAndConfirm">保存して確定</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { createRslPlan, updateRslPlan, getRslPlan, confirmRslPlan } from '@/api/rsl'
import type { UpsertRslPlanDto } from '@/api/rsl'
import { fetchProducts } from '@/api/product'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Product } from '@/types/product'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const submitting = ref(false)

// 編集モード判定 / 编辑模式判定
const planId = computed(() => route.params.id as string | undefined)
const isEditMode = computed(() => !!planId.value)
const isViewOnly = ref(false)

// 楽天RSL倉庫一覧 / 乐天RSL仓库列表
const rslWarehouseList: ReadonlyArray<string> = [
  '市川FC',
  '八千代FC',
  '茨木FC',
  '小牧FC',
  '鳥栖FC',
]

// フォームデータ / 表单数据
interface FormItem {
  productId: string
  sku: string
  rakutenSku: string
  productName: string
  quantity: number
}

const form = reactive<{
  destinationWarehouse: string
  items: FormItem[]
  shipDate: string
  memo: string
  trackingNumber: string
  boxCount: number | undefined
}>({
  destinationWarehouse: '',
  items: [],
  shipDate: '',
  memo: '',
  trackingNumber: '',
  boxCount: undefined,
})

// 商品検索 / 商品搜索
const productSearchText = ref('')
const allRslProducts = ref<Product[]>([])

const filteredProducts = computed(() => {
  const query = productSearchText.value.toLowerCase().trim()
  if (!query) return []
  const addedIds = new Set(form.items.map(i => i.productId))
  return allRslProducts.value
    .filter(p => !addedIds.has(p._id))
    .filter(p =>
      p.sku.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query) ||
      (p.nameFull && p.nameFull.toLowerCase().includes(query))
    )
    .slice(0, 20)
})

// ── イベントハンドラー（イミュータブルパターン） / 事件处理器（不可变模式） ──

function handleWarehouseChange(e: Event) {
  form.destinationWarehouse = (e.target as HTMLSelectElement).value
}

function handleShipDateChange(e: Event) {
  form.shipDate = (e.target as HTMLInputElement).value
}

function handleTrackingChange(e: Event) {
  form.trackingNumber = (e.target as HTMLInputElement).value
}

function handleBoxCountChange(e: Event) {
  const v = (e.target as HTMLInputElement).value
  form.boxCount = v === '' ? undefined : Number(v)
}

function handleMemoChange(e: Event) {
  form.memo = (e.target as HTMLInputElement).value
}

// 商品追加 / 添加商品
function addProduct(product: Product) {
  const p = product as Product & { rakutenSku?: string }
  form.items = [
    ...form.items,
    {
      productId: product._id,
      sku: product.sku,
      rakutenSku: p.rakutenSku || '',
      productName: product.name,
      quantity: 1,
    },
  ]
  productSearchText.value = ''
}

// 商品行更新 / 更新商品行
function updateItem(index: number, field: keyof FormItem, value: string | number) {
  form.items = form.items.map((item, i) =>
    i === index ? { ...item, [field]: value } : item
  )
}

// 商品行削除 / 删除商品行
function removeItem(index: number) {
  form.items = form.items.filter((_, i) => i !== index)
}

// ── 保存処理 / 保存处理 ────────────────────────────────────────────────────

function buildPayload(): UpsertRslPlanDto {
  return {
    destinationWarehouse: form.destinationWarehouse,
    items: form.items.map(item => ({
      productId: item.productId,
      sku: item.sku,
      rakutenSku: item.rakutenSku || undefined,
      quantity: item.quantity,
    })),
    shipDate: form.shipDate || undefined,
    memo: form.memo || undefined,
    trackingNumber: form.trackingNumber || undefined,
    boxCount: form.boxCount,
  }
}

function validate(): boolean {
  if (!form.destinationWarehouse) {
    toast.showError('配送先倉庫を選択してください')
    return false
  }
  if (form.items.length === 0) {
    toast.showError('商品を1つ以上追加してください')
    return false
  }
  const invalidQty = form.items.some(item => !item.quantity || item.quantity < 1)
  if (invalidQty) {
    toast.showError('全ての商品の数量は1以上にしてください')
    return false
  }
  return true
}

async function handleSaveDraft() {
  if (!validate()) return
  submitting.value = true
  try {
    const payload = buildPayload()
    if (isEditMode.value && planId.value) {
      await updateRslPlan(planId.value, payload)
      toast.showSuccess('プランを更新しました')
    } else {
      await createRslPlan(payload)
      toast.showSuccess('プランを作成しました')
    }
    router.push('/rsl/plans')
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '保存に失敗しました'
    toast.showError(message)
  } finally {
    submitting.value = false
  }
}

async function handleSaveAndConfirm() {
  if (!validate()) return
  submitting.value = true
  try {
    const payload = buildPayload()
    let savedPlan
    if (isEditMode.value && planId.value) {
      savedPlan = await updateRslPlan(planId.value, payload)
    } else {
      savedPlan = await createRslPlan(payload)
    }
    await confirmRslPlan(savedPlan._id)
    toast.showSuccess('プランを保存して確定しました')
    router.push('/rsl/plans')
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '保存・確定に失敗しました'
    toast.showError(message)
  } finally {
    submitting.value = false
  }
}

// ── 初期化 / 初始化 ────────────────────────────────────────────────────────

async function loadRslProducts() {
  try {
    // RSL対応商品を取得（rslEnabled=true でフィルタ）/ 获取RSL对应商品
    const products = await fetchProducts({ rslEnabled: true } as Record<string, any>)
    allRslProducts.value = products
  } catch {
    // RSL対応商品がない場合は全商品を表示 / 没有RSL商品时显示全部商品
    try {
      const products = await fetchProducts()
      allRslProducts.value = products
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '商品の取得に失敗しました'
      toast.showError(message)
    }
  }
}

async function loadExistingPlan() {
  if (!planId.value) return
  try {
    const plan = await getRslPlan(planId.value)
    form.destinationWarehouse = plan.destinationWarehouse
    form.shipDate = plan.shipDate || ''
    form.memo = plan.memo || ''
    form.trackingNumber = plan.trackingNumber || ''
    form.boxCount = plan.boxCount
    form.items = plan.items.map(item => ({
      productId: item.productId,
      sku: item.sku,
      rakutenSku: item.rakutenSku || '',
      productName: item.sku, // プラン側に商品名がないためSKUで代替 / 计划侧没有商品名用SKU代替
      quantity: item.quantity,
    }))
    // 下書き以外は閲覧のみ / 非草稿状态仅查看
    if (plan.status !== 'draft') {
      isViewOnly.value = true
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'プランの取得に失敗しました'
    toast.showError(message)
    router.push('/rsl/plans')
  }
}

onMounted(async () => {
  await loadRslProducts()
  if (isEditMode.value) {
    await loadExistingPlan()
  }
})
</script>

<style scoped>
.rsl-plan-create {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  background: var(--o-view-background, #fff);
  overflow: hidden;
}

.section-title {
  padding: 12px 16px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  background: var(--o-gray-100, #f5f7fa);
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
}

.form-fields {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 600px;
}

.o-field-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.o-field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-600, #606266);
  width: 140px;
  min-width: 140px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.o-field-value {
  flex: 1;
  min-width: 0;
}

.o-inline-input {
  width: 100%;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 13px;
  color: var(--o-gray-900, #212529);
  background: var(--o-view-background, #fff);
  outline: none;
}

.o-inline-input:focus {
  border-color: var(--o-brand-primary, #0052A3);
  box-shadow: 0 0 0 2px rgba(113, 75, 103, 0.12);
}

.o-inline-input:disabled {
  background: var(--o-gray-100, #f8f9fa);
  color: var(--o-gray-500, #909399);
}

select.o-inline-input { cursor: pointer; }

.required-badge {
  display: inline-block;
  background: #dc3545;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
}

/* 商品検索 / 商品搜索 */
.product-search {
  padding: 12px 16px;
  position: relative;
}

.product-dropdown {
  position: absolute;
  left: 16px;
  right: 16px;
  top: 100%;
  background: #fff;
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
}

.product-dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  border-bottom: 1px solid var(--o-gray-200, #f0f0f0);
}

.product-dropdown-item:hover {
  background: var(--o-gray-50, #f5f7fa);
}

.product-sku {
  font-family: monospace;
  font-weight: 600;
  color: var(--o-brand-primary, #714b67);
  min-width: 100px;
}

.product-name {
  color: var(--o-gray-700, #303133);
  flex: 1;
}

.product-rakuten-sku {
  color: var(--o-gray-500, #909399);
  font-size: 12px;
}

/* 商品テーブル / 商品表格 */
.o-lines-table {
  width: 100%;
  border-collapse: collapse;
}

.o-lines-table th {
  padding: 0.5rem 0.625rem;
  font-size: 12px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
  border-bottom: 2px solid var(--o-border-color, #d6d6d6);
  text-align: left;
}

.o-lines-table td {
  padding: 0.375rem 0.5rem;
  border-bottom: 1px solid var(--o-gray-200, #e5e5e5);
  font-size: 13px;
}

.o-lines-table tbody tr:hover {
  background: var(--o-gray-50, #f8f9fa);
}

.empty-items {
  padding: 32px 16px;
  text-align: center;
  color: var(--o-gray-500, #909399);
  font-size: 13px;
}

/* フッター / 页脚 */
.form-actions {
  display: flex;
  justify-content: space-between;
  padding: 16px 0;
}
</style>
