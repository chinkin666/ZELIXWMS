import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorBoundary from '../ErrorBoundary.vue'

describe('ErrorBoundary', () => {
  it('renders slot content when there is no error', () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<p>Hello World</p>',
      },
    })
    expect(wrapper.text()).toContain('Hello World')
    expect(wrapper.find('.error-boundary').exists()).toBe(false)
  })

  it('displays error UI when error state is set', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<p>Content</p>',
      },
    })

    // Simulate what onErrorCaptured does by setting the exposed reactive ref
    const vm = wrapper.vm as any
    vm.error = new Error('Simulated error')
    await wrapper.vm.$nextTick()

    // Verify fallback UI appears
    expect(wrapper.find('.error-boundary').exists()).toBe(true)
    expect(wrapper.find('.error-boundary__title').text()).toBe(
      '予期しないエラーが発生しました',
    )
    expect(wrapper.find('.error-boundary__message').text()).toBe('Simulated error')
  })

  it('resets error state when reset button is clicked', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<p>Content</p>',
      },
    })

    // Set error state
    const vm = wrapper.vm as any
    vm.error = new Error('Some error')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.error-boundary').exists()).toBe(true)

    // Click reset button
    await wrapper.find('.error-boundary__button').trigger('click')

    // Slot content should be visible again
    expect(wrapper.find('.error-boundary').exists()).toBe(false)
    expect(wrapper.text()).toContain('Content')
  })
})
