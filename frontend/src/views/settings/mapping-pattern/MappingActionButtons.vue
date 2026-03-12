<template>
  <div class="middle-buttons">
    <!-- 特殊字段：products 本身不能被设置（只能设置子项） -->
    <template v-if="selectedTarget?.isExpandable && selectedTarget?.field === 'products'">
      <div class="o-alert o-alert-info" style="margin-bottom: 10px">
        「商品」は展開のみ可能です。子項目（SKU、数量、商品名）を選択して設定してください。
      </div>
      <OButton variant="danger" :disabled="!selectedTarget" @click="$emit('clear-selected')">
        クリア
      </OButton>
      <OButton variant="danger" @click="$emit('clear-all')">全てクリア</OButton>
    </template>

    <!-- 特殊字段：handlingTags / barcode(string[]) 的专用按钮 -->
    <template
      v-else-if="
        selectedTarget?.field === 'handlingTags' ||
        (configType === 'product' && selectedTarget?.field === 'barcode')
      "
    >
      <OButton
        v-if="configType === 'product' && selectedTarget?.field === 'barcode'"
        variant="primary"
        :disabled="!selectedTarget"
        @click="$emit('open-barcode-mapping')"
      >
        バーコードレイアウト設定
      </OButton>
      <OButton
        v-if="selectedTarget?.field === 'handlingTags'"
        variant="primary"
        :disabled="!selectedTarget"
        @click="$emit('open-handling-tags-mapping')"
      >
        荷扱いタグレイアウト設定
      </OButton>
      <OButton variant="danger" :disabled="!selectedTarget" @click="$emit('clear-selected')">
        クリア
      </OButton>
      <OButton variant="danger" @click="$emit('clear-all')">全てクリア</OButton>
    </template>

    <!-- Source 选择 product 时的特殊按钮 -->
    <template v-else-if="selectedSources.length === 1 && selectedSources[0]?.name === 'products'">
      <OButton
        variant="primary"
        :disabled="!selectedTarget"
        @click="$emit('open-product-to-string')"
      >
        商品を文字列に変換
      </OButton>
      <OButton variant="danger" :disabled="!selectedTarget" @click="$emit('clear-selected')">
        クリア
      </OButton>
      <OButton variant="danger" @click="$emit('clear-all')">全てクリア</OButton>
    </template>

    <!-- Source 选择 handlingTags 时的特殊按钮 -->
    <template v-else-if="selectedSources.length === 1 && selectedSources[0]?.name === 'handlingTags'">
      <OButton
        variant="primary"
        :disabled="!selectedTarget"
        @click="$emit('open-handling-tags-index')"
      >
        配列要素を取得
      </OButton>
      <OButton variant="danger" :disabled="!selectedTarget" @click="$emit('clear-selected')">
        クリア
      </OButton>
      <OButton variant="danger" @click="$emit('clear-all')">全てクリア</OButton>
    </template>

    <!-- 默认按钮 -->
    <template v-else>
      <!-- order-to-sheet 快捷添加按钮 -->
      <OButton
        v-if="configType === 'order-to-sheet'"
        variant="success"
        :disabled="selectedSources.length !== 1"
        @click="$emit('quick-add-from-source')"
      >
        &lt;&lt; 項目を追加
      </OButton>
      <OButton
        variant="primary"
        :disabled="!selectedTarget || selectedSources.length === 0"
        @click="$emit('direct-link')"
      >
        &lt;&lt; 紐付け
      </OButton>
      <OButton
        variant="warning"
        :disabled="!selectedTarget"
        @click="$emit('add-literal')"
      >
        固定値を追加
      </OButton>
      <OButton
        variant="primary"
        :disabled="!selectedTarget"
        @click="$emit('open-transform-dialog')"
      >
        &lt;&lt; 変換付き紐付け
      </OButton>
      <OButton
        variant="secondary"
        :disabled="!selectedTarget"
        @click="$emit('open-detail-dialog')"
      >
        紐付け項目の詳細設定
      </OButton>
      <OButton variant="danger" :disabled="!selectedTarget" @click="$emit('clear-selected')">
        クリア
      </OButton>
      <OButton variant="danger" @click="$emit('clear-all')">全てクリア</OButton>
    </template>
  </div>
</template>

<script setup lang="ts">
import OButton from '@/components/odoo/OButton.vue'

interface TargetRow {
  field: string
  required: boolean
  label?: string
  children?: TargetRow[]
  isExpandable?: boolean
}

interface SourceRow {
  name: string
  label?: string
}

defineProps<{
  selectedTarget: TargetRow | null
  selectedSources: SourceRow[]
  configType: string
}>()

defineEmits<{
  'clear-selected': []
  'clear-all': []
  'direct-link': []
  'add-literal': []
  'open-transform-dialog': []
  'open-detail-dialog': []
  'open-barcode-mapping': []
  'open-handling-tags-mapping': []
  'open-handling-tags-index': []
  'open-product-to-string': []
  'quick-add-from-source': []
}>()
</script>

<style scoped>
.middle-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
  justify-content: center;
}
.o-alert {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
}
.o-alert-info {
  background: #f4f4f5;
  color: #909399;
  border: 1px solid #e9e9eb;
}
</style>
