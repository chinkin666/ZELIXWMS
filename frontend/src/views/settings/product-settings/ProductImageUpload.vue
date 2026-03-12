<template>
  <div class="image-upload-section">
    <div class="o-divider">
      <span class="o-divider-text">商品画像</span>
    </div>
    <div class="image-upload-content">
      <div class="image-preview">
        <img :src="resolvedImageUrl" class="preview-img" @error="(e: Event) => { (e.target as HTMLImageElement).src = noImageSrc }" />
      </div>
      <div class="image-inputs">
        <!-- No image or has image: show action buttons -->
        <div v-if="!showUrlInput" class="image-input-row">
          <label class="o-btn o-btn-secondary o-btn-sm">
            <span v-if="uploading">...</span>
            <span v-else>&#128247; ファイルをアップロード</span>
            <input type="file" accept="image/*" class="hidden-input" @change="handleImageFileChange" />
          </label>
          <OButton variant="secondary" size="sm" @click="showUrlInput = true">外部URLを指定</OButton>
          <OButton v-if="imageUrl" variant="danger" size="sm" @click="$emit('update:imageUrl', '')">削除</OButton>
        </div>
        <!-- URL input mode -->
        <div v-else class="image-input-row">
          <input
            :value="imageUrl"
            @input="$emit('update:imageUrl', ($event.target as HTMLInputElement).value)"
            type="text"
            class="o-input o-input-sm"
            placeholder="画像URLを入力 (https://...)"
          />
          <OButton variant="secondary" size="sm" @click="showUrlInput = false">戻る</OButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import { uploadProductImage } from '@/api/product'
import { getApiBaseUrl } from '@/api/base'
import noImageSrc from '@/assets/images/no_image.png'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  imageUrl: string
}>()

const emit = defineEmits<{
  (e: 'update:imageUrl', value: string): void
}>()

const toast = useToast()
const showUrlInput = ref(false)
const uploading = ref(false)

const API_BASE = getApiBaseUrl().replace(/\/api$/, '')

const resolvedImageUrl = computed(() => {
  const url = props.imageUrl
  if (!url) return noImageSrc
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE}${url}`
})

const handleImageFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const result = await uploadProductImage(file)
    emit('update:imageUrl', result.imageUrl)
    toast.showSuccess('画像をアップロードしました')
  } catch (error: any) {
    toast.showError(error?.message || '画像のアップロードに失敗しました')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

const resetUrlInput = () => {
  showUrlInput.value = false
}

defineExpose({ resetUrlInput })
</script>

<style scoped>
.image-upload-section {
  padding: 0 20px;
}

.image-upload-content {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.image-preview {
  flex-shrink: 0;
}

.preview-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  object-position: center;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
}

.image-inputs {
  flex: 1;
  min-width: 0;
}

.image-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hidden-input {
  display: none;
}

.o-divider {
  display: flex;
  align-items: center;
  margin: 16px 0 12px;
  border: 0;
  white-space: nowrap;
}
.o-divider::before,
.o-divider::after {
  content: '';
  flex: 1;
  border-top: 1px solid #dcdfe6;
}
.o-divider-text {
  padding: 0 12px;
  font-weight: 600;
  color: #409eff;
  font-size: 14px;
}
</style>
