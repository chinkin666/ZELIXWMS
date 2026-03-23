/**
 * ControlPanel ユニットテスト / 控制面板组件单元测试
 *
 * ControlPanel.vue のレンダリングとアクションの検証
 * 验证 ControlPanel.vue 的渲染和操作
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ matched: [] }),
}))

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('./ODialog.vue', () => ({
  default: { name: 'ODialog', template: '<div />' },
}))

vi.mock('./OButton.vue', () => ({
  default: { name: 'OButton', template: '<button><slot /></button>', props: ['variant'] },
}))

vi.mock('./OFileUploader.vue', () => ({
  default: { name: 'OFileUploader', template: '<div />' },
}))

import ControlPanel from '../odoo/ControlPanel.vue'

describe('ControlPanel / コントロールパネルコンポーネント', () => {
  it('タイトルをブレッドクラムに表示する / 在面包屑中显示标题', () => {
    const wrapper = mount(ControlPanel, {
      props: { title: '商品一覧' },
    })
    expect(wrapper.text()).toContain('商品一覧')
  })

  it('showCreate時に作成ボタンを表示する / showCreate 时显示创建按钮', () => {
    const wrapper = mount(ControlPanel, {
      props: { title: '商品', showCreate: true },
    })
    expect(wrapper.text()).toContain('controlPanel.new')
  })

  it('カスタムcreateLabel を表示する / 显示自定义 createLabel', () => {
    const wrapper = mount(ControlPanel, {
      props: { title: '商品', showCreate: true, createLabel: '新規追加' },
    })
    expect(wrapper.text()).toContain('新規追加')
  })

  it('showSearch=falseで検索バーを非表示にする / showSearch=false 时隐藏搜索栏', () => {
    const wrapper = mount(ControlPanel, {
      props: { title: 'テスト', showSearch: false },
    })
    expect(wrapper.find('.o-cp-bottom').exists()).toBe(false)
  })
})
