<template>
  <Dialog :open="visibleProxy" @update:open="visibleProxy = $event">
    <DialogContent class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>商品情報の自動補完 / 送り状種類の自動設定</DialogTitle>
      </DialogHeader>
    <div class="meta">
      対象：<strong>{{ selectedCount }}</strong> 件（左側チェックで選択した行のみ）
    </div>

    <hr style="border: none; border-top: 1px solid #dcdfe6; margin: 16px 0" />

    <div class="o-form-group">
      <label class="o-form-label">商品マスタから商品名上書き</label>
      <div class="row">
        <label class="o-toggle">
          <input type="checkbox" v-model="overwriteProductName" />
          <span class="o-toggle-slider"></span>
        </label>
        <div class="hint">
          ON: SKU が商品マスタに存在する場合、商品名を常にマスタの印刷用商品名で上書きします<br />
          OFF: 取込した商品名をそのまま表示する
        </div>
      </div>
    </div>

    <div class="o-form-group">
      <label class="o-form-label">送り状種類の自動設定方式</label>
      <div class="row">
        <div class="radio-group">
          <label class="radio-item">
            <input type="radio" v-model="invoiceMode" value="mode1" />
            方式1（商品に「発払い宅急便」が含まれるか）
          </label>
          <label class="radio-item">
            <input type="radio" v-model="invoiceMode" value="mode2" />
            方式2（配送サイズ指数の合計で判定）
          </label>
        </div>
        <div class="hint">
          <div class="desc-title">方式の詳細</div>
          <ul class="desc-list">
            <li>
              <strong>方式1</strong>：選択行の products を見て、商品マスタ側の送り状種類が「発払い宅急便（コード: 0）」の商品が1つでもあれば
              <strong>発払い宅急便</strong>、無ければ <strong>メール便（コード: A）</strong> を設定します。
            </li>
            <li>
              <strong>方式2</strong>：SKU ごとに商品マスタの <strong>delivery_size_index</strong> を取得し、
              \( \sum (数量 \times delivery\_size\_index) \) を計算します。合計が閾値以上なら <strong>発払い宅急便</strong>、
              未満なら <strong>メール便</strong> を設定します。
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="invoiceMode === 'mode2'" class="o-form-group">
      <label class="o-form-label">方式2の閾値（>= で発払い宅急便）</label>
      <div class="row">
        <Input type="number" v-model.number="threshold" :min="0" :step="1" style="width: 140px" />
        <div class="hint">デフォルト：100</div>
      </div>
    </div>

    <DialogFooter>
      <div class="footer">
        <Button variant="secondary" @click="visibleProxy = false">キャンセル</Button>
        <Button variant="default" :disabled="selectedCount === 0" @click="handleConfirm">適用</Button>
      </div>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { computed, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type InvoiceMode = 'mode1' | 'mode2'

const props = defineProps<{
  modelValue: boolean
  selectedCount: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', payload: { overwriteProductName: boolean; invoiceMode: InvoiceMode; threshold: number }): void
}>()

const visibleProxy = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const overwriteProductName = ref(false)
const invoiceMode = ref<InvoiceMode>('mode1')
const threshold = ref(100)

// When switching to mode2, ensure default threshold exists
watch(
  invoiceMode,
  (m) => {
    if (m === 'mode2' && (threshold.value === undefined || threshold.value === null)) {
      threshold.value = 100
    }
  },
  { immediate: true },
)

const handleConfirm = () => {
  emit('confirm', {
    overwriteProductName: overwriteProductName.value,
    invoiceMode: invoiceMode.value,
    threshold: Number(threshold.value ?? 100),
  })
  visibleProxy.value = false
}
</script>

<style scoped>
.meta { color: #606266; font-size: 13px; }
.row { display: flex; flex-direction: column; gap: 8px; }
.hint { color: #909399; font-size: 12px; line-height: 1.5; }
.desc-title { margin-bottom: 4px; color: #606266; font-weight: 600; }
.desc-list { margin: 0; padding-left: 18px; }
.footer { display: flex; justify-content: flex-end; gap: 10px; }
.radio-group { display: flex; flex-direction: column; gap: 8px; }
.radio-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #374151; cursor: pointer; }
.radio-item input[type="radio"] { margin: 0; }
.o-form-group { margin-bottom:1rem; }
.o-form-label { display:block; font-size:13px; font-weight:500; color:#374151; margin-bottom:0.25rem; }
.o-toggle { position:relative; display:inline-block; width:40px; height:20px; cursor:pointer; }
.o-toggle input { opacity:0; width:0; height:0; }
.o-toggle-slider { position:absolute; inset:0; background:#ccc; border-radius:20px; transition:background .2s; }
.o-toggle-slider::before { content:''; position:absolute; left:2px; top:2px; width:16px; height:16px; background:#fff; border-radius:50%; transition:transform .2s; }
.o-toggle input:checked + .o-toggle-slider { background:#714b67; }
.o-toggle input:checked + .o-toggle-slider::before { transform:translateX(20px); }
</style>
