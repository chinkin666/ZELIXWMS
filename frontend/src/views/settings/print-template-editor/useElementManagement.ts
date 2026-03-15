/**
 * 要素管理コンポーザブル / 元素管理组合式函数
 *
 * 印刷テンプレートエディタの要素 CRUD（追加・削除・複製・移動・選択・表示切替）ロジックを管理する。
 * 管理印刷模板编辑器的元素 CRUD（添加、删除、复制、移动、选择、可见切换）逻辑。
 */
import { type Ref } from 'vue'
import type {
  PrintBarcodeElement,
  PrintElement,
  PrintImageElement,
  PrintTemplate,
  PrintTextElement,
} from '@/types/printTemplate'
import type { TransformMapping } from '@/api/mappingConfig'

export interface UseElementManagementOptions {
  /** テンプレート ref / 模板 ref */
  template: Ref<PrintTemplate>
  /** 選択中要素 ID / 当前选中元素 ID */
  selectedId: Ref<string>
  /** 再描画スケジューラ / 重新渲染调度器 */
  scheduleRender: () => void
  /** トースト表示 / 显示 toast */
  showToast: (msg: string, type: string) => void
  /** i18n 翻訳関数 / i18n 翻译函数 */
  t: (key: string, fallback: string) => string
  /** Transformer 同期 / 同步 Transformer */
  syncTransformer: () => void
}

/** ID 生成ユーティリティ / ID 生成工具 */
function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2)
}

export function useElementManagement(options: UseElementManagementOptions) {
  const { template, selectedId, scheduleRender, showToast, t, syncTransformer } = options

  // --- 選択 / 选择 ---

  function select(id: string) {
    selectedId.value = id
    syncTransformer()
  }

  // --- 表示・ロック切替 / 可见・锁定切换 ---

  function toggleVisible(el: PrintElement) {
    el.visible = el.visible === false ? true : false
    scheduleRender()
  }

  function toggleLocked(el: PrintElement) {
    el.locked = !el.locked
    scheduleRender()
  }

  // --- レイヤー操作 / 图层操作 ---

  function moveLayer(idx: number, delta: -1 | 1) {
    const list = template.value.elements
    const to = idx + delta
    if (to < 0 || to >= list.length) return
    const [it] = list.splice(idx, 1)
    if (!it) return
    list.splice(to, 0, it)
    scheduleRender()
  }

  function duplicateLayer(idx: number) {
    const src = template.value.elements[idx]
    if (!src) return
    const cloned = JSON.parse(JSON.stringify(src)) as PrintElement
    cloned.id = generateId()
    cloned.name = `${src.name} copy`
    cloned.xMm = (cloned.xMm ?? 0) + 2
    cloned.yMm = (cloned.yMm ?? 0) + 2
    template.value.elements.splice(idx + 1, 0, cloned)
    selectedId.value = cloned.id
    scheduleRender()
  }

  function removeSelected() {
    if (!selectedId.value) return
    template.value.elements = template.value.elements.filter((e) => e.id !== selectedId.value)
    selectedId.value = ''
    scheduleRender()
  }

  // --- 要素追加 / 添加元素 ---

  function addText() {
    const id = generateId()
    template.value.elements.push({
      id,
      name: 'Text',
      type: 'text',
      xMm: 10,
      yMm: 10,
      visible: true,
      locked: false,
      fontFamily: 'sans-serif',
      fontSizePt: 12,
      align: 'left',
      letterSpacingPx: 0,
    } as PrintTextElement)
    selectedId.value = id
    scheduleRender()
  }

  function addBarcode() {
    const id = generateId()
    template.value.elements.push({
      id,
      name: 'Barcode',
      type: 'barcode',
      xMm: 10,
      yMm: 20,
      visible: true,
      locked: false,
      format: 'code128',
      widthMm: 60,
      heightMm: 18,
      options: { includetext: false },
    } as PrintBarcodeElement)
    selectedId.value = id
    scheduleRender()
  }

  function addImage() {
    const id = generateId()
    template.value.elements.push({
      id,
      name: 'Image',
      type: 'image',
      xMm: 10,
      yMm: 30,
      visible: true,
      locked: false,
      imageData: '',
      widthMm: 50,
      heightMm: 50,
    } as PrintImageElement)
    selectedId.value = id
    scheduleRender()
  }

  function insertField(key: string) {
    const id = generateId()

    const transformMapping: TransformMapping = {
      targetField: 'text',
      inputs: [
        {
          id: generateId(),
          type: 'column',
          column: key,
        },
      ],
      combine: {
        plugin: 'combine.first',
      },
    }

    const newElement: PrintTextElement = {
      id,
      name: `Text: ${key}`,
      type: 'text',
      xMm: 10,
      yMm: 10 + template.value.elements.length * 15,
      visible: true,
      locked: false,
      transformMapping,
      fontFamily: 'sans-serif',
      fontSizePt: 12,
      align: 'left',
      letterSpacingPx: 0,
    }

    template.value.elements.push(newElement)
    selectedId.value = id
    scheduleRender()
    showToast(t('wms.printTemplate.textLayerAdded', `テキストレイヤーを追加しました: ${key}`), 'success')
  }

  // --- 画像操作 / 图片操作 ---

  function clearImage(selectedEl: PrintElement | null) {
    if (selectedEl && selectedEl.type === 'image') {
      ;(selectedEl as PrintImageElement).imageData = ''
      scheduleRender()
    }
  }

  function onImageFileChange(e: Event, selectedEl: PrintElement | null) {
    const input = e.target as HTMLInputElement
    const file = input?.files?.[0]
    if (!file) return

    if (!selectedEl || selectedEl.type !== 'image') {
      showToast(t('wms.printTemplate.selectImageFirst', '画像要素を先に選択してください'), 'warning')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result
      if (typeof result === 'string') {
        ;(selectedEl as PrintImageElement).imageData = result
        const img = new Image()
        img.onload = () => {
          const aspectRatio = img.width / img.height
          const currentWidth = (selectedEl as PrintImageElement).widthMm || 50
          if (currentWidth > 0) {
            ;(selectedEl as PrintImageElement).heightMm = currentWidth / aspectRatio
          }
          scheduleRender()
        }
        img.onerror = () => {
          showToast(t('wms.printTemplate.imageLoadFailed', '画像の読み込みに失敗しました'), 'danger')
        }
        img.src = result
      }
    }
    reader.onerror = () => {
      showToast(t('wms.printTemplate.fileReadFailed', 'ファイルの読み取りに失敗しました'), 'danger')
    }
    reader.readAsDataURL(file)

    if (input) input.value = ''
  }

  return {
    select,
    toggleVisible,
    toggleLocked,
    moveLayer,
    duplicateLayer,
    removeSelected,
    addText,
    addBarcode,
    addImage,
    insertField,
    clearImage,
    onImageFileChange,
  }
}
