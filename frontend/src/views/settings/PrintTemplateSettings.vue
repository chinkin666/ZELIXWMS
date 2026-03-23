<template>
  <div class="print-template-settings">
    <PageHeader title="印刷テンプレート設定" :show-search="false">
      <template #actions>
        <Button variant="default" @click="openCreate">テンプレートを作成</Button>
      </template>
    </PageHeader>

    <!-- プリセットテンプレート / 预设模板 -->
    <div class="preset-section">
      <h3 class="preset-title">プリセットから作成 / 从预设创建</h3>
      <div class="preset-grid">
        <div
          v-for="preset in presets"
          :key="preset.name"
          class="preset-card"
          :class="preset.colorClass"
          @click="createFromPreset(preset)"
        >
          <div class="preset-icon">{{ preset.icon }}</div>
          <div class="preset-name">{{ preset.name }}</div>
          <div class="preset-desc">{{ preset.description }}</div>
        </div>
      </div>
    </div>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="templates"
        row-key="id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[10, 20, 50]"
      />
    </div>

    <Dialog :open="dialogVisible" @update:open="val => { if (!val) { dialogVisible = false } }">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ isEditing ? 'テンプレート編集' : 'テンプレート作成' }}</DialogTitle></DialogHeader>
      <div class="form-grid">
        <div class="form-group">
          <label>テンプレート名 <span class="text-destructive text-xs">*</span></label>
          <Input v-model="editForm.name" placeholder="例: ヤマトB2（メール便）" />
        </div>
        <div class="form-group">
          <label>解像度 (px/mm)</label>
          <Input v-model.number="editForm.canvas.pxPerMm" type="number" min="1" step="0.5" />
        </div>
        <div class="form-group">
          <label>幅 (mm) <span class="text-destructive text-xs">*</span></label>
          <Input v-model.number="editForm.canvas.widthMm" type="number" min="1" step="1" />
        </div>
        <div class="form-group">
          <label>高さ (mm) <span class="text-destructive text-xs">*</span></label>
          <Input v-model.number="editForm.canvas.heightMm" type="number" min="1" step="1" />
        </div>
      </div>

      <div class="form-group" style="margin-top:12px">
        <label>エレメント定義 (JSON) <span class="text-destructive text-xs">*</span></label>
        <Textarea
          class="code-textarea"
          v-model="elementsJson"
          rows="12"
          placeholder='例: [{"id":"t1","type":"text",...}]'
        ></Textarea>
        <div class="field-hint">
          JSONで直接編集できます。ビジュアル編集は一覧の「レイアウト編集」から開けます。
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" @click="dialogVisible = false">キャンセル</Button>
        <Button variant="default" :disabled="saving" @click="handleSave">{{ isEditing ? '更新' : '作成' }}</Button>
      </DialogFooter>
    </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
import { computed, h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table'
import type { TableColumn } from '@/types/table'
import type { PrintTemplate } from '@/types/printTemplate'
import { useRouter } from 'vue-router'
import { fetchPrintTemplates, fetchPrintTemplate, createPrintTemplate, updatePrintTemplate, deletePrintTemplate } from '@/api/printTemplates'
import { createEmptyPrintTemplate } from '@/utils/print/templateStorage'
import { Input } from '@/components/ui/input'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()

const router = useRouter()
const { show: showToast } = useToast()
const { t } = useI18n()
const templates = ref<PrintTemplate[]>([])
const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const editForm = ref<PrintTemplate>(createEmptyPrintTemplate())
const elementsJson = ref<string>('[]')

const isEditing = computed(() => Boolean(editingId.value))

function reload() {
  fetchPrintTemplates()
    .then((list) => { templates.value = Array.isArray(list) ? list : [] })
    .catch(() => { templates.value = [] })
}

function openCreate() {
  editingId.value = null
  editForm.value = createEmptyPrintTemplate()
  elementsJson.value = JSON.stringify(editForm.value.elements ?? [], null, 2)
  dialogVisible.value = true
}

function openEdit(row: PrintTemplate) {
  editingId.value = row.id
  editForm.value = JSON.parse(JSON.stringify(row)) as PrintTemplate
  elementsJson.value = JSON.stringify(editForm.value.elements ?? [], null, 2)
  dialogVisible.value = true
}

function openVisualEditor(row: PrintTemplate) {
  router.push(`/settings/print-templates/${encodeURIComponent(row.id)}`)
}

async function duplicatePrintTemplate(row: PrintTemplate) {
  try {
    const detail = await fetchPrintTemplate(row.id)
    const { id: _id, meta: _meta, ...rest } = detail
    await createPrintTemplate({ ...rest, name: `${row.name}_copy` } as any)
    showToast('複製しました', 'success')
    reload()
  } catch (e: any) {
    showToast(e?.message || '複製に失敗しました', 'danger')
  }
}

async function removeTemplate(row: PrintTemplate) {
  if (!(await confirm('この操作を実行しますか？'))) return
  await deletePrintTemplate(row.id)
  templates.value = templates.value.filter((t) => t.id !== row.id)
  showToast('削除しました', 'success')
}

async function handleSave() {
  saving.value = true
  try {
    const parsed = JSON.parse(elementsJson.value || '[]')
    if (!Array.isArray(parsed)) throw new Error('elements JSON must be an array')

    const next: PrintTemplate = { ...editForm.value, elements: parsed }

    const isUpdate = templates.value.some((t) => t.id === next.id)
    if (isUpdate) {
      const saved = await updatePrintTemplate(next.id, next as any)
      next.id = saved.id
    } else {
      const created = await createPrintTemplate({ ...(next as any), id: undefined })
      next.id = created.id
    }

    const list = [...templates.value]
    const idx = list.findIndex((t) => t.id === next.id)
    if (idx >= 0) list[idx] = next
    else list.unshift(next)

    templates.value = list
    dialogVisible.value = false
    showToast(isEditing.value ? '更新しました' : '作成しました', 'success')
  } catch (e: any) {
    showToast(e?.message || '保存に失敗しました', 'danger')
  } finally {
    saving.value = false
  }
}

// ---------------------------------------------------------------------------
// プリセットテンプレート定義 / 预设模板定义
// ---------------------------------------------------------------------------
type PresetDefinition = {
  name: string
  icon: string
  description: string
  colorClass: string
  template: Omit<PrintTemplate, 'id' | 'meta'>
}

const presets: PresetDefinition[] = [
  // ── ヤマト宅急便 / 雅玛多宅急便 ──
  {
    name: 'ヤマト宅急便',
    icon: '\uD83D\uDFEB',
    description: 'ヤマト運輸 B2 ラベル (100×148mm) / 雅玛多 B2 标签',
    colorClass: 'preset-yamato',
    template: {
      name: 'ヤマト宅急便ラベル',
      carrierId: 'yamato',
      invoiceType: 'any',
      canvas: { widthMm: 100, heightMm: 148, pxPerMm: 4 },
      elements: [
        { id: 'yt-recv-zip', name: '届け先郵便番号', type: 'text' as const, xMm: 10, yMm: 20, fontFamily: 'Noto Sans JP', fontSizePt: 14, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'recipientPostalCode', transforms: [] } },
        { id: 'yt-recv-addr', name: '届け先住所', type: 'text' as const, xMm: 10, yMm: 35, fontFamily: 'Noto Sans JP', fontSizePt: 11, align: 'left' as const, maxWidthMm: 45, visible: true, locked: false, transformMapping: { sourceField: 'recipientAddress', transforms: [] } },
        { id: 'yt-recv-name', name: '届け先名称', type: 'text' as const, xMm: 10, yMm: 55, fontFamily: 'Noto Sans JP', fontSizePt: 16, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'recipientName', transforms: [] } },
        { id: 'yt-recv-tel', name: '届け先電話番号', type: 'text' as const, xMm: 10, yMm: 72, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'recipientPhone', transforms: [] } },
        { id: 'yt-send-zip', name: '依頼主郵便番号', type: 'text' as const, xMm: 10, yMm: 90, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'shipperPostalCode', transforms: [] } },
        { id: 'yt-send-addr', name: '依頼主住所', type: 'text' as const, xMm: 10, yMm: 100, fontFamily: 'Noto Sans JP', fontSizePt: 9, align: 'left' as const, maxWidthMm: 45, visible: true, locked: false, transformMapping: { sourceField: 'shipperAddress', transforms: [] } },
        { id: 'yt-send-name', name: '依頼主名称', type: 'text' as const, xMm: 10, yMm: 112, fontFamily: 'Noto Sans JP', fontSizePt: 11, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'shipperName', transforms: [] } },
        { id: 'yt-send-tel', name: '依頼主電話番号', type: 'text' as const, xMm: 10, yMm: 122, fontFamily: 'Noto Sans JP', fontSizePt: 9, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'shipperPhone', transforms: [] } },
        { id: 'yt-barcode', name: '送り状番号バーコード', type: 'barcode' as const, xMm: 55, yMm: 15, widthMm: 40, heightMm: 20, format: 'code128' as const, visible: true, locked: false, transformMapping: { sourceField: 'trackingNumber', transforms: [] } },
        { id: 'yt-tracking-txt', name: '送り状番号テキスト', type: 'text' as const, xMm: 55, yMm: 38, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'trackingNumber', transforms: [] } },
        { id: 'yt-product', name: '品名', type: 'text' as const, xMm: 10, yMm: 135, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'productName', transforms: [] } },
        { id: 'yt-parcels', name: '個口数', type: 'text' as const, xMm: 80, yMm: 135, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'parcelCount', transforms: [] } },
      ],
    },
  },
  // ── 佐川飛脚宅配便 / 佐川急便飞脚宅配 ──
  {
    name: '佐川飛脚宅配便',
    icon: '\uD83D\uDFE6',
    description: '佐川急便 飛脚ラベル (100×148mm) / 佐川急便飞脚标签',
    colorClass: 'preset-sagawa',
    template: {
      name: '佐川飛脚宅配便ラベル',
      carrierId: 'sagawa',
      invoiceType: 'any',
      canvas: { widthMm: 100, heightMm: 148, pxPerMm: 4 },
      elements: [
        { id: 'sg-recv-zip', name: '届け先郵便番号', type: 'text' as const, xMm: 8, yMm: 18, fontFamily: 'Noto Sans JP', fontSizePt: 13, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'recipientPostalCode', transforms: [] } },
        { id: 'sg-recv-addr', name: '届け先住所', type: 'text' as const, xMm: 8, yMm: 32, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, maxWidthMm: 50, visible: true, locked: false, transformMapping: { sourceField: 'recipientAddress', transforms: [] } },
        { id: 'sg-recv-name', name: '届け先名称', type: 'text' as const, xMm: 8, yMm: 52, fontFamily: 'Noto Sans JP', fontSizePt: 15, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'recipientName', transforms: [] } },
        { id: 'sg-recv-tel', name: '届け先電話番号', type: 'text' as const, xMm: 8, yMm: 68, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'recipientPhone', transforms: [] } },
        { id: 'sg-send-zip', name: '依頼主郵便番号', type: 'text' as const, xMm: 8, yMm: 82, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'shipperPostalCode', transforms: [] } },
        { id: 'sg-send-addr', name: '依頼主住所', type: 'text' as const, xMm: 8, yMm: 92, fontFamily: 'Noto Sans JP', fontSizePt: 9, align: 'left' as const, maxWidthMm: 50, visible: true, locked: false, transformMapping: { sourceField: 'shipperAddress', transforms: [] } },
        { id: 'sg-send-name', name: '依頼主名称', type: 'text' as const, xMm: 8, yMm: 104, fontFamily: 'Noto Sans JP', fontSizePt: 11, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'shipperName', transforms: [] } },
        { id: 'sg-send-tel', name: '依頼主電話番号', type: 'text' as const, xMm: 8, yMm: 114, fontFamily: 'Noto Sans JP', fontSizePt: 9, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'shipperPhone', transforms: [] } },
        { id: 'sg-barcode', name: '送り状番号バーコード', type: 'barcode' as const, xMm: 55, yMm: 12, widthMm: 40, heightMm: 18, format: 'code128' as const, visible: true, locked: false, transformMapping: { sourceField: 'trackingNumber', transforms: [] } },
        { id: 'sg-tracking-txt', name: '送り状番号テキスト', type: 'text' as const, xMm: 55, yMm: 33, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'trackingNumber', transforms: [] } },
        { id: 'sg-product', name: '品名', type: 'text' as const, xMm: 8, yMm: 126, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'productName', transforms: [] } },
        { id: 'sg-weight', name: '重量', type: 'text' as const, xMm: 60, yMm: 126, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'totalWeight', transforms: [] } },
        { id: 'sg-parcels', name: '個口数', type: 'text' as const, xMm: 80, yMm: 126, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'parcelCount', transforms: [] } },
      ],
    },
  },
  // ── ゆうパック / 邮便局Yu-Pack ──
  {
    name: 'ゆうパック',
    icon: '\uD83D\uDFE5',
    description: '日本郵便 ゆうパック (100×148mm) / 日本邮便 Yu-Pack',
    colorClass: 'preset-yupack',
    template: {
      name: 'ゆうパックラベル',
      carrierId: 'japanpost',
      invoiceType: 'any',
      canvas: { widthMm: 100, heightMm: 148, pxPerMm: 4 },
      elements: [
        { id: 'yp-recv-zip', name: '届け先郵便番号', type: 'text' as const, xMm: 12, yMm: 16, fontFamily: 'Noto Sans JP', fontSizePt: 14, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'recipientPostalCode', transforms: [] } },
        { id: 'yp-recv-addr', name: '届け先住所', type: 'text' as const, xMm: 12, yMm: 30, fontFamily: 'Noto Sans JP', fontSizePt: 11, align: 'left' as const, maxWidthMm: 48, visible: true, locked: false, transformMapping: { sourceField: 'recipientAddress', transforms: [] } },
        { id: 'yp-recv-name', name: '届け先名称', type: 'text' as const, xMm: 12, yMm: 50, fontFamily: 'Noto Sans JP', fontSizePt: 16, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'recipientName', transforms: [] } },
        { id: 'yp-recv-tel', name: '届け先電話番号', type: 'text' as const, xMm: 12, yMm: 66, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'recipientPhone', transforms: [] } },
        { id: 'yp-product', name: '品名', type: 'text' as const, xMm: 12, yMm: 78, fontFamily: 'Noto Sans JP', fontSizePt: 14, align: 'left' as const, maxWidthMm: 76, visible: true, locked: false, transformMapping: { sourceField: 'productName', transforms: [] } },
        { id: 'yp-send-zip', name: '依頼主郵便番号', type: 'text' as const, xMm: 12, yMm: 94, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'shipperPostalCode', transforms: [] } },
        { id: 'yp-send-addr', name: '依頼主住所', type: 'text' as const, xMm: 12, yMm: 104, fontFamily: 'Noto Sans JP', fontSizePt: 9, align: 'left' as const, maxWidthMm: 48, visible: true, locked: false, transformMapping: { sourceField: 'shipperAddress', transforms: [] } },
        { id: 'yp-send-name', name: '依頼主名称', type: 'text' as const, xMm: 12, yMm: 116, fontFamily: 'Noto Sans JP', fontSizePt: 11, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'shipperName', transforms: [] } },
        { id: 'yp-send-tel', name: '依頼主電話番号', type: 'text' as const, xMm: 12, yMm: 126, fontFamily: 'Noto Sans JP', fontSizePt: 9, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'shipperPhone', transforms: [] } },
        { id: 'yp-barcode', name: '追跡番号バーコード', type: 'barcode' as const, xMm: 55, yMm: 12, widthMm: 40, heightMm: 20, format: 'code128' as const, visible: true, locked: false, transformMapping: { sourceField: 'trackingNumber', transforms: [] } },
        { id: 'yp-tracking-txt', name: '追跡番号テキスト', type: 'text' as const, xMm: 55, yMm: 35, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'trackingNumber', transforms: [] } },
        { id: 'yp-parcels', name: '個口数', type: 'text' as const, xMm: 80, yMm: 138, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'parcelCount', transforms: [] } },
      ],
    },
  },
  // ── カンガルー便 / 西浓袋鼠便 ──
  {
    name: 'カンガルー便',
    icon: '\uD83D\uDFE8',
    description: '西濃運輸 カンガルー便 (100×148mm) / 西浓运输袋鼠便',
    colorClass: 'preset-seino',
    template: {
      name: 'カンガルー便ラベル',
      carrierId: 'seino',
      invoiceType: 'any',
      canvas: { widthMm: 100, heightMm: 148, pxPerMm: 4 },
      elements: [
        { id: 'sn-recv-zip', name: '届け先郵便番号', type: 'text' as const, xMm: 10, yMm: 16, fontFamily: 'Noto Sans JP', fontSizePt: 13, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'recipientPostalCode', transforms: [] } },
        { id: 'sn-recv-addr', name: '届け先住所', type: 'text' as const, xMm: 10, yMm: 30, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, maxWidthMm: 48, visible: true, locked: false, transformMapping: { sourceField: 'recipientAddress', transforms: [] } },
        { id: 'sn-recv-name', name: '届け先名称', type: 'text' as const, xMm: 10, yMm: 48, fontFamily: 'Noto Sans JP', fontSizePt: 15, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'recipientName', transforms: [] } },
        { id: 'sn-recv-tel', name: '届け先電話番号', type: 'text' as const, xMm: 10, yMm: 64, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'recipientPhone', transforms: [] } },
        { id: 'sn-send-zip', name: '依頼主郵便番号', type: 'text' as const, xMm: 10, yMm: 78, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'shipperPostalCode', transforms: [] } },
        { id: 'sn-send-addr', name: '依頼主住所', type: 'text' as const, xMm: 10, yMm: 88, fontFamily: 'Noto Sans JP', fontSizePt: 9, align: 'left' as const, maxWidthMm: 48, visible: true, locked: false, transformMapping: { sourceField: 'shipperAddress', transforms: [] } },
        { id: 'sn-send-name', name: '依頼主名称', type: 'text' as const, xMm: 10, yMm: 100, fontFamily: 'Noto Sans JP', fontSizePt: 11, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'shipperName', transforms: [] } },
        { id: 'sn-send-tel', name: '依頼主電話番号', type: 'text' as const, xMm: 10, yMm: 110, fontFamily: 'Noto Sans JP', fontSizePt: 9, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'shipperPhone', transforms: [] } },
        { id: 'sn-barcode', name: '送り状番号バーコード', type: 'barcode' as const, xMm: 55, yMm: 10, widthMm: 40, heightMm: 18, format: 'code128' as const, visible: true, locked: false, transformMapping: { sourceField: 'trackingNumber', transforms: [] } },
        { id: 'sn-tracking-txt', name: '送り状番号テキスト', type: 'text' as const, xMm: 55, yMm: 30, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'trackingNumber', transforms: [] } },
        { id: 'sn-product', name: '品名', type: 'text' as const, xMm: 10, yMm: 122, fontFamily: 'Noto Sans JP', fontSizePt: 10, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'productName', transforms: [] } },
        { id: 'sn-weight', name: '重量', type: 'text' as const, xMm: 10, yMm: 135, fontFamily: 'Noto Sans JP', fontSizePt: 12, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'totalWeight', transforms: [] } },
        { id: 'sn-parcels', name: '個口数', type: 'text' as const, xMm: 55, yMm: 135, fontFamily: 'Noto Sans JP', fontSizePt: 12, align: 'left' as const, visible: true, locked: false, transformMapping: { sourceField: 'parcelCount', transforms: [] } },
      ],
    },
  },
]

/**
 * プリセットからテンプレートを作成 / 从预设创建模板
 */
async function createFromPreset(preset: PresetDefinition) {
  try {
    const payload = {
      ...preset.template,
      elements: preset.template.elements.map((el) => ({ ...el })),
    }
    await createPrintTemplate(payload as any)
    showToast(`「${preset.name}」テンプレートを作成しました / 已创建「${preset.name}」模板`, 'success')
    reload()
  } catch (e: any) {
    showToast(e?.message || 'プリセットの作成に失敗しました / 预设创建失败', 'danger')
  }
}

const tableColumns = computed((): TableColumn[] => [
  { key: 'name', dataKey: 'name', title: 'テンプレート名', width: 280, fieldType: 'string' },
  {
    key: 'size',
    dataKey: 'canvas',
    title: 'サイズ (mm)',
    width: 120,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: PrintTemplate }) =>
      `${rowData.canvas?.widthMm ?? '-'} × ${rowData.canvas?.heightMm ?? '-'}`,
  },
  {
    key: 'elements',
    title: 'エレメント数',
    width: 100,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: PrintTemplate }) =>
      String(rowData.elements?.length ?? 0),
  },
  {
    key: 'actions',
    title: '操作',
    width: 360,
    cellRenderer: ({ rowData }: { rowData: PrintTemplate }) =>
      h('div', { style: 'display:flex;gap:6px;' }, [
        h(Button, { variant: 'default', size: 'sm', onClick: () => openVisualEditor(rowData) }, () => 'レイアウト編集'),
        h(Button, { variant: 'secondary', size: 'sm', onClick: () => openEdit(rowData) }, () => 'JSON編集'),
        h(Button, { variant: 'secondary', size: 'sm', onClick: () => duplicatePrintTemplate(rowData) }, () => '複製'),
        h(Button, { variant: 'destructive', size: 'sm', onClick: () => removeTemplate(rowData) }, () => '削除'),
      ]),
  },
])

onMounted(() => reload())
</script>

<style scoped>
.print-template-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.table-section { width: 100%; }

/* Form */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 13px; font-weight: 500; color: var(--o-gray-700); }
.required-badge {
  display: inline-block; background: #dc3545; color: #fff;
  font-size: 10px; font-weight: 700; line-height: 1;
  padding: 2px 5px; border-radius: 3px; white-space: nowrap;
  vertical-align: middle; margin-left: 4px;
}
.field-hint { font-size: 11px; color: var(--o-gray-400); margin-top: 4px; }
.code-textarea { resize: vertical; font-family: var(--o-font-family-mono); font-size: 12px; line-height: 1.5; }

/* プリセットセクション / 预设区域 */
.preset-section {
  background: var(--o-gray-50, #f8f9fa);
  border: 1px solid var(--o-gray-200, #e9ecef);
  border-radius: 8px;
  padding: 16px 20px;
}
.preset-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--o-gray-700, #495057);
  margin: 0 0 12px;
}
.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
@media (max-width: 900px) {
  .preset-grid { grid-template-columns: repeat(2, 1fr); }
}
.preset-card {
  background: #fff;
  border: 2px solid var(--o-gray-200, #dee2e6);
  border-radius: 8px;
  padding: 16px 14px;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
}
.preset-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
/* 运输商颜色 / キャリアカラー */
.preset-card.preset-yamato { border-color: #2e7d32; }
.preset-card.preset-yamato:hover { border-color: #1b5e20; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2); }
.preset-card.preset-sagawa { border-color: #1565c0; }
.preset-card.preset-sagawa:hover { border-color: #0d47a1; box-shadow: 0 4px 12px rgba(21, 101, 192, 0.2); }
.preset-card.preset-yupack { border-color: #c62828; }
.preset-card.preset-yupack:hover { border-color: #b71c1c; box-shadow: 0 4px 12px rgba(198, 40, 40, 0.2); }
.preset-card.preset-seino { border-color: #f9a825; }
.preset-card.preset-seino:hover { border-color: #f57f17; box-shadow: 0 4px 12px rgba(249, 168, 37, 0.2); }

.preset-icon {
  font-size: 28px;
  margin-bottom: 8px;
  line-height: 1;
}
.preset-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-800, #212529);
  margin-bottom: 4px;
}
.preset-desc {
  font-size: 11px;
  color: var(--o-gray-500, #6c757d);
  line-height: 1.4;
}

</style>
