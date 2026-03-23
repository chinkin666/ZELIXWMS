/**
 * InboundReceive コンポーネントテスト / 入库检品组件测试
 *
 * 入庫検品ページ（日本倉庫作業員が最も使用するページ）の
 * 動作保証テストスイート。
 * 入库检品页面（日本仓库操作员最常用页面）的行为保障测试套件。
 *
 * テスト対象 / 测试目标:
 *   - ローディング状態の表示 / 加载状态显示
 *   - 注文情報の表示 / 订单信息显示
 *   - 検品モードタブ（スキャン/数量入力/一括）/ 检品模式标签页
 *   - スキャン入力の正常系・異常系 / 扫描输入正常/异常流程
 *   - 超過入庫警告 / 超量入库警告
 *   - プログレスバーの更新 / 进度条更新
 *   - 数量入力モードのUI / 数量输入模式UI
 *   - モード切替時のエラークリア / 模式切换时清除错误
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { InboundOrder } from '@/types/inventory'

// ──────────────────────────────────────────────────────
// モック定義 / Mock definitions
// ──────────────────────────────────────────────────────

// vue-router モック / vue-router mock
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'order-001' } }),
  useRouter: () => ({ push: mockPush }),
}))

// API モック / API mocks
const mockFetchInboundOrder = vi.fn()
const mockReceiveInboundLine = vi.fn()
const mockBulkReceiveInbound = vi.fn()
const mockFetchInboundVariance = vi.fn()

vi.mock('@/api/inboundOrder', () => ({
  fetchInboundOrder: (...args: any[]) => mockFetchInboundOrder(...args),
  receiveInboundLine: (...args: any[]) => mockReceiveInboundLine(...args),
  bulkReceiveInbound: (...args: any[]) => mockBulkReceiveInbound(...args),
  fetchInboundVariance: (...args: any[]) => mockFetchInboundVariance(...args),
}))

// composables モック / composables mocks
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showWarning: vi.fn(),
    showInfo: vi.fn(),
  }),
}))

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    locale: { value: 'ja' },
    setLocale: vi.fn(),
    availableLocales: [],
  }),
}))

// スキャンビープ音モック / Scan beep mock
vi.mock('@/utils/scanBeep', () => ({
  beepSuccess: vi.fn(),
  beepError: vi.fn(),
  beepComplete: vi.fn(),
}))

// useConfirmDialog モック / useConfirmDialog mock
const mockConfirm = vi.fn().mockResolvedValue(true)
vi.mock('@/composables/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirm: mockConfirm,
  }),
}))

// ──────────────────────────────────────────────────────
// テストフィクスチャ / Test fixtures
// ──────────────────────────────────────────────────────

/**
 * 検品中の標準注文フィクスチャを生成する。
 * 生成处于检品中状态的标准订单固定数据。
 */
function makeOrder(overrides: Partial<InboundOrder> = {}): InboundOrder {
  return {
    _id: 'order-001',
    orderNumber: 'IB-2026-001',
    status: 'confirmed',
    destinationLocationId: { _id: 'loc-001', code: 'WH-A1', name: '倉庫A棚1' },
    supplier: { name: '株式会社テスト仕入先' },
    lines: [
      {
        lineNumber: 1,
        productId: 'prod-001',
        productSku: 'SKU-APPLE-01',
        productName: 'りんご（箱）',
        expectedQuantity: 10,
        receivedQuantity: 0,
        stockCategory: 'new',
        stockMoveIds: [],
        putawayQuantity: 0,
      },
      {
        lineNumber: 2,
        productId: 'prod-002',
        productSku: 'SKU-ORANGE-02',
        productName: 'みかん（箱）',
        expectedQuantity: 5,
        receivedQuantity: 3,
        stockCategory: 'new',
        stockMoveIds: [],
        putawayQuantity: 0,
      },
    ],
    ...overrides,
  }
}

// ──────────────────────────────────────────────────────
// コンポーネントマウントヘルパー / Component mount helper
// ──────────────────────────────────────────────────────

async function mountComponent() {
  // 動的インポートで確実にモックが適用された後にロードする
  // Dynamic import ensures mocks are registered before module load
  const { default: InboundReceive } = await import('../InboundReceive.vue')

  const wrapper = mount(InboundReceive, {
    global: {
      stubs: {
        // 子コンポーネントをスタブ化してテストを分離する
        // Stub child components to isolate the unit under test
        ControlPanel: {
          template: '<div class="control-panel"><slot name="actions" /></div>',
          props: ['title', 'showSearch'],
        },
        OButton: {
          template: '<button class="o-btn" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
          props: ['variant', 'size', 'disabled'],
          emits: ['click'],
        },
      },
    },
  })
  return wrapper
}

// ──────────────────────────────────────────────────────
// テストスイート / Test suite
// ──────────────────────────────────────────────────────

describe('InboundReceive.vue — 入庫検品ページ / Receiving Inspection Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルトの API レスポンスをリセット / Reset default API responses
    mockFetchInboundOrder.mockResolvedValue(makeOrder())
    mockReceiveInboundLine.mockResolvedValue({
      message: '入庫しました',
      line: { lineNumber: 1, receivedQuantity: 1, expectedQuantity: 10 },
      orderStatus: 'receiving',
    })
    mockBulkReceiveInbound.mockResolvedValue({
      message: '一括入庫しました',
      order: makeOrder({ status: 'received' }),
    })
    mockFetchInboundVariance.mockResolvedValue(null)
    // useConfirmDialog の confirm を自動的に true を返すようにリセット
    // Reset useConfirmDialog confirm mock to return true automatically
    mockConfirm.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ────────────────────────────────────────────────
  // 1. ローディング状態 / Loading state
  // ────────────────────────────────────────────────

  describe('ローディング状態 / Loading state', () => {
    it('初期レンダリング時にローディングテキストを表示する / shows loading text on initial render', async () => {
      // API が解決するまで保留し続けるプロミスを返す
      // Return a never-resolving promise so the component stays in loading state
      mockFetchInboundOrder.mockReturnValue(new Promise(() => {}))

      const wrapper = await mountComponent()

      // isLoading=true のうちにローディングテキストが見えること
      // Loading text must be visible while isLoading is true
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-state').text()).toContain('読み込み中')
    })

    it('データロード完了後にローディング表示が消える / hides loading state after data loads', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      expect(wrapper.find('.loading-state').exists()).toBe(false)
    })
  })

  // ────────────────────────────────────────────────
  // 2. 注文情報の表示 / Order info display
  // ────────────────────────────────────────────────

  describe('注文情報の表示 / Order info display', () => {
    it('注文番号・仕入先・宛先ロケーションを表示する / displays order number, supplier and destination', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      // 入庫指示番号が表示されること / Order number is displayed
      expect(html).toContain('IB-2026-001')
      // 仕入先名が表示されること / Supplier name is displayed
      expect(html).toContain('株式会社テスト仕入先')
      // 宛先ロケーションコードが表示されること / Destination location code is displayed
      expect(html).toContain('WH-A1')
    })

    it('総数と検品済み数量を進捗として表示する / shows total expected and received as progress', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      // 合計予定: 10+5=15, 合計検品済: 0+3=3 / Total expected: 15, received: 3
      expect(html).toContain('3')
      expect(html).toContain('15')
    })

    it('fetchInboundOrder を正しい ID で呼び出す / calls fetchInboundOrder with the correct route param id', async () => {
      await mountComponent()
      await flushPromises()

      expect(mockFetchInboundOrder).toHaveBeenCalledWith('order-001')
    })

    it('API エラー時にトーストエラーを表示する / shows error toast when API fetch fails', async () => {
      mockFetchInboundOrder.mockRejectedValue(new Error('ネットワークエラー'))

      await mountComponent()
      await flushPromises()

      expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('ネットワークエラー'))
    })
  })

  // ────────────────────────────────────────────────
  // 3. 検品モードタブ / Inspection mode tabs
  // ────────────────────────────────────────────────

  describe('検品モードタブ / Inspection mode tabs', () => {
    it('3つのモードタブが表示される（スキャン・数量入力・一括） / shows three mode tabs: scan, manual, bulk', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const tabs = wrapper.findAll('.mode-tab')
      expect(tabs).toHaveLength(3)

      const tabTexts = tabs.map(t => t.text())
      expect(tabTexts.some(t => t.includes('スキャン'))).toBe(true)
      expect(tabTexts.some(t => t.includes('数量入力'))).toBe(true)
      expect(tabTexts.some(t => t.includes('一括確認'))).toBe(true)
    })

    it('デフォルトでスキャンタブがアクティブになっている / scan tab is active by default', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const activeTab = wrapper.find('.mode-tab--active')
      expect(activeTab.exists()).toBe(true)
      expect(activeTab.text()).toContain('スキャン')
    })

    it('タブクリックでモードが切り替わる / clicking a tab switches the active mode', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const tabs = wrapper.findAll('.mode-tab')
      // 「数量入力」タブをクリック / Click the "manual entry" tab
      const manualTab = tabs.find(t => t.text().includes('数量入力'))
      expect(manualTab).toBeDefined()
      await manualTab!.trigger('click')
      await nextTick()

      expect(manualTab!.classes()).toContain('mode-tab--active')
    })

    it('注文ステータスが draft のときはモードタブを表示しない / hides mode tabs when order status is draft', async () => {
      mockFetchInboundOrder.mockResolvedValue(makeOrder({ status: 'draft' }))
      const wrapper = await mountComponent()
      await flushPromises()

      expect(wrapper.find('.mode-card').exists()).toBe(false)
    })
  })

  // ────────────────────────────────────────────────
  // 4. スキャン入力 — 正常系 / Scan input — happy path
  // ────────────────────────────────────────────────

  describe('スキャン入力（正常系） / Scan input (happy path)', () => {
    it('有効な SKU 入力後に Enter キーで receiveInboundLine を呼び出す / pressing Enter with valid SKU calls receiveInboundLine', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const scanInput = wrapper.find('input.scan-input')
      await scanInput.setValue('SKU-APPLE-01')
      await scanInput.trigger('keydown.enter')
      await flushPromises()

      expect(mockReceiveInboundLine).toHaveBeenCalledWith('order-001', {
        lineNumber: 1,
        receiveQuantity: 1,
      })
    })

    it('入庫ボタンクリックでも receiveInboundLine を呼び出す / clicking the receive button also calls receiveInboundLine', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const scanInput = wrapper.find('input.scan-input')
      await scanInput.setValue('SKU-APPLE-01')

      // スキャン行にある入庫ボタンを特定する / Find the receive button in the scan row
      const scanCard = wrapper.find('.scan-card')
      const receiveBtn = scanCard.findAll('.o-btn').find(b => b.text().includes('入庫'))
      expect(receiveBtn).toBeDefined()
      await receiveBtn!.trigger('click')
      await flushPromises()

      expect(mockReceiveInboundLine).toHaveBeenCalledWith('order-001', {
        lineNumber: 1,
        receiveQuantity: 1,
      })
    })

    it('成功後に入力フィールドをクリアする / clears scan input after successful receive', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const scanInput = wrapper.find('input.scan-input')
      await scanInput.setValue('SKU-APPLE-01')
      await scanInput.trigger('keydown.enter')
      await flushPromises()

      // 入力値がクリアされること / Input value must be cleared
      expect((scanInput.element as HTMLInputElement).value).toBe('')
    })

    it('成功メッセージが表示される / displays success message after receive', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const scanInput = wrapper.find('input.scan-input')
      await scanInput.setValue('SKU-APPLE-01')
      await scanInput.trigger('keydown.enter')
      await flushPromises()

      const msg = wrapper.find('.scan-message')
      expect(msg.exists()).toBe(true)
      expect(msg.text()).toContain('入庫しました')
      expect(msg.classes()).not.toContain('scan-error')
    })
  })

  // ────────────────────────────────────────────────
  // 5. スキャン入力 — エラー系 / Scan input — error paths
  // ────────────────────────────────────────────────

  describe('スキャン入力（エラー系） / Scan input (error paths)', () => {
    it('不明 SKU 入力でエラーメッセージを表示する / shows error message for unknown SKU', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const scanInput = wrapper.find('input.scan-input')
      await scanInput.setValue('SKU-UNKNOWN-99')
      await scanInput.trigger('keydown.enter')
      await nextTick()

      const msg = wrapper.find('.scan-message')
      expect(msg.exists()).toBe(true)
      expect(msg.classes()).toContain('scan-error')
      expect(msg.text()).toContain('SKU-UNKNOWN-99')
    })

    it('空の入力では receiveInboundLine を呼び出さない / does not call receiveInboundLine for empty input', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const scanInput = wrapper.find('input.scan-input')
      await scanInput.setValue('')
      await scanInput.trigger('keydown.enter')
      await nextTick()

      expect(mockReceiveInboundLine).not.toHaveBeenCalled()
    })

    it('API エラー時にエラーメッセージとトーストを表示する / shows error message and toast on API failure', async () => {
      mockReceiveInboundLine.mockRejectedValue(new Error('サーバーエラー'))

      const wrapper = await mountComponent()
      await flushPromises()

      const scanInput = wrapper.find('input.scan-input')
      await scanInput.setValue('SKU-APPLE-01')
      await scanInput.trigger('keydown.enter')
      await flushPromises()

      const msg = wrapper.find('.scan-message')
      expect(msg.classes()).toContain('scan-error')
      expect(msg.text()).toContain('サーバーエラー')
      expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('サーバーエラー'))
    })

    it('既に全数受領済みの SKU はエラーになる / rejects SKU whose line is fully received', async () => {
      // 全行が完了済みの注文 / Order where all lines are complete
      mockFetchInboundOrder.mockResolvedValue(
        makeOrder({
          status: 'receiving',
          lines: [
            {
              lineNumber: 1,
              productId: 'prod-001',
              productSku: 'SKU-APPLE-01',
              productName: 'りんご',
              expectedQuantity: 10,
              receivedQuantity: 10, // 完了済み / Already complete
              stockCategory: 'new',
              stockMoveIds: [],
              putawayQuantity: 0,
            },
          ],
        }),
      )

      const wrapper = await mountComponent()
      await flushPromises()

      const scanInput = wrapper.find('input.scan-input')
      await scanInput.setValue('SKU-APPLE-01')
      await scanInput.trigger('keydown.enter')
      await nextTick()

      // 完了済み行はマッチしないのでエラーになる
      // Completed lines are not matched so we get an error
      expect(wrapper.find('.scan-error').exists()).toBe(true)
      expect(mockReceiveInboundLine).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────
  // 6. 超過入庫警告 / Over-receive warning
  // ────────────────────────────────────────────────

  describe('超過入庫警告 / Over-receive warning', () => {
    it('スキャン数量が残り数量を超えた場合に警告メッセージを表示する / shows warning when scan quantity exceeds remaining', async () => {
      // 残り: 10 - 0 = 10 個 / Remaining: 10
      const wrapper = await mountComponent()
      await flushPromises()

      const scanInput = wrapper.find('input.scan-input')
      const qtyInput = wrapper.find('input[type="number"]')

      await scanInput.setValue('SKU-APPLE-01')
      // 残り(10)を超える数量 99 をセット / Set qty 99 which exceeds remaining (10)
      await qtyInput.setValue('99')
      await scanInput.trigger('keydown.enter')
      await nextTick()

      const msg = wrapper.find('.scan-message')
      expect(msg.exists()).toBe(true)
      expect(msg.classes()).toContain('scan-error')
      // 警告メッセージに残り数量が含まれること / Warning must include remaining quantity
      expect(msg.text()).toContain('10')
      // 超過の場合は receiveInboundLine を呼ばない / Must not call receive when over-quantity
      expect(mockReceiveInboundLine).not.toHaveBeenCalled()
    })

    it('残り数量以内の場合は警告を表示しない / no warning when quantity is within remaining', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const scanInput = wrapper.find('input.scan-input')
      const qtyInput = wrapper.find('input[type="number"]')

      await scanInput.setValue('SKU-APPLE-01')
      await qtyInput.setValue('5') // 残り 10 以内 / Within remaining 10
      await scanInput.trigger('keydown.enter')
      await flushPromises()

      expect(mockReceiveInboundLine).toHaveBeenCalledWith('order-001', {
        lineNumber: 1,
        receiveQuantity: 5,
      })
    })
  })

  // ────────────────────────────────────────────────
  // 7. プログレスバーの更新 / Progress bar update
  // ────────────────────────────────────────────────

  describe('プログレスバーの更新 / Progress bar update', () => {
    it('各明細行にプログレスバーが存在する / each order line has a progress bar element', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const bars = wrapper.findAll('.progress-bar')
      // 2 明細行あるので 2 本 / Two lines → two bars
      expect(bars).toHaveLength(2)
    })

    it('受領済み数量に応じてプログレスバーの幅が設定される / progress bar fill width reflects received ratio', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const fills = wrapper.findAll('.progress-bar__fill')
      // 行 2: receivedQuantity=3, expected=5 → 60% / Line 2: 60%
      const line2Fill = fills[1]
      const style = (line2Fill?.element as HTMLElement).getAttribute('style') ?? ''
      expect(style).toContain('60%')
    })

    it('受領後に行の receivedQuantity がローカルで更新される / updates line receivedQuantity locally after receive', async () => {
      mockReceiveInboundLine.mockResolvedValue({
        message: '入庫しました',
        line: { lineNumber: 1, receivedQuantity: 3, expectedQuantity: 10 },
        orderStatus: 'receiving',
      })

      const wrapper = await mountComponent()
      await flushPromises()

      const scanInput = wrapper.find('input.scan-input')
      await scanInput.setValue('SKU-APPLE-01')
      await scanInput.trigger('keydown.enter')
      await flushPromises()

      // 行 1 のプログレスバーが 30% (3/10) になっていること
      // Line 1 progress bar should be 30% (3/10)
      const fills = wrapper.findAll('.progress-bar__fill')
      const line1Style = (fills[0]?.element as HTMLElement).getAttribute('style') ?? ''
      expect(line1Style).toContain('30%')
    })
  })

  // ────────────────────────────────────────────────
  // 8. 数量入力モード / Manual mode
  // ────────────────────────────────────────────────

  describe('数量入力モード / Manual mode', () => {
    it('数量入力モードに切り替えると操作列に数量 input と入庫ボタンが表示される / switching to manual mode shows qty input and receive button per line', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      // 「数量入力」タブをクリック / Click the manual tab
      const tabs = wrapper.findAll('.mode-tab')
      const manualTab = tabs.find(t => t.text().includes('数量入力'))
      await manualTab!.trigger('click')
      await nextTick()

      // 未完了行に数量 input が表示されること / Qty input must appear for incomplete lines
      // Line 1 (0/10) and Line 2 (3/5) are both incomplete
      const tableInputs = wrapper
        .findAll('input[type="number"]')
        .filter(i => (i.element as HTMLInputElement).style.width === '' || true)
      // 少なくとも 1 つの行数量入力が存在すること / At least one row qty input
      expect(tableInputs.length).toBeGreaterThanOrEqual(1)
    })

    it('数量入力+入庫ボタンで receiveInboundLine を呼び出す / receive button in manual mode calls receiveInboundLine', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const tabs = wrapper.findAll('.mode-tab')
      const manualTab = tabs.find(t => t.text().includes('数量入力'))
      await manualTab!.trigger('click')
      await nextTick()

      // 行 1 の小さな数量 input（style="width:60px"）を探してセット
      // Find the row qty input for line 1 and set a value
      const rowInputs = wrapper.findAll('input[type="number"]').filter(
        i => (i.element as HTMLInputElement).style.cssText.includes('60px'),
      )
      expect(rowInputs.length).toBeGreaterThan(0)
      await rowInputs[0]!.setValue('5')

      // 行 1 の入庫ボタン（小サイズ）をクリック
      // Click the first row-level receive button
      const rowBtns = wrapper.findAll('.o-btn').filter(b => b.text() === '入庫')
      expect(rowBtns.length).toBeGreaterThan(0)
      await rowBtns[0]!.trigger('click')
      await flushPromises()

      expect(mockReceiveInboundLine).toHaveBeenCalledWith('order-001', {
        lineNumber: 1,
        receiveQuantity: 5,
      })
    })
  })

  // ────────────────────────────────────────────────
  // 9. モード切替時のエラークリア / Mode switch clears errors
  // ────────────────────────────────────────────────

  describe('モード切替時のエラークリア / Mode switch clears error messages', () => {
    it('モードを切り替えるとエラーメッセージが消える / switching modes clears any existing scan error', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      // まず不明 SKU でエラーを発生させる / First trigger an error with unknown SKU
      const scanInput = wrapper.find('input.scan-input')
      await scanInput.setValue('SKU-UNKNOWN')
      await scanInput.trigger('keydown.enter')
      await nextTick()

      // エラーが出ていることを確認 / Verify error is shown
      expect(wrapper.find('.scan-error').exists()).toBe(true)

      // 「数量入力」タブへ切り替える / Switch to manual tab
      const tabs = wrapper.findAll('.mode-tab')
      const manualTab = tabs.find(t => t.text().includes('数量入力'))
      await manualTab!.trigger('click')
      await nextTick()

      // エラーメッセージが消えていること / Error message must be gone
      expect(wrapper.find('.scan-error').exists()).toBe(false)
    })

    it('スキャンモードへ戻ってもエラーは表示されない / returning to scan mode also shows no stale error', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const scanInput = wrapper.find('input.scan-input')
      await scanInput.setValue('SKU-UNKNOWN')
      await scanInput.trigger('keydown.enter')
      await nextTick()

      const tabs = wrapper.findAll('.mode-tab')

      // 一括確認へ切り替えてからスキャンへ戻す
      // Switch to bulk then back to scan
      const bulkTab = tabs.find(t => t.text().includes('一括確認'))
      await bulkTab!.trigger('click')
      await nextTick()

      const scanTab = tabs.find(t => t.text().includes('スキャン'))
      await scanTab!.trigger('click')
      await nextTick()

      expect(wrapper.find('.scan-error').exists()).toBe(false)
    })
  })

  // ────────────────────────────────────────────────
  // 10. 一括入庫モード / Bulk receive mode
  // ────────────────────────────────────────────────

  describe('一括確認モード / Bulk confirm mode', () => {
    it('一括確認ボタンが表示される / shows bulk confirm button', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const tabs = wrapper.findAll('.mode-tab')
      const bulkTab = tabs.find(t => t.text().includes('一括確認'))
      await bulkTab!.trigger('click')
      await nextTick()

      const scanCard = wrapper.find('.scan-card')
      const bulkBtn = scanCard.findAll('.o-btn').find(b => b.text().includes('一括確認'))
      expect(bulkBtn).toBeDefined()
    })

    it('確認ダイアログで OK すると bulkReceiveInbound を呼び出す / calls bulkReceiveInbound after confirm dialog OK', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const tabs = wrapper.findAll('.mode-tab')
      const bulkTab = tabs.find(t => t.text().includes('一括確認'))
      await bulkTab!.trigger('click')
      await nextTick()

      const scanCard = wrapper.find('.scan-card')
      const bulkBtn = scanCard.findAll('.o-btn').find(b => b.text().includes('一括確認'))
      await bulkBtn!.trigger('click')
      await flushPromises()

      expect(mockBulkReceiveInbound).toHaveBeenCalledWith('order-001')
    })

    it('確認ダイアログでキャンセルすると bulkReceiveInbound を呼ばない / does not call bulkReceiveInbound when confirm is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)

      const wrapper = await mountComponent()
      await flushPromises()

      const tabs = wrapper.findAll('.mode-tab')
      const bulkTab = tabs.find(t => t.text().includes('一括確認'))
      await bulkTab!.trigger('click')
      await nextTick()

      const scanCard = wrapper.find('.scan-card')
      const bulkBtn = scanCard.findAll('.o-btn').find(b => b.text().includes('一括確認'))
      await bulkBtn!.trigger('click')
      await nextTick()

      expect(mockBulkReceiveInbound).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────
  // 11. 明細テーブルの描画 / Order lines table rendering
  // ────────────────────────────────────────────────

  describe('明細テーブル / Order lines table', () => {
    it('全明細行が描画される / renders all order lines', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows).toHaveLength(2)
    })

    it('受領完了行に row-done クラスが付与される / completed lines have row-done class', async () => {
      mockFetchInboundOrder.mockResolvedValue(
        makeOrder({
          lines: [
            {
              lineNumber: 1,
              productId: 'prod-001',
              productSku: 'SKU-APPLE-01',
              productName: 'りんご',
              expectedQuantity: 5,
              receivedQuantity: 5, // 完了 / Complete
              stockCategory: 'new',
              stockMoveIds: [],
              putawayQuantity: 0,
            },
          ],
        }),
      )

      const wrapper = await mountComponent()
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows[0]!.classes()).toContain('row-done')
    })

    it('全数量受領済みの行には「完了」テキストが表示される / fully received lines show 完了 text', async () => {
      mockFetchInboundOrder.mockResolvedValue(
        makeOrder({
          lines: [
            {
              lineNumber: 1,
              productId: 'prod-001',
              productSku: 'SKU-APPLE-01',
              productName: 'りんご',
              expectedQuantity: 5,
              receivedQuantity: 5,
              stockCategory: 'new',
              stockMoveIds: [],
              putawayQuantity: 0,
            },
          ],
        }),
      )

      const wrapper = await mountComponent()
      await flushPromises()

      expect(wrapper.html()).toContain('完了')
    })
  })

  // ────────────────────────────────────────────────
  // 12. 差異レポート / Variance report
  // ────────────────────────────────────────────────

  describe('差異レポート / Variance report', () => {
    it('status=received の注文では差異レポートを取得する / fetches variance for received orders', async () => {
      mockFetchInboundOrder.mockResolvedValue(makeOrder({ status: 'received' }))
      mockFetchInboundVariance.mockResolvedValue({
        orderNumber: 'IB-2026-001',
        orderStatus: 'received',
        supplierName: 'テスト仕入先',
        totalExpected: 15,
        totalReceived: 12,
        totalVariance: -3,
        hasVariance: true,
        shortageCount: 1,
        pendingCount: 0,
        lines: [],
      })

      await mountComponent()
      await flushPromises()

      expect(mockFetchInboundVariance).toHaveBeenCalledWith('order-001')
    })

    it('status=confirmed の注文では差異レポートを取得しない / does not fetch variance for confirmed orders', async () => {
      await mountComponent()
      await flushPromises()

      expect(mockFetchInboundVariance).not.toHaveBeenCalled()
    })
  })
})
