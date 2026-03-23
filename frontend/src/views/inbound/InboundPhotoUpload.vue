<template>
  <div class="inbound-photo-upload">
    <PageHeader :title="t('wms.inbound.photoUpload', '入庫写真登録')" :show-search="false" />

    <!-- 写真アップロードフォーム / 照片上传表单 -->
    <div class="upload-form rounded-lg border bg-card p-4">
      <h3 class="form-title">{{ t('wms.inbound.photoRegistration', '入庫写真の登録') }}</h3>
      <p class="form-desc">{{ t('wms.inbound.photoDesc', '入庫検品時の写真を登録します。ドラッグ＆ドロップまたはファイル選択で画像をアップロードできます。') }}</p>

      <div class="form-grid">
        <!-- 入庫指示番号選択 / 入库指示编号选择 -->
        <div class="form-field">
          <label>{{ t('wms.inbound.orderNumber', '入庫指示番号') }} <span class="text-destructive text-xs">*</span></label>
          <Select :model-value="selectedOrderId || '__none__'" @update:model-value="(v: string) => { selectedOrderId = v === '__none__' ? '' : v }">
            <SelectTrigger><SelectValue placeholder="{{ t('wms.inbound.selectOrder', '入庫指示を選択...') }}" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="order in orders" :key="order._id" :value="order._id">
                {{ order.orderNumber }} - {{ order.customerName || order.status }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- メモ入力 / 备注输入 -->
        <div class="form-field">
          <label>{{ t('wms.inbound.memo', 'メモ') }}</label>
          <Input v-model="memo" type="text" :placeholder="t('wms.inbound.photoMemoPlaceholder', '写真に関するメモ...')" />
        </div>
      </div>

      <!-- ドラッグ＆ドロップエリア / 拖拽上传区域 -->
      <div
        class="drop-zone"
        :class="{ 'drop-zone--active': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        @click="triggerFileInput"
      >
        <Input
          ref="fileInputRef"
          type="file"
          multiple
          accept="image/*"
          style="display:none"
          @change="handleFileSelect"
        />
        <div class="drop-zone-content">
          <span class="drop-zone-icon">📷</span>
          <p class="drop-zone-text">{{ t('wms.inbound.dropOrClick', '画像をドラッグ＆ドロップ、またはクリックして選択') }}</p>
          <p class="drop-zone-hint">{{ t('wms.inbound.acceptedFormats', 'JPG, PNG, WEBP（最大10MB/枚）') }}</p>
        </div>
      </div>

      <!-- プレビューグリッド / 预览网格 -->
      <div v-if="previews.length > 0" class="preview-grid">
        <div v-for="(preview, idx) in previews" :key="idx" class="preview-item">
          <img :src="preview.url" :alt="preview.file.name" class="preview-img" />
          <div class="preview-name">{{ preview.file.name }}</div>
          <Button variant="ghost" class="preview-remove" @click="removePreview(idx)">&times;</Button>
        </div>
      </div>

      <!-- アップロードボタン / 上传按钮 -->
      <div class="flex justify-end gap-2 pt-4">
        <Button
          variant="default"
          :disabled="!canUpload || isUploading"
          @click="handleUpload"
        >
          {{ isUploading ? t('wms.inbound.uploading', 'アップロード中...') : t('wms.inbound.upload', 'アップロード') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 入庫写真登録画面 / 入库照片登记页面
 *
 * 入庫検品時に撮影した写真をアップロードし、入庫指示に紐付ける。
 * 入库检品时拍摄的照片上传后与入库指示关联。
 */
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/shared/PageHeader.vue'
import { apiFetch, getApiBaseUrl } from '@/api/base'

interface InboundOrder {
  _id: string
  orderNumber: string
  customerName?: string
  status: string
}

interface PreviewItem {
  file: File
  url: string
}

const toast = useToast()
const { t } = useI18n()

const orders = ref<InboundOrder[]>([])
const selectedOrderId = ref('')
const memo = ref('')
const previews = ref<PreviewItem[]>([])
const isDragging = ref(false)
const isUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const canUpload = computed(() => selectedOrderId.value && previews.value.length > 0)

// ファイル入力トリガー / 触发文件选择
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

// ファイル選択ハンドラ / 文件选择处理
const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files) {
    addFiles(Array.from(input.files))
  }
}

// ドロップハンドラ / 拖拽处理
const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  if (e.dataTransfer?.files) {
    addFiles(Array.from(e.dataTransfer.files))
  }
}

// ファイル追加（画像のみ）/ 添加文件（仅限图片）
const addFiles = (files: File[]) => {
  const imageFiles = files.filter(f => f.type.startsWith('image/'))
  for (const file of imageFiles) {
    previews.value = [...previews.value, { file, url: URL.createObjectURL(file) }]
  }
}

// プレビュー削除 / 删除预览
const removePreview = (idx: number) => {
  const removed = previews.value[idx]
  if (removed) URL.revokeObjectURL(removed.url)
  previews.value = previews.value.filter((_, i) => i !== idx)
}

// アップロード処理 / 上传处理
const handleUpload = async () => {
  if (!canUpload.value) return
  isUploading.value = true
  try {
    const formData = new FormData()
    for (const preview of previews.value) {
      formData.append('photos', preview.file)
    }
    if (memo.value) {
      formData.append('memo', memo.value)
    }

    const res = await apiFetch(`${getApiBaseUrl()}/inbound-orders/${selectedOrderId.value}/photos`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(err.message || 'アップロードに失敗しました')
    }

    toast.showSuccess(t('wms.inbound.uploadSuccess', '写真をアップロードしました'))
    // プレビューをクリア / 清空预览
    for (const p of previews.value) URL.revokeObjectURL(p.url)
    previews.value = []
    memo.value = ''
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'アップロードに失敗しました'
    toast.showError(msg)
  } finally {
    isUploading.value = false
  }
}

// 入庫指示一覧を取得 / 获取入库指示列表
onMounted(async () => {
  try {
    const res = await apiFetch(`${getApiBaseUrl()}/inbound-orders?limit=100`)
    if (res.ok) {
      const data = await res.json()
      orders.value = data.items || data || []
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '入庫指示の取得に失敗しました'
    toast.showError(msg)
  }
})
</script>

<style scoped>
.inbound-photo-upload {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
  padding: 1.5rem;
}

.form-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin: 0 0 4px 0;
}

.form-desc {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
  margin: 0 0 1.5rem 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
}

.required-badge { display:inline-block;background:#dc3545;color:#fff;font-size:10px;font-weight:700;line-height:1;padding:2px 5px;border-radius:3px;white-space:nowrap;vertical-align:middle;margin-left:4px; }

.{
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 14px;
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
  width: 100%;
}

.drop-zone {
  margin-top: 1.5rem;
  border: 2px dashed var(--o-border-color, #dcdfe6);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.drop-zone:hover,
.drop-zone--active {
  border-color: var(--o-brand-primary, #714b67);
  background: var(--o-gray-100, #f5f7fa);
}

.drop-zone-icon { font-size: 32px; }
.drop-zone-text { font-size: 14px; color: var(--o-gray-700, #303133); margin: 8px 0 4px; }
.drop-zone-hint { font-size: 12px; color: var(--o-gray-500, #909399); margin: 0; }

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 1rem;
}

.preview-item {
  position: relative;
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 6px;
  overflow: hidden;
}

.preview-img {
  width: 100%;
  height: 100px;
  object-fit: cover;
}

.preview-name {
  font-size: 11px;
  padding: 4px 6px;
  color: var(--o-gray-500, #909399);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-actions {
  margin-top: 1.5rem;
  text-align: right;
}

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
