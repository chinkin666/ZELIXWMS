import type { Ref, ComputedRef } from 'vue'
import type {
  FormTemplate,
  FormTemplateColumn,
  FormTemplateColumnChild,
  BarcodeConfig,
  FormFieldDefinition,
} from '@/types/formTemplate'

/**
 * ユニークID生成 / 唯一ID生成
 */
function generateId(): string {
  return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 列管理・子項目管理のコンポーザブル / 列管理・子项目管理的 composable
 *
 * @param template - テンプレート ref / 模板 ref
 * @param availableFields - 利用可能なフィールド一覧 / 可用字段列表
 */
export function useFormTemplateColumns(
  template: Ref<FormTemplate | null>,
  availableFields: ComputedRef<FormFieldDefinition[]>,
) {
  // ========== 列の追加・削除・移動 / 列的增删移动 ==========

  function handleAddColumn(type: 'single' | 'multi') {
    if (!template.value) return
    const fields = availableFields.value
    if (fields.length === 0) return

    const defaultField = fields[0]
    if (!defaultField) return

    const newColumn: FormTemplateColumn = {
      id: generateId(),
      type,
      label: defaultField.label,
      width: 'auto',
      order: template.value.columns.length,
    }

    if (type === 'single') {
      newColumn.field = defaultField.key
      newColumn.renderType = 'text'
    } else {
      newColumn.children = [
        {
          id: generateId(),
          field: defaultField.key,
          renderType: 'text',
        },
      ]
    }

    template.value.columns.push(newColumn)
  }

  function removeColumn(index: number) {
    if (!template.value) return
    template.value.columns.splice(index, 1)
    template.value.columns.forEach((col, i) => {
      col.order = i
    })
  }

  function moveColumn(index: number, direction: number) {
    if (!template.value) return
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= template.value.columns.length) return

    const columns = template.value.columns
    const temp = columns[index]
    const newIndexColumn = columns[newIndex]
    if (!temp || !newIndexColumn) return
    columns[index] = newIndexColumn
    columns[newIndex] = temp
    columns.forEach((col, i) => {
      col.order = i
    })
  }

  function moveColumnToTop(index: number) {
    if (!template.value || index === 0) return
    const columns = template.value.columns
    const [removed] = columns.splice(index, 1)
    if (!removed) return
    columns.unshift(removed)
    columns.forEach((col, i) => {
      col.order = i
    })
  }

  function moveColumnToBottom(index: number) {
    if (!template.value || index === template.value.columns.length - 1) return
    const columns = template.value.columns
    const [removed] = columns.splice(index, 1)
    if (!removed) return
    columns.push(removed)
    columns.forEach((col, i) => {
      col.order = i
    })
  }

  // ========== 子項目の管理 / 子项目管理 ==========

  function addChildContent(col: FormTemplateColumn) {
    if (!col.children) {
      col.children = []
    }
    const defaultField = availableFields.value[0]
    col.children.push({
      id: generateId(),
      field: defaultField?.key || '',
      label: defaultField?.label || '',
      renderType: 'text',
    })
  }

  function removeChildContent(col: FormTemplateColumn, index: number) {
    if (!col.children) return
    col.children.splice(index, 1)
  }

  function moveChildContent(col: FormTemplateColumn, index: number, direction: number) {
    if (!col.children) return
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= col.children.length) return

    const temp = col.children[index]
    const newIndexChild = col.children[newIndex]
    if (!temp || !newIndexChild) return
    col.children[index] = newIndexChild
    col.children[newIndex] = temp
  }

  // ========== フィールド変更ハンドラ / 字段变更处理 ==========

  function onSingleFieldChange(col: FormTemplateColumn) {
    const field = availableFields.value.find((f) => f.key === col.field)
    if (field) {
      col.label = field.label
      if (field.fieldType === 'date') {
        col.renderType = 'date'
        col.dateFormat = 'YYYY/MM/DD'
      } else {
        col.renderType = 'text'
      }
    }
  }

  function onChildFieldChange(child: FormTemplateColumnChild) {
    const field = availableFields.value.find((f) => f.key === child.field)
    if (field) {
      child.label = field.label
      if (field.fieldType === 'date') {
        child.renderType = 'date'
        child.dateFormat = 'YYYY/MM/DD'
      } else if (!child.renderType || child.renderType === 'text') {
        child.renderType = 'text'
      }
    }
  }

  // ========== レンダリングタイプ変更 / 渲染类型变更 ==========

  function onRenderTypeChange(col: FormTemplateColumn) {
    if (col.renderType === 'barcode') {
      col.barcodeConfig = { format: 'code128', width: 120, height: 40 }
    } else if (col.renderType === 'qrcode') {
      col.barcodeConfig = { format: 'qrcode', width: 60, height: 60 }
    } else {
      col.barcodeConfig = undefined
    }
  }

  function onChildRenderTypeChange(child: FormTemplateColumnChild) {
    if (child.renderType === 'barcode') {
      child.barcodeConfig = { format: 'code128', width: 120, height: 40 }
    } else if (child.renderType === 'qrcode') {
      child.barcodeConfig = { format: 'qrcode', width: 60, height: 60 }
    } else {
      child.barcodeConfig = undefined
    }
  }

  // ========== バーコード設定 / 条码配置 ==========

  function setBarcodeFormat(col: FormTemplateColumn, format: string) {
    if (!col.barcodeConfig) {
      const isBarcode = col.renderType === 'barcode'
      col.barcodeConfig = {
        format: format as BarcodeConfig['format'],
        width: isBarcode ? 120 : 60,
        height: isBarcode ? 40 : 60,
      }
    } else {
      col.barcodeConfig.format = format as BarcodeConfig['format']
    }
  }

  function setBarcodeSize(col: FormTemplateColumn, prop: 'width' | 'height', value: number) {
    if (!col.barcodeConfig) {
      col.barcodeConfig = {
        format: col.renderType === 'barcode' ? 'code128' : 'qrcode',
        width: prop === 'width' ? value : (col.renderType === 'barcode' ? 120 : 60),
        height: prop === 'height' ? value : (col.renderType === 'barcode' ? 40 : 60),
      }
    } else {
      col.barcodeConfig[prop] = value
    }
  }

  function setChildBarcodeFormat(child: FormTemplateColumnChild, format: string) {
    if (!child.barcodeConfig) {
      const isBarcode = child.renderType === 'barcode'
      child.barcodeConfig = {
        format: format as BarcodeConfig['format'],
        width: isBarcode ? 120 : 60,
        height: isBarcode ? 40 : 60,
      }
    } else {
      child.barcodeConfig.format = format as BarcodeConfig['format']
    }
  }

  function setChildBarcodeSize(child: FormTemplateColumnChild, prop: 'width' | 'height', value: number) {
    if (!child.barcodeConfig) {
      child.barcodeConfig = {
        format: child.renderType === 'barcode' ? 'code128' : 'qrcode',
        width: prop === 'width' ? value : (child.renderType === 'barcode' ? 120 : 60),
        height: prop === 'height' ? value : (child.renderType === 'barcode' ? 40 : 60),
      }
    } else {
      child.barcodeConfig[prop] = value
    }
  }

  // ========== 列幅モード / 列宽模式 ==========

  function isAutoWidth(width: number | 'auto' | string | undefined): boolean {
    return width === 'auto' || width === '*' || width === undefined
  }

  function setWidthMode(col: FormTemplateColumn, mode: string) {
    col.width = mode === 'auto' ? 'auto' : 100
  }

  return {
    handleAddColumn,
    removeColumn,
    moveColumn,
    moveColumnToTop,
    moveColumnToBottom,
    addChildContent,
    removeChildContent,
    moveChildContent,
    onSingleFieldChange,
    onChildFieldChange,
    onRenderTypeChange,
    onChildRenderTypeChange,
    setBarcodeFormat,
    setBarcodeSize,
    setChildBarcodeFormat,
    setChildBarcodeSize,
    isAutoWidth,
    setWidthMode,
  }
}
