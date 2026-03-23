import { ref, watch, onMounted, nextTick } from 'vue'
import type { Ref, ComputedRef } from 'vue'

/**
 * ソート状態管理コンポーザブル / 排序状态管理组合式函数
 *
 * カテゴリグループ単位のソート選択、ポップオーバー制御、
 * localStorage 永続化を提供する。
 * 提供按分类组的排序选择、弹出框控制、localStorage 持久化。
 */

type SortMode = 'client' | 'server'
type SortOrder = 'asc' | 'desc' | null

type CategoryGroup = {
  title: string
  fields: Array<{
    key: string
    dataKey: string
    label: string
    column: any
  }>
  minWidth?: number
}

/** コンポーザブルの入力パラメータ / 组合式函数的输入参数 */
interface UseOrderTableSortParams {
  /** ソートモード / 排序模式 */
  sortMode: Ref<SortMode>
  /** ページキー（localStorage 保存用） / 页面键（用于 localStorage 保存） */
  pageKeyProp: Ref<string | undefined>
  /** カテゴリグループ（ソートフィールド情報の取得用） / 分类组（用于获取排序字段信息） */
  categoryGroups: ComputedRef<CategoryGroup[]>
  /** イベント発火関数 / 事件触发函数 */
  emits: {
    (e: 'update:sortBy', value: string | null): void
    (e: 'update:sortOrder', value: SortOrder): void
    (e: 'sort-change', payload: { sortBy: string | null; sortOrder: SortOrder; mode: SortMode }): void
  }
}

export function useOrderTableSort(params: UseOrderTableSortParams) {
  const { sortMode, pageKeyProp, categoryGroups, emits } = params

  // ソート関連状態 / 排序相关状态
  const sortPopoverVisible = ref<Record<string, boolean>>({})
  const sortFieldForGroup = ref<Record<string, string>>({})
  const sortOrderForGroup = ref<Record<string, 'asc' | 'desc' | null>>({})

  /**
   * localStorage キー取得 / 获取 localStorage key
   */
  const getSortConfigKey = (): string => {
    const pageKey = pageKeyProp.value
    return pageKey ? `order-table-sort-${pageKey}` : 'order-table-sort-default'
  }

  /**
   * ソートルールを適用してイベント発火 / 应用排序规则并触发事件
   */
  const applySorting = () => {
    const sortRules: Array<{ field: string; order: 'asc' | 'desc' }> = []
    for (const [groupTitle, field] of Object.entries(sortFieldForGroup.value)) {
      if (field && sortOrderForGroup.value[groupTitle]) {
        sortRules.push({
          field,
          order: sortOrderForGroup.value[groupTitle] as 'asc' | 'desc',
        })
      }
    }

    if (sortRules.length > 0) {
      const primarySort = sortRules[0]
      if (primarySort) {
        emits('update:sortBy', primarySort.field)
        emits('update:sortOrder', primarySort.order)
        emits('sort-change', {
          sortBy: primarySort.field,
          sortOrder: primarySort.order,
          mode: sortMode.value,
        })
      }
    } else {
      emits('update:sortBy', null)
      emits('update:sortOrder', null)
    }
  }

  /**
   * localStorage からソート設定を読み込み / 从 localStorage 加载排序配置
   */
  const loadSortConfig = () => {
    if (!pageKeyProp.value) return

    try {
      const key = getSortConfigKey()
      const saved = localStorage.getItem(key)
      if (saved) {
        const config = JSON.parse(saved)
        if (config.sortFieldForGroup) {
          sortFieldForGroup.value = config.sortFieldForGroup
        }
        if (config.sortOrderForGroup) {
          sortOrderForGroup.value = config.sortOrderForGroup
        }
        if (Object.keys(sortFieldForGroup.value).length > 0) {
          nextTick(() => {
            applySorting()
          })
        }
      }
    } catch (_e) {
      // ソート設定読み込み失敗 / 排序配置加载失败
    }
  }

  /**
   * ソート設定を localStorage に保存 / 将排序配置保存到 localStorage
   */
  const saveSortConfig = () => {
    if (!pageKeyProp.value) return

    try {
      const key = getSortConfigKey()
      const config = {
        sortFieldForGroup: sortFieldForGroup.value,
        sortOrderForGroup: sortOrderForGroup.value,
      }
      localStorage.setItem(key, JSON.stringify(config))
    } catch (_e) {
      // ソート設定保存失敗 / 排序配置保存失败
    }
  }

  // ソート設定変更を監視して永続化 / 监听排序配置变化并持久化
  watch(
    [sortFieldForGroup, sortOrderForGroup],
    () => {
      saveSortConfig()
    },
    { deep: true },
  )

  // マウント時にソート設定を読み込み / 挂载时加载排序配置
  onMounted(() => {
    loadSortConfig()
  })

  /**
   * ソートポップオーバーの表示/非表示切替 / 切换排序弹出框的显示/隐藏
   */
  const toggleSortPopover = (groupTitle: string) => {
    for (const [title, visible] of Object.entries(sortPopoverVisible.value)) {
      if (title !== groupTitle && visible) {
        sortPopoverVisible.value[title] = false
      }
    }
    sortPopoverVisible.value[groupTitle] = !sortPopoverVisible.value[groupTitle]
  }

  /**
   * テーブルクリック時に全ポップオーバーを閉じる / 点击表格时关闭所有弹出框
   */
  const handleTableClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (
      target.closest('.sort-dropdown') ||
      target.closest('.sort-button') ||
      target.closest('.sort-dropdown-wrapper')
    ) {
      return
    }
    for (const title in sortPopoverVisible.value) {
      sortPopoverVisible.value[title] = false
    }
  }

  /**
   * グループのソート順序を設定 / 设置分组的排序顺序
   */
  const setSortOrderForGroup = (groupTitle: string, order: 'asc' | 'desc') => {
    sortOrderForGroup.value[groupTitle] = order
    applySorting()
  }

  /**
   * ソートフィールド変更処理 / 排序字段变更处理
   * 他グループのソートをクリアする / 清除其他分组的排序
   */
  const handleSortFieldChange = (groupTitle: string) => {
    for (const [title, field] of Object.entries(sortFieldForGroup.value)) {
      if (title !== groupTitle && field) {
        sortFieldForGroup.value[title] = ''
        sortOrderForGroup.value[title] = null
      }
    }
    applySorting()
    nextTick(() => {
      sortPopoverVisible.value[groupTitle] = true
    })
  }

  /**
   * ネイティブ select 要素のソートフィールド変更処理 / 原生 select 元素的排序字段变更处理
   */
  const handleSortFieldSelectChange = (groupTitle: string, event: Event) => {
    const value = (event.target as HTMLSelectElement).value
    sortFieldForGroup.value[groupTitle] = value
    handleSortFieldChange(groupTitle)
  }

  /**
   * グループのソートをクリア / 清除分组的排序
   */
  const clearSortForGroup = (groupTitle: string) => {
    sortFieldForGroup.value[groupTitle] = ''
    sortOrderForGroup.value[groupTitle] = null
    applySorting()
    sortPopoverVisible.value[groupTitle] = false
  }

  /**
   * グループの現在のソート順序を取得 / 获取分组的当前排序顺序
   */
  const getSortOrderForGroup = (groupTitle: string): 'asc' | 'desc' | null => {
    return sortOrderForGroup.value[groupTitle] || null
  }

  /**
   * グループのソート情報テキストを取得（表示用） / 获取分组的排序信息文本（用于显示）
   */
  const getSortInfoForGroup = (groupTitle: string): string => {
    const field = sortFieldForGroup.value[groupTitle]
    const order = sortOrderForGroup.value[groupTitle]
    if (!field || !order) return ''

    const group = categoryGroups.value.find((g) => g.title === groupTitle)
    if (!group) return ''
    const fieldInfo = group.fields.find((f) => f.dataKey === field)
    if (!fieldInfo) return ''

    const orderSymbol = order === 'asc' ? '\u2191' : '\u2193'
    return `${fieldInfo.label} ${orderSymbol}`
  }

  return {
    sortPopoverVisible,
    sortFieldForGroup,
    sortOrderForGroup,
    toggleSortPopover,
    handleTableClick,
    setSortOrderForGroup,
    handleSortFieldSelectChange,
    clearSortForGroup,
    getSortOrderForGroup,
    getSortInfoForGroup,
    applySorting,
  }
}
