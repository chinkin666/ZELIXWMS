<template>
  <div class="image-upload-section">
    <div>
      <span class="o-divider-text">{{ t('wms.product.productImage', '商品画像') }}</span>
    </div>
    <div class="image-upload-content">
      <div class="image-preview">
        <img :src="resolvedImageUrl" class="preview-img" @error="(e: Event) => { (e.target as HTMLImageElement).src = noImageSrc }" />
      </div>
      <div class="image-inputs">
        <!-- No image or has image: show action buttons -->
        <div v-if="!showUrlInput" class="image-input-row">
          <label >
            <span v-if="uploading">...</span>
            <span v-else>&#128247; {{ t('wms.product.uploadFile', 'ファイルをアップロード') }}</span>
            <input type="file" accept="image/*" class="hidden-input" @change="handleImageFileChange" />
          </label>
          <Button variant="secondary" size="sm" @click="showUrlInput = true">{{ t('wms.product.specifyExternalUrl', '外部URLを指定') }}</Button>
          <Button v-if="imageUrl" variant="destructive" size="sm" @click="$emit('update:imageUrl', '')">{{ t('wms.common.delete', '削除') }}</Button>
        </div>
        <!-- URL input mode -->
        <div v-else class="image-input-row">
          <Input
            :value="imageUrl"
            @input="$emit('update:imageUrl', ($event.target as HTMLInputElement).value)"
            type="text"
            class="h-8 text-sm"
            :placeholder="t('wms.product.enterImageUrl', '画像URLを入力 (https://...)')"
          />
          <Button variant="secondary" size="sm" @click="showUrlInput = false">{{ t('wms.product.back', '戻る') }}</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'
import { uploadProductImage } from '@/api/product'
import { resolveImageUrl } from '@/utils/imageUrl'
import noImageSrc from '@/assets/images/no_image.png'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  imageUrl: string
}>()

const emit = defineEmits<{
  (e: 'update:imageUrl', value: string): void
}>()

const { t } = useI18n()
const toast = useToast()
const showUrlInput = ref(false)
const uploading = ref(false)

const resolvedImageUrl = computed(() => resolveImageUrl(props.imageUrl))

const handleImageFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const result = await uploadProductImage(file)
    emit('update:imageUrl', result.imageUrl)
    toast.showSuccess(t('wms.product.imageUploaded', '画像をアップロードしました'))
  } catch (error: any) {
    toast.showError(error?.message || t('wms.product.imageUploadFailed', '画像のアップロードに失敗しました'))
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
