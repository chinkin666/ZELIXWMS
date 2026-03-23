<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ref, computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

interface UploadFile {
  file: File
  id: string
  progress: number
  error?: string
  previewUrl?: string
}

const props = withDefaults(defineProps<{
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxFiles?: number
}>(), {
  accept: '',
  multiple: true,
  maxSize: 10,
  maxFiles: 10,
})

const emit = defineEmits<{
  upload: [files: File[]]
  remove: [file: File]
}>()

const files = ref<UploadFile[]>([])
const isDragOver = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const canAddMore = computed(() =>
  props.multiple ? files.value.length < props.maxFiles : files.value.length < 1
)

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/')
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(file: File): string {
  if (file.type.startsWith('image/')) return '\uD83D\uDDBC'
  if (file.type.includes('pdf')) return '\uD83D\uDCC4'
  if (file.type.includes('spreadsheet') || file.type.includes('excel')) return '\uD83D\uDCCA'
  if (file.type.includes('document') || file.type.includes('word')) return '\uD83D\uDCC3'
  return '\uD83D\uDCCE'
}

function validateFile(file: File): string | undefined {
  if (props.maxSize && file.size > props.maxSize * 1024 * 1024) {
    return t('fileUploader.fileTooLarge', `File exceeds ${props.maxSize} MB limit`)
  }
  if (props.accept) {
    const accepted = props.accept.split(',').map(a => a.trim())
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const matches = accepted.some(a => {
      if (a.startsWith('.')) return ext === a.toLowerCase()
      if (a.endsWith('/*')) return file.type.startsWith(a.replace('/*', '/'))
      return file.type === a
    })
    if (!matches) return t('fileUploader.fileTypeNotAccepted', 'File type not accepted')
  }
  return undefined
}

function processFiles(fileList: FileList | File[]) {
  const rawFiles = Array.from(fileList)
  const newEntries: UploadFile[] = []
  const validFiles: File[] = []

  for (const file of rawFiles) {
    if (!canAddMore.value && newEntries.length === 0) break
    if (files.value.length + newEntries.length >= props.maxFiles) break

    const error = validateFile(file)
    const entry: UploadFile = {
      file,
      id: generateId(),
      progress: error ? 0 : 0,
      error,
    }

    if (isImage(file) && !error) {
      entry.previewUrl = URL.createObjectURL(file)
    }

    newEntries.push(entry)
    if (!error) validFiles.push(file)
  }

  files.value = [...files.value, ...newEntries]

  // Simulate upload progress for valid files
  for (const entry of newEntries) {
    if (!entry.error) simulateProgress(entry.id)
  }

  if (validFiles.length > 0) {
    emit('upload', validFiles)
  }
}

function simulateProgress(id: string) {
  let progress = 0
  const interval = setInterval(() => {
    progress += Math.random() * 30 + 10
    if (progress >= 100) {
      progress = 100
      clearInterval(interval)
    }
    const entry = files.value.find(f => f.id === id)
    if (entry) {
      files.value = files.value.map(f =>
        f.id === id ? { ...f, progress: Math.min(100, Math.round(progress)) } : f
      )
    } else {
      clearInterval(interval)
    }
  }, 200)
}

function removeFile(entry: UploadFile) {
  if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl)
  files.value = files.value.filter(f => f.id !== entry.id)
  emit('remove', entry.file)
}

function onDragEnter(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  if (event.dataTransfer?.files) {
    processFiles(event.dataTransfer.files)
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
}

function openBrowser() {
  inputRef.value?.click()
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    processFiles(target.files)
    target.value = ''
  }
}
</script>

<template>
  <div class="o-file-uploader">
    <div
      class="o-file-dropzone"
      :class="{ 'o-file-dropzone--over': isDragOver, 'o-file-dropzone--disabled': !canAddMore }"
      @dragenter="onDragEnter"
      @dragleave="onDragLeave"
      @dragover="onDragOver"
      @drop="onDrop"
      @click="openBrowser"
    >
      <Input
        ref="inputRef"
        type="file"
        class="o-file-input-hidden"
        :accept="accept"
        :multiple="multiple"
        @change="onFileChange"
      />
      <div class="o-file-dropzone-content">
        <svg class="o-file-dropzone-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p class="o-file-dropzone-text">
          {{ t('documents.dropFilesHere') }}
        </p>
        <p class="o-file-dropzone-hint">
          {{ accept ? `${t('fileUploader.accepted', 'Accepted')}: ${accept}` : '' }}
          {{ maxSize ? ` ${t('fileUploader.maxSize', 'Max')} ${maxSize} MB` : '' }}
        </p>
      </div>
    </div>

    <ul v-if="files.length > 0" class="o-file-list">
      <li v-for="entry in files" :key="entry.id" class="o-file-item" :class="{ 'o-file-item--error': entry.error }">
        <div v-if="entry.previewUrl" class="o-file-preview">
          <img :src="entry.previewUrl" :alt="entry.file.name" />
        </div>
        <span v-else class="o-file-type-icon">{{ fileIcon(entry.file) }}</span>
        <div class="o-file-info">
          <span class="o-file-name">{{ entry.file.name }}</span>
          <span class="o-file-size">{{ formatSize(entry.file.size) }}</span>
          <span v-if="entry.error" class="o-file-error">{{ entry.error }}</span>
          <div v-else-if="entry.progress < 100" class="o-file-progress">
            <div class="o-file-progress-bar" :style="{ width: entry.progress + '%' }" />
          </div>
        </div>
        <Button
          class="o-file-remove"
          type="button"
          :aria-label="t('common.delete')"
          @click.stop="removeFile(entry)"
        >
          &times;
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.o-file-uploader {
  width: 100%;
}

.o-file-dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  border: 2px dashed var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius-lg, 6px);
  background: var(--o-gray-100, #f8f9fa);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  padding: 1.5rem;
}

.o-file-dropzone:hover {
  border-color: var(--o-brand-primary, #0052A3);
  background: var(--o-brand-light, #f0e6ed);
}

.o-file-dropzone--over {
  border-color: var(--o-brand-primary, #0052A3);
  background: var(--o-brand-lighter, #ede8eb);
}

.o-file-dropzone--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.o-file-input-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.o-file-dropzone-content {
  text-align: center;
}

.o-file-dropzone-icon {
  color: var(--o-gray-400, #ced4da);
  margin-bottom: 0.5rem;
}

.o-file-dropzone-text {
  font-size: var(--o-font-size-base, 0.875rem);
  color: var(--o-gray-700, #495057);
  font-weight: 500;
}

.o-file-dropzone-hint {
  font-size: var(--o-font-size-smaller, 0.75rem);
  color: var(--o-gray-500, #adb5bd);
  margin-top: 0.25rem;
}

.o-file-list {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.o-file-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  background: var(--o-view-background, #fff);
}

.o-file-item--error {
  border-color: var(--o-danger-border, #f5c6cb);
  background: var(--o-danger-light, #fdf0f1);
}

.o-file-preview {
  width: 40px;
  height: 40px;
  border-radius: var(--o-border-radius-sm, 3px);
  overflow: hidden;
  flex-shrink: 0;
}

.o-file-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.o-file-type-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  width: 40px;
  text-align: center;
}

.o-file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.o-file-name {
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-900, #212529);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.o-file-size {
  font-size: var(--o-font-size-smaller, 0.75rem);
  color: var(--o-gray-500, #adb5bd);
}

.o-file-error {
  font-size: var(--o-font-size-smaller, 0.75rem);
  color: var(--o-danger, #dc3545);
  font-weight: 500;
}

.o-file-progress {
  width: 100%;
  height: 4px;
  background: var(--o-gray-200, #e9ecef);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.125rem;
}

.o-file-progress-bar {
  height: 100%;
  background: var(--o-brand-primary, #0052A3);
  border-radius: 2px;
  transition: width 0.2s ease;
}

.o-file-remove {
  background: none;
  border: none;
  color: var(--o-gray-500, #adb5bd);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.125rem 0.25rem;
  line-height: 1;
  transition: color 0.15s;
  flex-shrink: 0;
}

.o-file-remove:hover {
  color: var(--o-danger, #dc3545);
}

[data-theme="dark"] .o-file-dropzone {
  background: var(--o-gray-100);
  border-color: var(--o-gray-300);
}

[data-theme="dark"] .o-file-dropzone:hover {
  border-color: var(--o-brand-primary);
  background: var(--o-brand-light);
}

[data-theme="dark"] .o-file-dropzone--over {
  background: var(--o-brand-lighter);
}

[data-theme="dark"] .o-file-item {
  background: var(--o-gray-200);
  border-color: var(--o-gray-300);
}

[data-theme="dark"] .o-file-item--error {
  background: var(--o-danger-light);
  border-color: var(--o-danger-border);
}

[data-theme="dark"] .o-file-name {
  color: var(--o-gray-900);
}

[data-theme="dark"] .o-file-progress {
  background: var(--o-gray-300);
}
</style>
