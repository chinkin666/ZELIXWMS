/**
 * SearchForm ユニットテスト / 搜索表单组件单元测试
 *
 * SearchForm.vue のフィールド生成とイベントの検証
 * 验证 SearchForm.vue 的字段生成和事件
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

import SearchForm from '../search/SearchForm.vue'

describe('SearchForm / 検索フォームコンポーネント', () => {
  const baseColumns = [
    { key: 'name', title: '名前', searchable: true },
    { key: 'status', title: 'ステータス', searchable: true, searchType: 'select', searchOptions: [{ label: '有効', value: 'active' }] },
    { key: 'hiddenField', title: '非表示', searchable: false },
  ]

  it('searchableなカラムのみフィールドを表示する / 只显示 searchable 的列字段', () => {
    const wrapper = mount(SearchForm, {
      props: { columns: baseColumns },
    })
    const fields = wrapper.findAll('.search-field')
    // name と status の2つ / name 和 status 两个
    expect(fields.length).toBe(2)
  })

  it('検索ボタンクリックでsearchイベントを発火する / 点击搜索按钮触发 search 事件', async () => {
    const wrapper = mount(SearchForm, {
      props: { columns: baseColumns },
    })
    const searchBtn = wrapper.find('.o-btn-primary')
    await searchBtn.trigger('click')
    expect(wrapper.emitted('search')).toBeTruthy()
  })

  it('クリアボタンクリックでフォームをリセットする / 点击清除按钮重置表单', async () => {
    const wrapper = mount(SearchForm, {
      props: { columns: baseColumns },
    })
    const clearBtn = wrapper.find('.o-btn-secondary')
    await clearBtn.trigger('click')
    expect(wrapper.emitted('search')).toBeTruthy()
    // リセット時は空のペイロード / 重置时为空 payload
    const payload = wrapper.emitted('search')?.[0]?.[0]
    expect(payload).toEqual({})
  })

  it('セレクト型フィールドをレンダリングする / 渲染选择型字段', () => {
    const wrapper = mount(SearchForm, {
      props: { columns: baseColumns },
    })
    const selects = wrapper.findAll('select')
    expect(selects.length).toBeGreaterThanOrEqual(1)
  })
})
