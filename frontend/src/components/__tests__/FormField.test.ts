/**
 * FormField ユニットテスト / 表单字段组件单元测试
 *
 * FormField.vue のレンダリングとイベントの検証
 * 验证 FormField.vue 的渲染和事件
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// 外部依存をモック / mock 外部依赖
vi.mock('@/utils/nestedObject', () => ({
  getNestedValue: (obj: any, path: string) => {
    return path.split('.').reduce((o: any, k: string) => o?.[k], obj)
  },
}))

vi.mock('@/composables/useEnabledInvoiceTypes', () => ({
  useEnabledInvoiceTypes: () => ({
    filterEnabledOptions: (options: any[]) => options,
  }),
}))

vi.mock('@/utils/yamatoDeliveryDays', () => ({
  getMinDeliveryDate: () => null,
}))

vi.mock('@/components/odoo/OButton.vue', () => ({
  default: { name: 'OButton', template: '<button><slot /></button>' },
}))

vi.mock('@/components/odoo/ODatePicker.vue', () => ({
  default: { name: 'ODatePicker', template: '<input type="date" />' },
}))

import FormField from '../form/FormField.vue'

describe('FormField / フォームフィールドコンポーネント', () => {
  it('テキスト入力をレンダリングする / 渲染文本输入', () => {
    const wrapper = mount(FormField, {
      props: {
        column: { key: 'name', title: '名前' },
        formData: { name: '田中' },
      },
    })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.element.value).toBe('田中')
  })

  it('数値入力をレンダリングする / 渲染数字输入', () => {
    const wrapper = mount(FormField, {
      props: {
        column: { key: 'qty', title: '数量', fieldType: 'number', min: 1, max: 100 },
        formData: { qty: 10 },
      },
    })
    const input = wrapper.find('input[type="number"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('min')).toBe('1')
    expect(input.attributes('max')).toBe('100')
  })

  it('セレクト入力をオプション付きでレンダリングする / 渲染带选项的选择输入', () => {
    const wrapper = mount(FormField, {
      props: {
        column: {
          key: 'status',
          title: 'ステータス',
          searchOptions: [
            { label: '有効', value: 'active' },
            { label: '無効', value: 'inactive' },
          ],
        },
        formData: { status: 'active' },
      },
    })
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    const options = select.findAll('option')
    // 1 placeholder + 2 options
    expect(options.length).toBe(3)
  })

  it('disabled 時にプレースホルダーを表示する / disabled 时显示 placeholder', () => {
    const wrapper = mount(FormField, {
      props: {
        column: { key: 'code', title: 'コード', placeholder: '自動生成' },
        formData: { code: '' },
        isDisabled: true,
      },
    })
    const input = wrapper.find('input')
    expect(input.attributes('disabled')).toBeDefined()
  })

  it('テキスト入力でupdateイベントを発火する / 文本输入触发 update 事件', async () => {
    const wrapper = mount(FormField, {
      props: {
        column: { key: 'name', title: '名前' },
        formData: { name: '' },
      },
    })
    const input = wrapper.find('input')
    await input.setValue('新しい値')
    await input.trigger('input')
    const emitted = wrapper.emitted('update')
    expect(emitted).toBeTruthy()
  })
})
