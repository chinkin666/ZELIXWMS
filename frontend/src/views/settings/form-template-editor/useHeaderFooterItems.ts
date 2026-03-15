import type { Ref } from 'vue'
import type { FormTemplate, HeaderFooterItem } from '@/types/formTemplate'
import type { useI18n } from '@/composables/useI18n'

/**
 * ユニークID生成 / 唯一ID生成
 */
function generateId(): string {
  return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * ヘッダー・フッター項目管理のコンポーザブル / 页眉页脚项目管理的 composable
 *
 * @param template - テンプレート ref / 模板 ref
 * @param t - i18n 翻訳関数 / i18n 翻译函数
 */
export function useHeaderFooterItems(
  template: Ref<FormTemplate | null>,
  t: ReturnType<typeof useI18n>['t'],
) {
  // ========== ラベル・バッジ取得 / 标签・徽章获取 ==========

  function getPositionLabel(position: string): string {
    switch (position) {
      case 'header': return t('wms.formEditor.header', 'ヘッダー')
      case 'footer': return t('wms.formEditor.footer', 'フッター')
      case 'title': return t('wms.formEditor.titleLabel', 'タイトル')
      default: return position
    }
  }

  function getPositionBadgeClass(position: string): string {
    switch (position) {
      case 'header': return 'success'
      case 'footer': return 'warning'
      case 'title': return 'primary'
      default: return 'info'
    }
  }

  function getTypeLabel(type: string): string {
    switch (type) {
      case 'text': return t('wms.formEditor.text', 'テキスト')
      case 'columns': return t('wms.formEditor.columns', 'カラム')
      case 'table': return t('wms.formEditor.table', 'テーブル')
      default: return type
    }
  }

  function getShowOnLabel(showOn: string): string {
    switch (showOn) {
      case 'all': return t('wms.formEditor.allPages', '全ページ')
      case 'first': return t('wms.formEditor.firstOnly', '最初のみ')
      case 'last': return t('wms.formEditor.lastOnly', '最後のみ')
      default: return showOn
    }
  }

  // ========== 項目の追加・削除・移動 / 项目的增删移动 ==========

  function addHeaderFooterItem() {
    if (!template.value) return
    if (!template.value.headerFooterItems) {
      template.value.headerFooterItems = []
    }

    const newItem: HeaderFooterItem = {
      id: generateId(),
      position: 'header',
      showOn: 'all',
      type: 'text',
      style: {
        fontSize: 10,
        alignment: 'center',
      },
      text: '',
    }

    template.value.headerFooterItems.push(newItem)
  }

  function removeHFItem(index: number) {
    if (!template.value?.headerFooterItems) return
    template.value.headerFooterItems.splice(index, 1)
  }

  function moveHFItem(index: number, direction: number) {
    if (!template.value?.headerFooterItems) return
    const items = template.value.headerFooterItems
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= items.length) return

    const temp = items[index]
    const other = items[newIndex]
    if (!temp || !other) return
    items[index] = other
    items[newIndex] = temp
  }

  // ========== タイプ変更 / 类型变更 ==========

  function onHFTypeChange(item: HeaderFooterItem) {
    if (item.type === 'text') {
      item.text = item.text || ''
      item.columns = undefined
      item.table = undefined
    } else if (item.type === 'columns') {
      item.columns = item.columns || [{ text: '', width: '*', alignment: 'left' }]
      item.text = undefined
      item.table = undefined
    } else if (item.type === 'table') {
      item.table = item.table || { widths: ['*', '*'], body: [['', '']] }
      item.text = undefined
      item.columns = undefined
    }
  }

  // ========== カラム管理 / 列管理 ==========

  function addHFColumn(item: HeaderFooterItem) {
    if (!item.columns) {
      item.columns = []
    }
    item.columns.push({ text: '', width: '*', alignment: 'left' })
  }

  function removeHFColumn(item: HeaderFooterItem, index: number) {
    if (!item.columns) return
    item.columns.splice(index, 1)
  }

  // ========== テーブル管理 / 表格管理 ==========

  function addHFTableRow(item: HeaderFooterItem) {
    if (!item.table) {
      item.table = { widths: ['*'], body: [['']] }
      return
    }
    const colCount = item.table.body[0]?.length || 1
    item.table.body.push(Array(colCount).fill(''))
  }

  function addHFTableCol(item: HeaderFooterItem) {
    if (!item.table) {
      item.table = { widths: ['*'], body: [['']] }
      return
    }
    item.table.widths = item.table.widths || []
    item.table.widths.push('*')
    for (const row of item.table.body) {
      row.push('')
    }
  }

  function removeHFTableRow(item: HeaderFooterItem, rowIndex: number) {
    if (!item.table?.body) return
    item.table.body.splice(rowIndex, 1)
  }

  function removeHFTableCol(item: HeaderFooterItem, colIndex: number) {
    if (!item.table?.body) return
    item.table.widths?.splice(colIndex, 1)
    for (const row of item.table.body) {
      row.splice(colIndex, 1)
    }
  }

  function updateTableCell(item: HeaderFooterItem, rowIdx: number, cellIdx: number, value: string) {
    if (!item.table?.body?.[rowIdx]) return
    item.table.body[rowIdx][cellIdx] = value
  }

  function setTableStyle(item: HeaderFooterItem, key: string, value: any) {
    if (!item.table) {
      item.table = { widths: ['*'], body: [['']], tableStyle: {} }
    }
    if (!item.table.tableStyle) {
      item.table.tableStyle = {}
    }
    ;(item.table.tableStyle as any)[key] = value
  }

  return {
    getPositionLabel,
    getPositionBadgeClass,
    getTypeLabel,
    getShowOnLabel,
    addHeaderFooterItem,
    removeHFItem,
    moveHFItem,
    onHFTypeChange,
    addHFColumn,
    removeHFColumn,
    addHFTableRow,
    addHFTableCol,
    removeHFTableRow,
    removeHFTableCol,
    updateTableCell,
    setTableStyle,
  }
}
