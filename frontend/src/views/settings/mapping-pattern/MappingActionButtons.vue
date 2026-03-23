<template>
  <div class="middle-buttons">
    <!-- 商品フィールド：子項目から設定 -->
    <template v-if="selectedTarget?.isExpandable && selectedTarget?.field === 'products'">
      <div class="o-alert o-alert-info" style="margin-bottom: 10px">
        {{ t('wms.mapping.productsExpandHint', '「商品」は展開のみ可能です。子項目（SKU、数量、商品名）を選択して設定してください。') }}
      </div>
      <Button variant="destructive" :disabled="!selectedTarget" @click="$emit('clear-selected')">
        {{ t('wms.mapping.clear', 'クリア') }}
      </Button>
      <Button variant="destructive" @click="$emit('clear-all')">{{ t('wms.mapping.clearAll', '全てクリア') }}</Button>
    </template>

    <!-- 荷扱いタグ・バーコード専用ボタン -->
    <template
      v-else-if="
        selectedTarget?.field === 'handlingTags' ||
        (configType === 'product' && selectedTarget?.field === 'barcode')
      "
    >
      <Button
        v-if="configType === 'product' && selectedTarget?.field === 'barcode'"
        variant="default"
        :disabled="!selectedTarget"
        @click="$emit('open-barcode-mapping')"
      >
        {{ t('wms.mapping.barcodeLayoutSettings', 'バーコードレイアウト設定') }}
      </Button>
      <Button
        v-if="selectedTarget?.field === 'handlingTags'"
        variant="default"
        :disabled="!selectedTarget"
        @click="$emit('open-handling-tags-mapping')"
      >
        {{ t('wms.mapping.handlingTagsLayoutSettings', '荷扱いタグレイアウト設定') }}
      </Button>
      <Button variant="destructive" :disabled="!selectedTarget" @click="$emit('clear-selected')">
        {{ t('wms.mapping.clear', 'クリア') }}
      </Button>
      <Button variant="destructive" @click="$emit('clear-all')">{{ t('wms.mapping.clearAll', '全てクリア') }}</Button>
    </template>

    <!-- 入力元が「商品」の場合 -->
    <template v-else-if="selectedSources.length === 1 && selectedSources[0]?.name === 'products'">
      <Button
        variant="default"
        :disabled="!selectedTarget"
        @click="$emit('open-product-to-string')"
      >
        {{ t('wms.mapping.convertProductsToString', '商品を文字列に変換') }}
      </Button>
      <Button variant="destructive" :disabled="!selectedTarget" @click="$emit('clear-selected')">
        {{ t('wms.mapping.clear', 'クリア') }}
      </Button>
      <Button variant="destructive" @click="$emit('clear-all')">{{ t('wms.mapping.clearAll', '全てクリア') }}</Button>
    </template>

    <!-- 入力元が「荷扱いタグ」の場合 -->
    <template v-else-if="selectedSources.length === 1 && selectedSources[0]?.name === 'handlingTags'">
      <Button
        variant="default"
        :disabled="!selectedTarget"
        @click="$emit('open-handling-tags-index')"
      >
        {{ t('wms.mapping.getArrayElement', '配列要素を取得') }}
      </Button>
      <Button variant="destructive" :disabled="!selectedTarget" @click="$emit('clear-selected')">
        {{ t('wms.mapping.clear', 'クリア') }}
      </Button>
      <Button variant="destructive" @click="$emit('clear-all')">{{ t('wms.mapping.clearAll', '全てクリア') }}</Button>
    </template>

    <!-- 通常ボタン -->
    <template v-else>
      <!-- order-to-sheet 項目追加ボタン -->
      <Button
        v-if="configType === 'order-to-sheet'"
        variant="default"
        :disabled="selectedSources.length !== 1"
        @click="$emit('quick-add-from-source')"
      >
        &lt;&lt; {{ t('wms.mapping.addField', '項目を追加') }}
      </Button>
      <Button
        variant="default"
        :disabled="!selectedTarget || selectedSources.length === 0"
        @click="$emit('direct-link')"
      >
        &lt;&lt; {{ t('wms.mapping.link', 'マッピング') }}
      </Button>
      <Button
        variant="warning"
        :disabled="!selectedTarget"
        @click="$emit('add-literal')"
      >
        {{ t('wms.mapping.addLiteral', '固定値を追加') }}
      </Button>
      <Button
        variant="default"
        :disabled="!selectedTarget"
        @click="$emit('open-transform-dialog')"
      >
        &lt;&lt; {{ t('wms.mapping.linkWithTransform', '変換付きマッピング') }}
      </Button>
      <Button
        variant="secondary"
        :disabled="!selectedTarget"
        @click="$emit('open-detail-dialog')"
      >
        {{ t('wms.mapping.linkDetailSettings', 'マッピング詳細設定') }}
      </Button>
      <Button variant="destructive" :disabled="!selectedTarget" @click="$emit('clear-selected')">
        {{ t('wms.mapping.clear', 'クリア') }}
      </Button>
      <Button variant="destructive" @click="$emit('clear-all')">{{ t('wms.mapping.clearAll', '全てクリア') }}</Button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

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
