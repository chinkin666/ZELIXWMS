/**
 * ODialog ユニットテスト / 对话框组件单元测试
 *
 * ODialog.vue のオープン/クローズと確認イベントの検証
 * 验证 ODialog.vue 的打开/关闭和确认事件
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('../../composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('./OButton.vue', () => ({
  default: { name: 'OButton', template: '<button @click="$emit(\'click\')"><slot /></button>', props: ['variant'] },
}))

import ODialog from '../odoo/ODialog.vue'

describe('ODialog / ダイアログコンポーネント', () => {
  it('open=false のときは表示しない / open=false 时不显示', () => {
    const wrapper = mount(ODialog, {
      props: { open: false, title: 'テスト' },
      global: { stubs: { Teleport: true } },
    })
    expect(wrapper.find('.o-dialog-backdrop').exists()).toBe(false)
  })

  it('open=true のときにダイアログを表示する / open=true 时显示对话框', () => {
    const wrapper = mount(ODialog, {
      props: { open: true, title: '確認' },
      global: { stubs: { Teleport: true } },
    })
    expect(wrapper.find('.o-dialog-backdrop').exists()).toBe(true)
    expect(wrapper.find('.o-dialog-title').text()).toBe('確認')
  })

  it('閉じるボタンでcloseイベントを発火する / 点击关闭按钮触发 close 事件', async () => {
    const wrapper = mount(ODialog, {
      props: { open: true, title: 'テスト' },
      global: { stubs: { Teleport: true } },
    })
    await wrapper.find('.o-dialog-close').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('サイズclassが適用される / 应用尺寸 class', () => {
    const wrapper = mount(ODialog, {
      props: { open: true, title: 'テスト', size: 'lg' },
      global: { stubs: { Teleport: true } },
    })
    expect(wrapper.find('.o-dialog--lg').exists()).toBe(true)
  })

  it('modelValueでも表示制御できる / 也可以通过 modelValue 控制显示', () => {
    const wrapper = mount(ODialog, {
      props: { modelValue: true, title: 'MV' },
      global: { stubs: { Teleport: true } },
    })
    expect(wrapper.find('.o-dialog-backdrop').exists()).toBe(true)
  })
})
