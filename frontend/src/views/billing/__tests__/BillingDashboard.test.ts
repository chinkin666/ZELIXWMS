/**
 * BillingDashboard コンポーネントテスト / 請求ダッシュボードコンポーネントテスト
 *
 * 請求ダッシュボードページの動作保障テストスイート。
 * 账单仪表盘页面的行为保障测试套件。
 *
 * テスト対象 / 测试目标:
 *   - ページタイトルの表示 / 页面标题显示
 *   - ローディング状態の表示 / 加载状态显示
 *   - 請求KPIカードの描画（件数・配送料金・未請求額・未入金額）/ 账单KPI卡片渲染
 *   - 最近の請求データテーブルの描画 / 最近账单数据表格渲染
 *   - 月次サマリーの表示 / 月度摘要显示
 *   - アクションボタンの表示 / 操作按钮显示
 *   - API エラー時のトースト表示 / API错误时的Toast显示
 *   - ステータスラベル・CSS クラスの適用 / 状态标签和CSS类应用
 *   - データなし時の空状態 / 无数据时的空状态
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { BillingDashboardKpi, BillingRecord, BillingStatus } from '@/api/billing'

// ──────────────────────────────────────────────────────
// モック定義 / Mock definitions
// ──────────────────────────────────────────────────────

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
const mockFetchBillingDashboard = vi.fn()
vi.mock('@/api/billing', () => ({
  fetchBillingDashboard: (...args: any[]) => mockFetchBillingDashboard(...args),
}))

// スタイルインポートモック / Style import mock
vi.mock('@/styles/order-table.css', () => ({}))

// ──────────────────────────────────────────────────────
// テストフィクスチャ / Test fixtures
// ──────────────────────────────────────────────────────

/**
 * 請求レコードフィクスチャを生成する。
 * 生成账单记录固定数据。
 */
function makeBillingRecord(overrides: Partial<BillingRecord> = {}): BillingRecord {
  return {
    _id: 'br-001',
    period: '2026-03',
    clientName: '株式会社テスト荷主',
    carrierName: 'ヤマト運輸',
    orderCount: 150,
    totalQuantity: 300,
    totalShippingCost: 75000,
    handlingFee: 15000,
    storageFee: 5000,
    otherFees: 0,
    totalAmount: 95000,
    status: 'confirmed' as BillingStatus,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
    ...overrides,
  }
}

/**
 * 標準的な請求ダッシュボード KPI フィクスチャを生成する。
 * 生成标准的账单仪表盘KPI固定数据。
 */
function makeKpi(overrides: Partial<BillingDashboardKpi> = {}): BillingDashboardKpi {
  return {
    monthlyOrderCount: 450,
    monthlyShippingCost: 225000,
    unbilledAmount: 50000,
    unpaidAmount: 120000,
    currentPeriod: '2026-03',
    recentRecords: [
      makeBillingRecord({ _id: 'br-001', status: 'confirmed', clientName: '荷主A社' }),
      makeBillingRecord({ _id: 'br-002', status: 'invoiced', clientName: '荷主B社', carrierName: '佐川急便', totalAmount: 45000 }),
      makeBillingRecord({ _id: 'br-003', status: 'draft', clientName: '荷主C社', totalAmount: 12000 }),
    ],
    ...overrides,
  }
}

// ──────────────────────────────────────────────────────
// コンポーネントマウントヘルパー / Component mount helper
// ──────────────────────────────────────────────────────

/**
 * BillingDashboard を子コンポーネントをスタブ化してマウントする。
 * Mount BillingDashboard with child components stubbed.
 */
async function mountComponent() {
  const { default: BillingDashboard } = await import('../BillingDashboard.vue')

  const wrapper = mount(BillingDashboard, {
    global: {
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

describe('BillingDashboard.vue — 請求ダッシュボード / Billing Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルトで正常なレスポンスを返す / Return success response by default
    mockFetchBillingDashboard.mockResolvedValue(makeKpi())
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
      mockFetchBillingDashboard.mockReturnValue(new Promise(() => {}))

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
  // 2. ページタイトル / Page title
  // ────────────────────────────────────────────────

  describe('ページタイトル / Page title', () => {
    it('ControlPanel に請求ダッシュボードタイトルが渡される / passes billing dashboard title to ControlPanel', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const panel = wrapper.find('.control-panel')
      expect(panel.exists()).toBe(true)
      expect(panel.attributes('data-title')).toContain('請求ダッシュボード')
    })

    it('ダッシュボードのルートラッパーが描画される / root wrapper is rendered', async () => {
      const wrapper = await mountComponent()

      expect(wrapper.find('.billing-dashboard').exists()).toBe(true)
    })
  })

  // ────────────────────────────────────────────────
  // 3. KPI カード / KPI cards
  // ────────────────────────────────────────────────

  describe('KPIカード / KPI cards', () => {
    it('KPI グリッドが描画される / KPI grid is rendered', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      expect(wrapper.find('.kpi-grid').exists()).toBe(true)
    })

    it('4枚のKPIカードが存在する / four KPI cards exist', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      // 当月出荷件数・当月配送料金・未請求額・未入金額
      // Monthly shipment count, monthly shipping cost, unbilled amount, unpaid amount
      const cards = wrapper.findAll('.kpi-card')
      expect(cards).toHaveLength(4)
    })

    it('当月出荷件数が表示される / displays monthly order count', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('当月出荷件数')
      // 450件 → toLocaleString() は環境依存なので数字の存在のみ確認
      // Verify the count value exists (toLocaleString output varies by locale)
      expect(html).toContain('450')
    })

    it('当月配送料金が表示される / displays monthly shipping cost', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('当月配送料金')
      expect(html).toContain('¥')
    })

    it('未請求額が表示される / displays unbilled amount', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('未請求額')
      expect(html).toContain('50')
    })

    it('未入金額が表示される / displays unpaid amount', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('未入金額')
    })

    it('未請求額カードに warning スタイルが適用される / warning style applied to unbilled card', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const warningCard = wrapper.find('.kpi-card--warning')
      expect(warningCard.exists()).toBe(true)
      expect(warningCard.text()).toContain('未請求額')
    })

    it('未入金額カードに danger スタイルが適用される / danger style applied to unpaid card', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const dangerCard = wrapper.find('.kpi-card--danger')
      expect(dangerCard.exists()).toBe(true)
      expect(dangerCard.text()).toContain('未入金額')
    })

    it('KPI 値がゼロのときも正しく表示される / displays correctly when all KPI values are zero', async () => {
      mockFetchBillingDashboard.mockResolvedValue(makeKpi({
        monthlyOrderCount: 0,
        monthlyShippingCost: 0,
        unbilledAmount: 0,
        unpaidAmount: 0,
      }))

      const wrapper = await mountComponent()
      await flushPromises()

      // ゼロ値が存在すること / Zero values must be displayed
      const kpiValues = wrapper.findAll('.kpi-value')
      const hasZeroValue = kpiValues.some(v => v.text() === '0')
      expect(hasZeroValue).toBe(true)
    })
  })

  // ────────────────────────────────────────────────
  // 4. 最近の請求データテーブル / Recent billing records table
  // ────────────────────────────────────────────────

  describe('最近の請求データテーブル / Recent billing records table', () => {
    it('セクションタイトルが表示される / section title is displayed', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      expect(wrapper.find('.section-title').exists()).toBe(true)
      expect(wrapper.find('.section-title').text()).toContain('最近の請求データ')
    })

    it('請求テーブルが描画される / billing table is rendered', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      expect(wrapper.find('table.o-table').exists()).toBe(true)
    })

    it('テーブルヘッダーに必須列が含まれる / table header contains required columns', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('期間')
      expect(html).toContain('荷主')
      expect(html).toContain('配送業者')
      expect(html).toContain('出荷件数')
      expect(html).toContain('合計')
      expect(html).toContain('ステータス')
    })

    it('全請求レコード行が描画される / all billing record rows are rendered', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      // makeKpi のデフォルトには 3 レコードある / Default makeKpi has 3 records
      expect(rows).toHaveLength(3)
    })

    it('荷主名が表示される / client names are displayed', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('荷主A社')
      expect(html).toContain('荷主B社')
      expect(html).toContain('荷主C社')
    })

    it('配送業者名が表示される / carrier names are displayed', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('ヤマト運輸')
      expect(html).toContain('佐川急便')
    })

    it('合計金額に円記号が付与される / total amount has yen symbol', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('¥')
    })
  })

  // ────────────────────────────────────────────────
  // 5. データなし時の空状態 / Empty state
  // ────────────────────────────────────────────────

  describe('データなし時の空状態 / Empty state when no records', () => {
    it('recentRecords が空のときに空状態メッセージが表示される / shows empty message when recentRecords is empty', async () => {
      mockFetchBillingDashboard.mockResolvedValue(makeKpi({ recentRecords: [] }))

      const wrapper = await mountComponent()
      await flushPromises()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-state').text()).toContain('請求データがありません')
    })

    it('recentRecords が空のときにテーブルは表示されない / table hidden when recentRecords is empty', async () => {
      mockFetchBillingDashboard.mockResolvedValue(makeKpi({ recentRecords: [] }))

      const wrapper = await mountComponent()
      await flushPromises()

      expect(wrapper.find('.o-table-wrapper').exists()).toBe(false)
    })
  })

  // ────────────────────────────────────────────────
  // 6. ステータスラベルとCSS クラス / Status labels and CSS classes
  // ────────────────────────────────────────────────

  describe('ステータスラベルと CSS クラス / Status labels and CSS classes', () => {
    it('各ステータスに対応するラベルが表示される / correct label displayed for each status', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      // confirmed → 確定, invoiced → 請求済, draft → 下書き
      expect(html).toContain('確定')
      expect(html).toContain('請求済')
      expect(html).toContain('下書き')
    })

    it('ステータスバッジが描画される / status badges are rendered', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const badges = wrapper.findAll('.o-status-tag')
      // 3 レコードそれぞれにバッジがあること / One badge per record
      expect(badges).toHaveLength(3)
    })

    it('confirmed ステータスに o-status-tag--confirmed クラスが付与される / confirmed status has correct CSS class', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const confirmedBadge = wrapper.find('.o-status-tag--confirmed')
      expect(confirmedBadge.exists()).toBe(true)
    })

    it('invoiced ステータスに o-status-tag--issued クラスが付与される / invoiced status has correct CSS class', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const invoicedBadge = wrapper.find('.o-status-tag--issued')
      expect(invoicedBadge.exists()).toBe(true)
    })

    it('draft ステータスに o-status-tag--draft クラスが付与される / draft status has correct CSS class', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const draftBadge = wrapper.find('.o-status-tag--draft')
      expect(draftBadge.exists()).toBe(true)
    })

    it('paid ステータスのラベルが正しい / paid status label is correct', async () => {
      mockFetchBillingDashboard.mockResolvedValue(makeKpi({
        recentRecords: [makeBillingRecord({ status: 'paid' as BillingStatus })],
      }))

      const wrapper = await mountComponent()
      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('入金済')
    })
  })

  // ────────────────────────────────────────────────
  // 7. アクションボタン / Action buttons
  // ────────────────────────────────────────────────

  describe('アクションボタン / Action buttons', () => {
    it('更新ボタンが存在する / refresh button exists', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      const buttons = wrapper.findAll('.o-btn')
      const refreshBtn = buttons.find(b => b.text() === '更新')
      expect(refreshBtn).toBeDefined()
    })

    it('更新ボタンクリックで API が再呼び出しされる / clicking refresh re-calls the API', async () => {
      const wrapper = await mountComponent()
      await flushPromises()

      // 初回マウント時の呼び出しをリセット
      // Reset after initial mount call
      mockFetchBillingDashboard.mockClear()

      const buttons = wrapper.findAll('.o-btn')
      const refreshBtn = buttons.find(b => b.text() === '更新')
      await refreshBtn!.trigger('click')
      await flushPromises()

      expect(mockFetchBillingDashboard).toHaveBeenCalledTimes(1)
    })
  })

  // ────────────────────────────────────────────────
  // 8. API エラー処理 / API error handling
  // ────────────────────────────────────────────────

  describe('API エラー処理 / API error handling', () => {
    it('API エラー時にエラートーストを表示する / shows error toast when API fails', async () => {
      mockFetchBillingDashboard.mockRejectedValue(new Error('接続エラー'))

      await mountComponent()
      await flushPromises()

      expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('接続エラー'))
    })

    it('API エラー後に KPI カードは表示されない / KPI cards not shown after API error', async () => {
      mockFetchBillingDashboard.mockRejectedValue(new Error('サーバーエラー'))

      const wrapper = await mountComponent()
      await flushPromises()

      // kpi が null のため kpi-grid は表示されないこと
      // kpi is null so kpi-grid should not be rendered
      expect(wrapper.find('.kpi-grid').exists()).toBe(false)
    })

    it('エラーメッセージなしの場合はデフォルトメッセージを使用する / uses default error message when error has no message', async () => {
      mockFetchBillingDashboard.mockRejectedValue(new Error())

      await mountComponent()
      await flushPromises()

      expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('データの取得に失敗しました'))
    })
  })

  // ────────────────────────────────────────────────
  // 9. マウント時の API 呼び出し / API call on mount
  // ────────────────────────────────────────────────

  describe('マウント時の API 呼び出し / API call on mount', () => {
    it('マウント時に fetchBillingDashboard を 1 回呼び出す / calls fetchBillingDashboard once on mount', async () => {
      await mountComponent()
      await flushPromises()

      expect(mockFetchBillingDashboard).toHaveBeenCalledTimes(1)
    })
  })

  // ────────────────────────────────────────────────
  // 10. 大量データ / Large data sets
  // ────────────────────────────────────────────────

  describe('大量データ / Large data sets', () => {
    it('50 件の請求レコードを正しくレンダリングできる / renders 50 billing records without error', async () => {
      // 大量データでもクラッシュしないことを確認 / Verify no crash with large data
      const manyRecords = Array.from({ length: 50 }, (_, i) =>
        makeBillingRecord({ _id: `br-${i}`, clientName: `荷主${i}社` }),
      )
      mockFetchBillingDashboard.mockResolvedValue(makeKpi({ recentRecords: manyRecords }))

      const wrapper = await mountComponent()
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows).toHaveLength(50)
    })
  })

  // ────────────────────────────────────────────────
  // 11. エッジケース / Edge cases
  // ────────────────────────────────────────────────

  describe('エッジケース / Edge cases', () => {
    it('荷主名がない場合にクラッシュしない / handles missing clientName without crashing', async () => {
      mockFetchBillingDashboard.mockResolvedValue(makeKpi({
        recentRecords: [makeBillingRecord({ clientName: undefined })],
      }))

      const wrapper = await mountComponent()
      await flushPromises()

      // クラッシュなしで行が描画されること / Row rendered without crash
      expect(wrapper.find('tbody tr').exists()).toBe(true)
    })

    it('配送業者名がない場合にクラッシュしない / handles missing carrierName without crashing', async () => {
      mockFetchBillingDashboard.mockResolvedValue(makeKpi({
        recentRecords: [makeBillingRecord({ carrierName: undefined })],
      }))

      const wrapper = await mountComponent()
      await flushPromises()

      expect(wrapper.find('tbody tr').exists()).toBe(true)
    })

    it('orderCount が undefined のときゼロとして扱われる / orderCount undefined treated as zero', async () => {
      // orderCount を持たないレコードでも表示がクラッシュしないこと
      // Record without orderCount must not crash the display
      const record = makeBillingRecord({ orderCount: undefined as any })
      mockFetchBillingDashboard.mockResolvedValue(makeKpi({ recentRecords: [record] }))

      const wrapper = await mountComponent()
      await flushPromises()

      // テーブルが存在し表示が壊れていないこと / Table exists and display is intact
      expect(wrapper.find('table.o-table').exists()).toBe(true)
    })
  })
})
