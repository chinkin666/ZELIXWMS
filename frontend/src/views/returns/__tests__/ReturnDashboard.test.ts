/**
 * ReturnDashboard コンポーネントテスト / 返品ダッシュボードコンポーネントテスト
 *
 * 返品ダッシュボードページの動作保障テストスイート。
 * 退货仪表盘页面的行为保障测试套件。
 *
 * テスト対象 / 测试目标:
 *   - ダッシュボードタイトルの表示 / 仪表盘标题显示
 *   - ローディング状態の表示 / 加载状态显示
 *   - KPI ステータスカードの描画 / KPI状态卡片渲染
 *   - 再入庫率の計算・表示 / 再入库率计算显示
 *   - 最近の返品リストの描画 / 最近退货列表渲染
 *   - データなし時の空状態 / 无数据时的空状态
 *   - アクションボタンの表示 / 操作按钮显示
 *   - API エラー時のトースト表示 / API错误时的Toast显示
 *   - 詳細ページへのナビゲーション / 跳转详情页面导航
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { ReturnDashboardStats, ReturnOrder } from '@/api/returnOrder'

// ──────────────────────────────────────────────────────
// モック定義 / Mock definitions
// ──────────────────────────────────────────────────────

// vue-router モック / vue-router mock
// ReturnDashboard はテンプレート内で $router.push() を直接使用するため、
// useRouter() だけでなく $router グローバルプロパティも注入する必要がある。
// ReturnDashboard uses $router.push() directly in the template so we must inject
// the $router global property in addition to mocking useRouter().
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {}, query: {} }),
  useRouter: () => ({ push: mockPush }),
}))

// i18n モック / i18n mock
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    locale: { value: 'ja' },
    setLocale: vi.fn(),
    availableLocales: [],
  }),
}))

// Toast モック / Toast mock
const mockShowError = vi.fn()
const mockShowSuccess = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showWarning: vi.fn(),
    showInfo: vi.fn(),
  }),
}))

// API モック / API mock
const mockFetchReturnDashboardStats = vi.fn()
vi.mock('@/api/returnOrder', () => ({
  fetchReturnDashboardStats: (...args: any[]) => mockFetchReturnDashboardStats(...args),
}))

// スタイルインポートモック / Style import mock
vi.mock('@/styles/order-table.css', () => ({}))

// ──────────────────────────────────────────────────────
// テストフィクスチャ / Test fixtures
// ──────────────────────────────────────────────────────

/**
 * 標準的な返品ダッシュボード統計フィクスチャを生成する。
 * 生成标准的退货仪表盘统计固定数据。
 */
function makeStats(overrides: Partial<ReturnDashboardStats> = {}): ReturnDashboardStats {
  return {
    statusCounts: {
      draft: 3,
      inspecting: 5,
      completed: 20,
      cancelled: 2,
    },
    reasonBreakdown: {
      customer_request: 10,
      defective: 8,
      wrong_item: 3,
      damaged: 5,
      other: 4,
    },
    totalRestocked: 15,
    totalDisposed: 5,
    recentReturns: [
      {
        _id: 'ret-001',
        orderNumber: 'RT-2026-001',
        status: 'inspecting',
        returnReason: 'defective',
        customerName: 'テスト顧客',
        receivedDate: '2026-03-01T00:00:00.000Z',
        lines: [
          {
            lineNumber: 1,
            productId: 'prod-001',
            productSku: 'SKU-001',
            quantity: 2,
            inspectedQuantity: 0,
            disposition: 'pending',
            restockedQuantity: 0,
            disposedQuantity: 0,
          },
        ],
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      } as ReturnOrder,
      {
        _id: 'ret-002',
        orderNumber: 'RT-2026-002',
        status: 'completed',
        returnReason: 'customer_request',
        customerName: '別のテスト顧客',
        receivedDate: '2026-03-10T00:00:00.000Z',
        lines: [],
        createdAt: '2026-03-10T00:00:00.000Z',
        updatedAt: '2026-03-10T00:00:00.000Z',
      } as ReturnOrder,
    ],
    ...overrides,
  }
}

// ──────────────────────────────────────────────────────
// コンポーネントマウントヘルパー / Component mount helper
// ──────────────────────────────────────────────────────

/**
 * ReturnDashboard を子コンポーネントをスタブ化してマウントする。
 * Mount ReturnDashboard with child components stubbed.
 */
async function mountComponent() {
  const { default: ReturnDashboard } = await import('../ReturnDashboard.vue')

  const wrapper = mount(ReturnDashboard, {
    global: {
      // $router グローバルプロパティを直接注入して、テンプレート内の
      // $router.push() 呼び出しが正しく動作するようにする。
      // Inject $router global property directly so that template-level
      // $router.push() calls work correctly in the test environment.
      mocks: {
        $router: { push: mockPush },
      },
      stubs: {
        // 共通UIコンポーネントのスタブ化 / Stub shared UI components
        ControlPanel: {
          template: `
            <div class="control-panel" :data-title="title">
              <slot name="actions" />
            </div>
          `,
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

describe('ReturnDashboard.vue — 返品ダッシュボード / Return Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルトで正常なレスポンスを返す / Return success response by default
    mockFetchReturnDashboardStats.mockResolvedValue(makeStats())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ────────────────────────────────────────────────
  // 1. ローディング状態 / Loading state
  // ────────────────────────────────────────────────

  describe('ローディング状態 / Loading state', () => {
    it('初期レンダリング時にローディングテキストを表示する / shows loading text on initial render', async () => {
      // API が永遠に解決しないプロミスを返す
      // Return a never-resolving promise to hold the loading state
      mockFetchReturnDashboardStats.mockReturnValue(new Promise(() => {}))

      const wrapper = await mountComponent()

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
  // 2. ダッシュボードタイトル / Dashboard title
  // ────────────────────────────────────────────────

  describe('ダッシュボードタイトル / Dashboard title', () => {
    it('ControlPanel にタイトルが渡される / passes title to ControlPanel', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const panel = wrapper.find('.control-panel')
      expect(panel.exists()).toBe(true)
      // ControlPanel の title prop に「返品ダッシュボード」が設定されること
      // Title prop must contain the dashboard label
      expect(panel.attributes('data-title')).toContain('返品ダッシュボード')
    })
  })

  // ────────────────────────────────────────────────
  // 3. KPI ステータスカード / KPI status cards
  // ────────────────────────────────────────────────

  describe('KPI ステータスカード / KPI status cards', () => {
    it('KPI カードグリッドが描画される / renders KPI card grid', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      expect(wrapper.find('.kpi-grid').exists()).toBe(true)
    })

    it('5枚のステータスKPIカードが描画される / renders five status KPI cards', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      // 1つ目のグリッドに: 合計・下書き・検品中・完了・キャンセル
      // First grid: total, draft, inspecting, completed, cancelled
      const cards = wrapper.findAll('.kpi-card')
      expect(cards.length).toBeGreaterThanOrEqual(5)
    })

    it('返品合計数が正しく計算・表示される / displays correct total returns count', async () => {
      // draft(3) + inspecting(5) + completed(20) + cancelled(2) = 30
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('30')
    })

    it('各ステータス件数が表示される / displays counts for each status', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('3')   // draft
      expect(html).toContain('5')   // inspecting
      expect(html).toContain('20')  // completed
      expect(html).toContain('2')   // cancelled
    })

    it('ステータスラベルが表示される / displays status labels', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('下書き')
      expect(html).toContain('検品中')
      expect(html).toContain('完了')
      expect(html).toContain('キャンセル')
    })
  })

  // ────────────────────────────────────────────────
  // 4. 再入庫・廃棄統計 / Restock / dispose stats
  // ────────────────────────────────────────────────

  describe('再入庫・廃棄統計 / Restock and dispose stats', () => {
    it('再入庫合計が表示される / displays total restocked count', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('再入庫合計')
      expect(html).toContain('15')
    })

    it('廃棄合計が表示される / displays total disposed count', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('廃棄合計')
      expect(html).toContain('5')
    })

    it('再入庫率が正しく計算される / calculates restock ratio correctly', async () => {
      // totalRestocked=15, totalDisposed=5 → ratio = 15/(15+5) * 100 = 75%
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('75%')
      expect(html).toContain('再入庫率')
    })

    it('再入庫・廃棄ともに 0 のとき再入庫率は 0% / ratio is 0% when both restocked and disposed are 0', async () => {
      mockFetchReturnDashboardStats.mockResolvedValue(makeStats({ totalRestocked: 0, totalDisposed: 0 }))

      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('0%')
    })
  })

  // ────────────────────────────────────────────────
  // 5. 返品理由別内訳 / Reason breakdown
  // ────────────────────────────────────────────────

  describe('返品理由別内訳 / Reason breakdown', () => {
    it('理由別セクションタイトルが表示される / reason breakdown section title is visible', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('返品理由別内訳')
    })

    it('理由カードが描画される / reason cards are rendered', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      // reasonBreakdown に 5 つのエントリがあるので 5 つのカードが期待される
      // 5 entries in reasonBreakdown → 5 reason cards expected
      const reasonCards = wrapper.findAll('.reason-card')
      expect(reasonCards).toHaveLength(5)
    })

    it('理由ラベルが日本語に変換される / reason labels are translated to Japanese', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('お客様都合')
      expect(html).toContain('不良品')
      expect(html).toContain('誤配送')
      expect(html).toContain('破損')
      expect(html).toContain('その他')
    })
  })

  // ────────────────────────────────────────────────
  // 6. 最近の返品リスト / Recent returns list
  // ────────────────────────────────────────────────

  describe('最近の返品リスト / Recent returns list', () => {
    it('最近の返品セクションタイトルが表示される / recent returns section title is visible', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('最近の返品')
    })

    it('返品リストのテーブルが描画される / renders the recent returns table', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      expect(wrapper.find('.o-table').exists()).toBe(true)
    })

    it('テーブルヘッダーに必須列が含まれる / table header contains required columns', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('返品番号')
      expect(html).toContain('状態')
      expect(html).toContain('理由')
      expect(html).toContain('顧客')
      expect(html).toContain('行数')
      expect(html).toContain('受領日')
    })

    it('返品行がすべて描画される / all return rows are rendered', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows).toHaveLength(2)
    })

    it('返品番号が表示される / order numbers are displayed', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('RT-2026-001')
      expect(html).toContain('RT-2026-002')
    })

    it('顧客名が表示される / customer names are displayed', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('テスト顧客')
      expect(html).toContain('別のテスト顧客')
    })

    it('各行に詳細ボタンが存在する / each row has a detail button', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const detailBtns = wrapper.findAll('.o-btn').filter(b => b.text() === '詳細')
      expect(detailBtns).toHaveLength(2)
    })

    it('詳細ボタンクリックで返品詳細ページに遷移する / clicking detail button navigates to return detail page', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const detailBtns = wrapper.findAll('.o-btn').filter(b => b.text() === '詳細')
      await detailBtns[0]!.trigger('click')

      expect(mockPush).toHaveBeenCalledWith('/returns/ret-001')
    })
  })

  // ────────────────────────────────────────────────
  // 7. 空状態 / Empty state
  // ────────────────────────────────────────────────

  describe('データなし時の空状態 / Empty state when no data', () => {
    it('recentReturns が空のときに空状態メッセージが表示される / shows empty message when recentReturns is empty', async () => {
      mockFetchReturnDashboardStats.mockResolvedValue(makeStats({ recentReturns: [] }))

      const wrapper = await mountComponent()
      await flushPromises()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-state').text()).toContain('返品データがありません')
    })

    it('recentReturns が空のときにテーブルは表示されない / table hidden when recentReturns is empty', async () => {
      mockFetchReturnDashboardStats.mockResolvedValue(makeStats({ recentReturns: [] }))

      const wrapper = await mountComponent()
      await flushPromises()

      // テーブルラッパーが存在しないこと / Table wrapper should not exist
      expect(wrapper.find('.o-table-wrapper').exists()).toBe(false)
    })
  })

  // ────────────────────────────────────────────────
  // 8. アクションボタン / Action buttons
  // ────────────────────────────────────────────────

  describe('アクションボタン / Action buttons', () => {
    it('更新ボタンが存在する / refresh button exists', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const buttons = wrapper.findAll('.o-btn')
      const refreshBtn = buttons.find(b => b.text() === '更新')
      expect(refreshBtn).toBeDefined()
    })

    it('新規作成ボタンが存在する / create new button exists', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const buttons = wrapper.findAll('.o-btn')
      const createBtn = buttons.find(b => b.text() === '新規作成')
      expect(createBtn).toBeDefined()
    })

    it('新規作成ボタンクリックで返品作成ページへ遷移する / create button navigates to create page', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const buttons = wrapper.findAll('.o-btn')
      const createBtn = buttons.find(b => b.text() === '新規作成')
      await createBtn!.trigger('click')

      expect(mockPush).toHaveBeenCalledWith('/returns/create')
    })

    it('更新ボタンクリックで API が再呼び出しされる / clicking refresh button re-calls the API', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      // 初回マウント時の 1 回目の呼び出しをリセット
      // Reset after initial mount call
      mockFetchReturnDashboardStats.mockClear()

      const buttons = wrapper.findAll('.o-btn')
      const refreshBtn = buttons.find(b => b.text() === '更新')
      await refreshBtn!.trigger('click')
      await flushPromises()

      expect(mockFetchReturnDashboardStats).toHaveBeenCalledTimes(1)
    })
  })

  // ────────────────────────────────────────────────
  // 9. API エラー処理 / API error handling
  // ────────────────────────────────────────────────

  describe('API エラー処理 / API error handling', () => {
    it('API エラー時にエラートーストを表示する / shows error toast when API fails', async () => {
      mockFetchReturnDashboardStats.mockRejectedValue(new Error('サーバーエラー'))

      await mountComponent()
      await flushPromises()

      expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('サーバーエラー'))
    })

    it('API エラー後にKPIカードは表示されない / KPI cards not shown after API error', async () => {
      mockFetchReturnDashboardStats.mockRejectedValue(new Error('取得失敗'))

      const wrapper = await mountComponent()
      await flushPromises()

      // stats が null のため kpi-grid は表示されないこと
      // stats is null so kpi-grid should not exist
      expect(wrapper.find('.kpi-grid').exists()).toBe(false)
    })

    it('エラーメッセージなしの場合はデフォルトメッセージを表示する / shows default error message when error has no message', async () => {
      mockFetchReturnDashboardStats.mockRejectedValue(new Error())

      await mountComponent()
      await flushPromises()

      expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('データの取得に失敗しました'))
    })
  })

  // ────────────────────────────────────────────────
  // 10. マウント時の API 呼び出し / API call on mount
  // ────────────────────────────────────────────────

  describe('マウント時の API 呼び出し / API call on mount', () => {
    it('マウント時に fetchReturnDashboardStats を 1 回呼び出す / calls fetchReturnDashboardStats once on mount', async () => {
      await mountComponent()
      await flushPromises()

      expect(mockFetchReturnDashboardStats).toHaveBeenCalledTimes(1)
    })
  })

  // ────────────────────────────────────────────────
  // 11. ステータスバッジ / Status badges
  // ────────────────────────────────────────────────

  describe('ステータスバッジ / Status badges', () => {
    it('各行にステータスバッジが表示される / each row shows a status badge', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const statusBadges = wrapper.findAll('.o-status-tag')
      // 2 つの返品行それぞれにステータスバッジがある / One badge per return row
      expect(statusBadges.length).toBeGreaterThanOrEqual(2)
    })

    it('inspecting ステータスに適切なクラスが付与される / inspecting status has correct CSS class', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const badges = wrapper.findAll('.o-status-tag')
      // RT-2026-001 は "inspecting" ステータス → o-status-tag--printed クラスを確認
      // RT-2026-001 has "inspecting" status → verify o-status-tag--printed class
      const inspectingBadge = badges.find(b => b.classes().includes('o-status-tag--printed'))
      expect(inspectingBadge).toBeDefined()
    })
  })
})
