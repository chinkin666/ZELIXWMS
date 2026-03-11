import { h } from 'vue'
import type { FunctionalComponent } from 'vue'

// Placeholder symbol (was element-plus TableV2Placeholder)
const TableV2Placeholder = Symbol('placeholder')

export interface HeaderGroupCellStyle {
  // 背景色
  backgroundColor?: string
  // 文字颜色
  color?: string
}

export interface HeaderGroupConfig {
  // 分组配置：每个分组包含的列数
  // 例如：[4, 2] 表示第一行：前4列一组，接下来2列一组
  groups: number[]
  // 分组标题
  titles: string[]
  // 分组样式类名
  className?: string
  // 每个分组单元格的样式（可选，如果提供则覆盖 className）
  cellStyles?: HeaderGroupCellStyle[]
}

export interface HeaderGroupingConfig {
  // 每一行的分组配置
  rows: HeaderGroupConfig[]
}

interface HeaderSlotParam {
  cells: any[]
  columns: any[]
  headerIndex: number
}

export const createCustomizedHeader = (
  groupingConfig?: HeaderGroupingConfig,
): FunctionalComponent<HeaderSlotParam> => {
  return ({ cells, columns, headerIndex }) => {
    // 如果没有分组配置，或者是最底层（最后一行），直接返回原始 cells
    if (!groupingConfig || headerIndex === groupingConfig.rows.length) {
      return cells
    }

    const groupConfig = groupingConfig.rows[headerIndex]
    if (!groupConfig) {
      return cells
    }

    const groupCells = [] as typeof cells
    let width = 0
    let idx = 0
    let groupIndex = 0
    let groupStartCell: (typeof cells)[number] | null = null

    columns.forEach((column, columnIndex) => {
      const cellVNode = cells[columnIndex]
      if (!cellVNode) return

      // 选择列 / 操作列 等辅助列，不参与分组但需要保留占位
      if (column.key === '__selection__' || column.key === 'selection' || column.key === 'actions' || column.key === '__actions__') {
        // 确保宽度正确获取，优先使用 column.width，然后是 cellVNode 中的宽度
        const colWidth = column.width ?? cellVNode.props?.column?.width ?? cellVNode.props?.style?.width ?? 80
        const auxStyle: Record<string, string> = {
          ...cellVNode.props?.style,
          width: typeof colWidth === 'number' ? `${colWidth}px` : colWidth,
          minHeight: '44px',
          height: 'auto',
        }

        // 对于多选列，在分组行中也显示 checkbox
        // 如果是第一行分组行（headerIndex === 0），显示 checkbox；否则显示空占位
        let content: any = null
        if ((column.key === '__selection__' || column.key === 'selection') && headerIndex === 0) {
          // 在分组行中，我们也需要显示 checkbox，所以直接使用原始的 cellVNode
          // 但为了保持一致性，我们创建一个新的 checkbox
          // 注意：这里我们需要从外部传入 isAllSelected 和 toggleAllSelection
          // 但由于这是函数组件，我们无法直接访问，所以先使用原始 cellVNode 的内容
          content = cellVNode.children || null
        }

        groupCells.push(
          h('div', {
            class: 'flex items-center justify-center custom-header-cell custom-header-cell--aux',
            role: 'columnheader',
            style: auxStyle,
            'data-group-index': 'aux',
          }, content ? (Array.isArray(content) ? content : [content]) : []),
        )
        return
      }

      // 如果是占位符列（固定列），直接添加
      if (column.placeholderSign === TableV2Placeholder) {
        const placeholderCell = cells[columnIndex]
        if (placeholderCell) {
          groupCells.push(placeholderCell)
        }
      } else {
        if (idx === 0) {
          groupStartCell = cells[columnIndex] ?? null
        }

        const currentCell = cells[columnIndex]
        if (currentCell?.props?.column?.width) {
          width += currentCell.props.column.width
        }
        idx++

        // 获取当前分组应该包含的列数
        const groupSize = groupConfig.groups[groupIndex] || 1
        const nextColumn = columns[columnIndex + 1]

        // 判断是否应该结束当前分组
        const shouldEndGroup =
          columnIndex === columns.length - 1 ||
          nextColumn?.placeholderSign === TableV2Placeholder ||
          idx === groupSize

        if (shouldEndGroup) {
          // 如果 titles 数组中有对应的标题，使用它；如果为空字符串，则不显示文本
          const groupTitle = groupConfig.titles[groupIndex]
          const displayTitle = groupTitle === '' ? '' : groupTitle || `Group ${groupIndex + 1}`
          const groupClassName = groupConfig.className || ''

          // 获取当前分组的样式配置
          const cellStyle = groupConfig.cellStyles?.[groupIndex]
          const baseCell = groupStartCell ?? cells[columnIndex]
          if (!baseCell) return
          const customStyle: Record<string, string> = {
            ...baseCell.props?.style,
            width: `${width}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }

          // 如果提供了单独的颜色配置，则应用
          if (cellStyle) {
            if (cellStyle.backgroundColor) {
              customStyle.backgroundColor = cellStyle.backgroundColor
            }
            if (cellStyle.color) {
              customStyle.color = cellStyle.color
            }
          }

          groupCells.push(
            h(
              'div',
              {
                class: `flex items-center justify-start custom-header-cell ${groupClassName}`,
                'data-group-index': String(groupIndex),
                role: 'columnheader',
                style: customStyle,
              },
              displayTitle,
            ),
          )

          width = 0
          idx = 0
          groupStartCell = null
          groupIndex++
        }
      }
    })

    return groupCells
  }
}
