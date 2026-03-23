/**
 * OPager ユニットテスト / 分页组件单元测试
 *
 * OPager.vue のページネーションロジックの検証
 * 验证 OPager.vue 的分页逻辑
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OPager from '../odoo/OPager.vue'

describe('OPager / ページャーコンポーネント', () => {
  it('正しい範囲テキストを表示する / 显示正确的范围文本', () => {
    const wrapper = mount(OPager, {
      props: { total: 100, offset: 0, limit: 20 },
    })
    expect(wrapper.find('.o-pager-value').text()).toBe('1-20 / 100')
  })

  it('中間ページの範囲を表示する / 显示中间页的范围', () => {
    const wrapper = mount(OPager, {
      props: { total: 100, offset: 40, limit: 20 },
    })
    expect(wrapper.find('.o-pager-value').text()).toBe('41-60 / 100')
  })

  it('最終ページでは上限をtotalに制限する / 最后一页限制上限为 total', () => {
    const wrapper = mount(OPager, {
      props: { total: 55, offset: 40, limit: 20 },
    })
    expect(wrapper.find('.o-pager-value').text()).toBe('41-55 / 55')
  })

  it('最初のページでは前ボタンが無効化される / 第一页禁用前一页按钮', () => {
    const wrapper = mount(OPager, {
      props: { total: 100, offset: 0, limit: 20 },
    })
    const buttons = wrapper.findAll('.o-pager-btn')
    expect(buttons[0]?.attributes('disabled')).toBeDefined()
  })

  it('最後のページでは次ボタンが無効化される / 最后一页禁用下一页按钮', () => {
    const wrapper = mount(OPager, {
      props: { total: 20, offset: 0, limit: 20 },
    })
    const buttons = wrapper.findAll('.o-pager-btn')
    expect(buttons[1]?.attributes('disabled')).toBeDefined()
  })

  it('次ボタンクリックでupdate:offsetを発火する / 点击下一页按钮触发 update:offset', async () => {
    const wrapper = mount(OPager, {
      props: { total: 100, offset: 0, limit: 20 },
    })
    const buttons = wrapper.findAll('.o-pager-btn')
    await buttons[1]?.trigger('click')
    expect(wrapper.emitted('update:offset')?.[0]).toEqual([20])
  })
})
