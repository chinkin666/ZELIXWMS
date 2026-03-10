<template>
  <el-dialog
    v-model="visibleProxy"
    title="商品情報の自動補完 / 送り状種類の自動設定"
    width="760px"
    :close-on-click-modal="false"
  >
    <div class="meta">
      対象：<strong>{{ selectedCount }}</strong> 件（左側チェックで選択した行のみ）
    </div>

    <el-divider />

    <el-form label-width="220px">
      <el-form-item label="商品マスタから商品名上書き">
        <div class="row">
          <el-switch v-model="overwriteProductName" />
          <div class="hint">
            ON: SKU が商品マスタに存在する場合、商品名を常にマスタの印刷用商品名で上書きします<br />
            OFF: 取込した商品名をそのまま表示する
          </div>
        </div>
      </el-form-item>

      <el-form-item label="送り状種類の自動設定方式">
        <div class="row">
          <el-radio-group v-model="invoiceMode">
            <el-radio label="mode1">方式1（商品に「発払い宅急便」が含まれるか）</el-radio>
            <el-radio label="mode2">方式2（配送サイズ指数の合計で判定）</el-radio>
          </el-radio-group>
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
      </el-form-item>

      <el-form-item v-if="invoiceMode === 'mode2'" label="方式2の閾値（>= で発払い宅急便）">
        <div class="row">
          <el-input-number v-model="threshold" :min="0" :step="1" />
          <div class="hint">デフォルト：100</div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="footer">
        <el-button @click="visibleProxy = false">キャンセル</el-button>
        <el-button type="primary" :disabled="selectedCount === 0" @click="handleConfirm">
          適用
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElDialog, ElDivider, ElForm, ElFormItem, ElInputNumber, ElRadio, ElRadioGroup, ElSwitch } from 'element-plus'

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
.meta {
  color: #606266;
  font-size: 13px;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint {
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}

.desc-title {
  margin-bottom: 4px;
  color: #606266;
  font-weight: 600;
}

.desc-list {
  margin: 0;
  padding-left: 18px;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>


