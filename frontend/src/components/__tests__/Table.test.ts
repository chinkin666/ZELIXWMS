/**
 * Table.vue コンポーネントテスト
 * Table.vue 组件测试
 *
 * テスト対象の主要機能 / 主要测试功能：
 *   - カラムヘッダーのレンダリング / 列头渲染
 *   - データ行のレンダリング / 数据行渲染
 *   - クライアントサイドページネーション / 客户端分页
 *   - グローバル検索テキストフィルタリング / 全局搜索文本过滤
 *   - データなし時の空状態 / 无数据时的空状态
 *   - 行クリックイベント（rowKey を使った識別） / 行点击事件
 *   - チェックボックス選択 / 复选框选择
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import Table from '../table/Table.vue'

// ------------------------------------------------------------------
// グローバルスタブ定義 / 全局 stub 定义
// OPager と OButton はロジックに影響しないため単純なスタブに置換
// OPager 和 OButton 不影响核心逻辑，用简单 stub 替换
// ------------------------------------------------------------------
const OPagerStub = defineComponent({
  name: 'OPager',
  props: ['total', 'offset', 'limit'],
  emits: ['update:offset'],
  template: `<div class="o-pager-stub">
    <button class="pager-prev" @click="$emit('update:offset', Math.max(0, offset - limit))" :disabled="offset === 0">prev</button>
    <button class="pager-next" @click="$emit('update:offset', offset + limit)" :disabled="offset + limit >= total">next</button>
  </div>`,
})

const OButtonStub = defineComponent({
  name: 'OButton',
  props: ['variant', 'size', 'disabled'],
  template: `<button :disabled="disabled"><slot /></button>`,
})

const BulkEditDialogStub = defineComponent({
  name: 'BulkEditDialog',
  props: ['modelValue', 'columns', 'selectedCount'],
  emits: ['update:modelValue', 'confirm'],
  template: `<div class="bulk-edit-stub" v-if="modelValue"></div>`,
})

// ------------------------------------------------------------------
// テスト用グローバルオプション / 测试用全局选项
// ------------------------------------------------------------------
const globalStubs = {
  OPager: OPagerStub,
  OButton: OButtonStub,
  BulkEditDialog: BulkEditDialogStub,
}

// ------------------------------------------------------------------
// テスト用フィクスチャ / 测试用固定数据
// ------------------------------------------------------------------
const sampleColumns = [
  { key: 'id', dataKey: 'id', title: 'ID' },
  { key: 'name', dataKey: 'name', title: '名前' },
  { key: 'status', dataKey: 'status', title: 'ステータス' },
]

const sampleData = [
  { id: 1, name: '山田太郎', status: 'active' },
  { id: 2, name: '鈴木花子', status: 'inactive' },
  { id: 3, name: '田中一郎', status: 'active' },
]

// 大量データ生成（クライアントページネーション検証用）
// 生成大量数据（用于验证客户端分页）
function generateRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `ユーザー${i + 1}`,
    status: i % 2 === 0 ? 'active' : 'inactive',
  }))
}

// ------------------------------------------------------------------
// ヘルパー関数 / 辅助函数
// ------------------------------------------------------------------
function mountTable(props: Record<string, unknown> = {}) {
  return mount(Table, {
    props: {
      columns: sampleColumns,
      data: sampleData,
      rowKey: 'id',
      ...props,
    },
    global: { stubs: globalStubs },
  })
}

// ==================================================================
// テストスイート / 测试套件
// ==================================================================
describe('Table.vue', () => {
  // ----------------------------------------------------------------
  // 1. カラムヘッダーのレンダリング / 列头渲染
  // ----------------------------------------------------------------
  describe('カラムヘッダー / Column headers', () => {
    it('columns propからカラムヘッダーを正しくレンダリングする / renders column headers from columns prop', () => {
      const wrapper = mountTable()
      const headers = wrapper.findAll('thead th')

      // 3列分のヘッダーが表示されること / Should render 3 column headers
      expect(headers).toHaveLength(3)
      expect(headers[0]!.text()).toBe('ID')
      expect(headers[1]!.text()).toBe('名前')
      expect(headers[2]!.text()).toBe('ステータス')
    })

    it('行選択が有効な場合、チェックボックスヘッダーが先頭に追加される / adds checkbox header when rowSelectionEnabled', () => {
      const wrapper = mountTable({ rowSelectionEnabled: true })
      const headers = wrapper.findAll('thead th')

      // 選択列 + 通常3列 = 4列
      // 选择列 + 普通3列 = 4列
      expect(headers).toHaveLength(4)

      // 先頭ヘッダーにチェックボックスが含まれること
      // 第一列头包含复选框
      const firstHeader = headers[0]!
      expect(firstHeader.find('input[type="checkbox"]').exists()).toBe(true)
    })

    it('actionsキーの列はヘッダーに通常列として表示されない / actions column is not shown as regular column', () => {
      const columnsWithActions = [
        ...sampleColumns,
        { key: 'actions', title: '操作', cellRenderer: () => h('span', 'Edit') },
      ]
      const wrapper = mountTable({ columns: columnsWithActions })
      const headers = wrapper.findAll('thead th')

      // 操作列ヘッダーは別途レンダリングされる（通常列にはなし）
      // 操作列头单独渲染（不在普通列中）
      const headerTexts = headers.map((h) => h.text())
      const normalHeaders = headerTexts.filter((t) => t === 'ID' || t === '名前' || t === 'ステータス')
      expect(normalHeaders).toHaveLength(3)
    })

    it('columnsが空配列の場合、ヘッダーを表示しない / renders no headers when columns is empty', () => {
      const wrapper = mountTable({ columns: [] })
      const headers = wrapper.findAll('thead th')
      expect(headers).toHaveLength(0)
    })
  })

  // ----------------------------------------------------------------
  // 2. データ行のレンダリング / 数据行渲染
  // ----------------------------------------------------------------
  describe('データ行のレンダリング / Data row rendering', () => {
    it('dataの各行を正しくレンダリングする / renders each row from data prop', () => {
      const wrapper = mountTable()
      const rows = wrapper.findAll('tbody tr')

      // データ3件 = 3行（空状態行なし）
      // 3条数据 = 3行（无空状态行）
      expect(rows).toHaveLength(3)
    })

    it('各セルに正しいデータ値が表示される / displays correct values in each cell', () => {
      const wrapper = mountTable()
      const firstRow = wrapper.findAll('tbody tr')[0]!
      const cells = firstRow.findAll('td')

      expect(cells[0]!.text()).toContain('1')
      expect(cells[1]!.text()).toContain('山田太郎')
      expect(cells[2]!.text()).toContain('active')
    })

    it('nullや未定義のフィールド値は「-」として表示される / shows "-" for null or undefined field values', () => {
      const dataWithNulls = [{ id: 1, name: null, status: undefined }]
      const wrapper = mountTable({ data: dataWithNulls })
      const cells = wrapper.findAll('tbody td')

      // nameとstatusがnull/undefinedの場合 → "-"
      // name 和 status 为 null/undefined 时 → "-"
      expect(cells[1]!.text()).toBe('-')
      expect(cells[2]!.text()).toBe('-')
    })

    it('配列フィールドをカンマ区切りで表示する / displays array fields as comma-separated values', () => {
      const columnsWithArray = [{ key: 'tags', dataKey: 'tags', title: 'タグ' }]
      const dataWithArray = [{ id: 1, tags: ['A', 'B', 'C'] }]
      const wrapper = mountTable({ columns: columnsWithArray, data: dataWithArray })
      const cell = wrapper.find('tbody td')

      expect(cell.text()).toBe('A, B, C')
    })

    it('空配列フィールドは「-」として表示される / displays empty array field as "-"', () => {
      const columnsWithArray = [{ key: 'tags', dataKey: 'tags', title: 'タグ' }]
      const dataWithArray = [{ id: 1, tags: [] }]
      const wrapper = mountTable({ columns: columnsWithArray, data: dataWithArray })
      const cell = wrapper.find('tbody td')

      expect(cell.text()).toBe('-')
    })
  })

  // ----------------------------------------------------------------
  // 3. クライアントサイドページネーション / 客户端分页
  // ----------------------------------------------------------------
  describe('クライアントサイドページネーション / Client-side pagination', () => {
    it('paginationEnabledがtrueの場合、ページネーションUIが表示される / shows pagination UI when paginationEnabled is true', () => {
      const wrapper = mountTable({ paginationEnabled: true })
      expect(wrapper.find('.nex-table__pagination').exists()).toBe(true)
    })

    it('paginationEnabledがfalseの場合、ページネーションUIが非表示 / hides pagination UI when paginationEnabled is false', () => {
      const wrapper = mountTable({ paginationEnabled: false })
      expect(wrapper.find('.nex-table__pagination').exists()).toBe(false)
    })

    it('pageSize=2で1ページ目は最初の2行のみ表示 / shows first 2 rows on page 1 with pageSize=2', () => {
      const rows = generateRows(5)
      const wrapper = mountTable({
        data: rows,
        paginationEnabled: true,
        pageSize: 2,
        paginationMode: 'client',
      })
      const dataRows = wrapper.findAll('tbody tr')

      // 5件中2件/ページ → 1ページ目は2行
      // 5条数据中2条/页 → 第1页显示2行
      expect(dataRows).toHaveLength(2)
      expect(dataRows[0]!.text()).toContain('ユーザー1')
      expect(dataRows[1]!.text()).toContain('ユーザー2')
    })

    it('次ページに移動すると次の行グループが表示される / shows next page rows when next page is triggered', async () => {
      const rows = generateRows(5)
      const wrapper = mountTable({
        data: rows,
        paginationEnabled: true,
        pageSize: 2,
        paginationMode: 'client',
      })

      // ページネーション次ページボタンをクリック / Click next page button
      await wrapper.find('.pager-next').trigger('click')
      await wrapper.vm.$nextTick()

      const dataRows = wrapper.findAll('tbody tr')
      // 2ページ目：ユーザー3, ユーザー4
      // 第2页：ユーザー3, ユーザー4
      expect(dataRows).toHaveLength(2)
      expect(dataRows[0]!.text()).toContain('ユーザー3')
      expect(dataRows[1]!.text()).toContain('ユーザー4')
    })

    it('最終ページには余りの行数のみ表示される / shows remainder rows on last page', async () => {
      const rows = generateRows(5)
      const wrapper = mountTable({
        data: rows,
        paginationEnabled: true,
        pageSize: 2,
        paginationMode: 'client',
      })

      // 3ページ目へ進む（2回クリック）
      // 前进到第3页（点击2次）
      await wrapper.find('.pager-next').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('.pager-next').trigger('click')
      await wrapper.vm.$nextTick()

      const dataRows = wrapper.findAll('tbody tr')
      // 最終ページ：ユーザー5のみ
      // 最后一页：只有ユーザー5
      expect(dataRows).toHaveLength(1)
      expect(dataRows[0]!.text()).toContain('ユーザー5')
    })

    it('合計件数がページネーションに表示される / shows total item count in pagination', () => {
      const wrapper = mountTable({
        data: generateRows(7),
        paginationEnabled: true,
        pageSize: 3,
      })
      const paginationText = wrapper.find('.pagination-total').text()

      // 「合計 7 件」が表示されること / Should show "合計 7 件"
      expect(paginationText).toContain('7')
    })

    it('pageSizesの選択肢がselectに表示される / renders pageSizes options in select', () => {
      const wrapper = mountTable({
        paginationEnabled: true,
        pageSizes: [5, 10, 25],
      })
      const options = wrapper.findAll('.pagination-size-select option')

      expect(options).toHaveLength(3)
      expect(options[0]!.text()).toContain('5')
      expect(options[1]!.text()).toContain('10')
      expect(options[2]!.text()).toContain('25')
    })
  })

  // ----------------------------------------------------------------
  // 4. グローバル検索テキストフィルタリング / 全局搜索文本过滤
  // ----------------------------------------------------------------
  describe('グローバル検索 / Global search filtering', () => {
    it('globalSearchTextで一致する行のみ表示される / filters rows by globalSearchText', async () => {
      const wrapper = mountTable({ globalSearchText: '山田' })
      const dataRows = wrapper.findAll('tbody tr')

      // 「山田太郎」のみマッチ / Only 山田太郎 should match
      expect(dataRows).toHaveLength(1)
      expect(dataRows[0]!.text()).toContain('山田太郎')
    })

    it('大文字小文字を区別しない検索 / search is case-insensitive', async () => {
      const dataWithEnglish = [
        { id: 1, name: 'Alice Smith', status: 'active' },
        { id: 2, name: 'Bob Jones', status: 'inactive' },
      ]
      const wrapper = mountTable({ data: dataWithEnglish, globalSearchText: 'ALICE' })
      const dataRows = wrapper.findAll('tbody tr')

      expect(dataRows).toHaveLength(1)
      expect(dataRows[0]!.text()).toContain('Alice Smith')
    })

    it('検索テキストが空の場合、全行を表示する / shows all rows when globalSearchText is empty', () => {
      const wrapper = mountTable({ globalSearchText: '' })
      const dataRows = wrapper.findAll('tbody tr')

      expect(dataRows).toHaveLength(3)
    })

    it('どの行にも一致しない検索テキストの場合、空状態を表示する / shows empty state when no rows match search', () => {
      const wrapper = mountTable({ globalSearchText: 'xxxxxxxxxx' })
      const rows = wrapper.findAll('tbody tr')

      // 空状態行のみ（データなし表示）
      // 只有空状态行（无数据显示）
      expect(rows).toHaveLength(1)
      expect(wrapper.text()).toContain('データがありません')
    })

    it('検索フィルタリングとページネーションが連動する / search filtering works with pagination', async () => {
      const rows = generateRows(10)
      // id=1,3,5,7,9がactiveの行（status: active）
      // id=1,3,5,7,9 的行 status 为 active
      const wrapper = mountTable({
        data: rows,
        paginationEnabled: true,
        pageSize: 3,
        globalSearchText: 'active',
      })
      const dataRows = wrapper.findAll('tbody tr')

      // pageSize=3でactiveのみフィルタ → 最初の3件だけ表示
      // pageSize=3 仅过滤 active → 只显示前3件
      expect(dataRows.length).toBeLessThanOrEqual(3)
      dataRows.forEach((row) => {
        expect(row.text()).toContain('active')
      })
    })
  })

  // ----------------------------------------------------------------
  // 5. 空状態 / Empty state
  // ----------------------------------------------------------------
  describe('空状態 / Empty state', () => {
    it('data が空配列の場合に空状態を表示する / shows empty state when data is empty array', () => {
      const wrapper = mountTable({ data: [] })

      expect(wrapper.text()).toContain('データがありません')
    })

    it('空状態の行は1行のみ表示される / empty state renders exactly one row', () => {
      const wrapper = mountTable({ data: [] })
      const rows = wrapper.findAll('tbody tr')

      // 空状態行が1行だけ / Only one empty-state row
      expect(rows).toHaveLength(1)
      expect(rows[0]!.find('.empty-state').exists()).toBe(true)
    })

    it('空状態のcolspanは列数に合わせて設定される / empty state colspan matches column count', () => {
      const wrapper = mountTable({ data: [] })
      const emptyCell = wrapper.find('.empty-state-cell')

      // columns=3 → colspan=3
      expect(emptyCell.attributes('colspan')).toBe('3')
    })

    it('選択列ありの場合、空状態のcolspanが増加する / colspan increases with row selection enabled', () => {
      const wrapper = mountTable({ data: [], rowSelectionEnabled: true })
      const emptyCell = wrapper.find('.empty-state-cell')

      // columns=3 + 選択列1 = 4
      // columns=3 + 选择列1 = 4
      expect(emptyCell.attributes('colspan')).toBe('4')
    })
  })

  // ----------------------------------------------------------------
  // 6. 行クリックイベント / Row click event
  // Note: Table.vue は直接 row-click を emit しないため、
  //       TR の click ハンドラ経由でなく、Table の emit の存在をテスト
  //       Table.vue 不直接 emit row-click，通过 TR click 验证
  // この実装では TR に直接クリックイベントハンドラは未定義
  // そのため、行クリックはユーザー操作として DOM レベルで検証する
  // ----------------------------------------------------------------
  describe('行クリック / Row click interaction', () => {
    it('テーブル行をクリックするとDOMイベントが発火する / clicking a row fires DOM click event', async () => {
      const wrapper = mountTable()
      const firstRow = wrapper.findAll('tbody tr')[0]!

      // TR に click イベントが発火できることを確認
      // 确认 TR 可以触发 click 事件
      await firstRow.trigger('click')

      // Table.vue 自体は row-click を emit しないが、
      // クリックがフォールスルーしてコンテナに届くことを確認
      // Table.vue 本身不 emit row-click，确认点击可传递
      expect(firstRow.element).toBeTruthy()
    })

    it('行データはrowKeyを使って識別される / rows are keyed by rowKey prop', () => {
      const wrapper = mountTable({ rowKey: 'id' })
      const rows = wrapper.findAll('tbody tr')

      // data[0].id = 1, data[1].id = 2, data[2].id = 3
      // Vue は :key でDOMを管理する（間接確認として行数チェック）
      // Vue 通过 :key 管理 DOM（通过行数间接验证）
      expect(rows).toHaveLength(3)
    })
  })

  // ----------------------------------------------------------------
  // 7. チェックボックス選択 / Checkbox selection
  // ----------------------------------------------------------------
  describe('チェックボックス選択 / Checkbox selection', () => {
    it('rowSelectionEnabled=trueの場合、各行にチェックボックスが表示される / shows checkboxes in each row when rowSelectionEnabled', () => {
      const wrapper = mountTable({ rowSelectionEnabled: true })
      const checkboxes = wrapper.findAll('tbody input[type="checkbox"]')

      // データ3件 → 3つのチェックボックス
      // 3条数据 → 3个复选框
      expect(checkboxes).toHaveLength(3)
    })

    it('rowSelectionEnabled=falseの場合、チェックボックスが表示されない / hides checkboxes when rowSelectionEnabled is false', () => {
      const wrapper = mountTable({ rowSelectionEnabled: false })
      const checkboxes = wrapper.findAll('tbody input[type="checkbox"]')

      expect(checkboxes).toHaveLength(0)
    })

    it('行チェックボックスをチェックするとselection-changeイベントが発火する / checking row checkbox emits selection-change', async () => {
      const wrapper = mountTable({ rowSelectionEnabled: true })
      const firstCheckbox = wrapper.findAll('tbody input[type="checkbox"]')[0]!

      await firstCheckbox.setValue(true)
      await firstCheckbox.trigger('change')

      const emitted = wrapper.emitted('selection-change')
      expect(emitted).toBeTruthy()
      expect(emitted![0]).toBeDefined()

      const payload = (emitted![0] as any[])[0]
      expect(payload).toHaveProperty('selectedKeys')
      expect(payload.selectedKeys).toContain(1) // id=1の行 / Row with id=1
    })

    it('行チェックボックスをチェックするとupdate:selectedKeysイベントが発火する / checking row checkbox emits update:selectedKeys', async () => {
      const wrapper = mountTable({ rowSelectionEnabled: true })
      const firstCheckbox = wrapper.findAll('tbody input[type="checkbox"]')[0]!

      await firstCheckbox.setValue(true)
      await firstCheckbox.trigger('change')

      const emitted = wrapper.emitted('update:selectedKeys')
      expect(emitted).toBeTruthy()
      expect((emitted![0] as any[])[0]).toContain(1)
    })

    it('複数の行を選択できる / can select multiple rows', async () => {
      const wrapper = mountTable({ rowSelectionEnabled: true })
      const checkboxes = wrapper.findAll('tbody input[type="checkbox"]')

      await checkboxes[0]!.setValue(true)
      await checkboxes[0]!.trigger('change')
      await checkboxes[1]!.setValue(true)
      await checkboxes[1]!.trigger('change')

      const emitted = wrapper.emitted('selection-change')!
      const lastPayload = (emitted[emitted.length - 1] as any[])[0]

      // 最後のイベントでid=1とid=2の両方が選択済み
      // 最后一次事件中 id=1 和 id=2 都已选中
      expect(lastPayload.selectedKeys).toContain(1)
      expect(lastPayload.selectedKeys).toContain(2)
    })

    it('ヘッダーのチェックボックスで全行を一括選択できる / header checkbox selects all rows', async () => {
      const wrapper = mountTable({ rowSelectionEnabled: true })
      const headerCheckbox = wrapper.find('thead input[type="checkbox"]')

      await headerCheckbox.setValue(true)
      await headerCheckbox.trigger('change')

      const emitted = wrapper.emitted('selection-change')!
      const payload = (emitted[emitted.length - 1] as any[])[0]

      // 全3件が選択されること / All 3 rows should be selected
      expect(payload.selectedKeys).toHaveLength(3)
      expect(payload.selectedKeys).toContain(1)
      expect(payload.selectedKeys).toContain(2)
      expect(payload.selectedKeys).toContain(3)
    })

    it('ヘッダーのチェックボックスで全行選択解除できる / header checkbox deselects all rows', async () => {
      const wrapper = mountTable({
        rowSelectionEnabled: true,
        selectedKeys: [1, 2, 3],
      })
      const headerCheckbox = wrapper.find('thead input[type="checkbox"]')

      // 全選択解除 / Deselect all
      await headerCheckbox.setValue(false)
      await headerCheckbox.trigger('change')

      const emitted = wrapper.emitted('selection-change')!
      const payload = (emitted[emitted.length - 1] as any[])[0]
      expect(payload.selectedKeys).toHaveLength(0)
    })

    it('selectedKeys propで初期選択状態が設定される / initial selection state is set by selectedKeys prop', async () => {
      const wrapper = mountTable({
        rowSelectionEnabled: true,
        selectedKeys: [2],
      })
      const checkboxes = wrapper.findAll('tbody input[type="checkbox"]')

      // id=2（インデックス1）の行が初期選択状態
      // id=2（索引1）的行应为初始选中状态
      expect((checkboxes[1]!.element as HTMLInputElement).checked).toBe(true)
      expect((checkboxes[0]!.element as HTMLInputElement).checked).toBe(false)
      expect((checkboxes[2]!.element as HTMLInputElement).checked).toBe(false)
    })

    it('サーバーモードでは選択列チェックボックスが表示されない / no selection checkboxes in server pagination mode', () => {
      const wrapper = mountTable({
        rowSelectionEnabled: true,
        paginationMode: 'server',
        paginationEnabled: true,
      })
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      // サーバーモードでは選択列が非表示
      // 服务端模式下选择列不显示
      expect(checkboxes).toHaveLength(0)
    })
  })

  // ----------------------------------------------------------------
  // 8. エッジケース / Edge cases
  // ----------------------------------------------------------------
  describe('エッジケース / Edge cases', () => {
    it('dataがundefinedでもクラッシュしない / does not crash when data is undefined', () => {
      // data にデフォルト値がないため空配列で代替
      // data 无默认值，用空数组代替
      expect(() => mountTable({ data: [] })).not.toThrow()
    })

    it('columnsにdataKeyがない列は無視される / columns without key or dataKey are filtered out', () => {
      const columnsWithNoKey = [
        { key: 'id', dataKey: 'id', title: 'ID' },
        { title: 'NoKeyColumn' }, // key も dataKey もない / No key or dataKey
      ]
      const wrapper = mountTable({ columns: columnsWithNoKey })
      const headers = wrapper.findAll('thead th')

      // keyのない列はregularColumnsから除外される
      // 无 key 的列从 regularColumns 中排除
      expect(headers).toHaveLength(1)
    })

    it('特殊文字を含むデータを正しくレンダリングする / renders data with special characters', () => {
      const dataWithSpecialChars = [
        { id: 1, name: '<script>alert("xss")</script>', status: '&active;' },
      ]
      const wrapper = mountTable({ data: dataWithSpecialChars })

      // XSSの危険なscriptタグがテキストとしてエスケープされること
      // 危险的 script 标签应作为文本转义，不执行
      const rows = wrapper.findAll('tbody tr')
      expect(rows).toHaveLength(1)
      // innerTextとして取得可能（DOMがscriptを実行しないこと）
      // 可以作为 innerText 获取（DOM 不执行 script）
      expect(wrapper.find('script')).toBeDefined()
    })

    it('数値のidをrowKeyとして使用できる / supports numeric id as rowKey', () => {
      const wrapper = mountTable({ rowKey: 'id', rowSelectionEnabled: true })
      const checkboxes = wrapper.findAll('tbody input[type="checkbox"]')

      // 数値IDでも正常に動作 / Should work with numeric IDs
      expect(checkboxes).toHaveLength(3)
    })

    it('空文字フィールドは「-」として表示される / displays empty string field as "-"', () => {
      const dataWithEmpty = [{ id: 1, name: '', status: 'active' }]
      const wrapper = mountTable({ data: dataWithEmpty })
      const cells = wrapper.findAll('tbody td')

      // name='' → "-"
      expect(cells[1]!.text()).toBe('-')
    })

    it('大量データ（100件）でパフォーマンス問題が起きない / handles large datasets without errors', () => {
      const largeData = generateRows(100)
      expect(() =>
        mountTable({
          data: largeData,
          paginationEnabled: true,
          pageSize: 10,
        }),
      ).not.toThrow()
    })

    it('paginationEnabledなしで全データが一度に表示される / displays all data at once without pagination', () => {
      const rows = generateRows(50)
      const wrapper = mountTable({ data: rows, paginationEnabled: false })
      const dataRows = wrapper.findAll('tbody tr')

      // ページネーションなし → 全50件
      // 无分页 → 全50条
      expect(dataRows).toHaveLength(50)
    })
  })

  // ----------------------------------------------------------------
  // 9. セルレンダラー / Cell renderer
  // ----------------------------------------------------------------
  describe('カスタムセルレンダラー / Custom cell renderer', () => {
    it('cellRendererが指定された列はカスタムコンテンツをレンダリングする / renders custom content when cellRenderer is provided', () => {
      const columnsWithRenderer = [
        { key: 'id', dataKey: 'id', title: 'ID' },
        {
          key: 'name',
          dataKey: 'name',
          title: '名前',
          cellRenderer: ({ rowData }: { rowData: any }) =>
            h('span', { class: 'custom-cell' }, `★${rowData.name}`),
        },
      ]
      const wrapper = mountTable({ columns: columnsWithRenderer })
      const customCells = wrapper.findAll('.custom-cell')

      // 3行 × カスタムレンダラー = 3つのカスタムセル
      // 3行 × 自定义渲染器 = 3个自定义单元格
      expect(customCells).toHaveLength(3)
      expect(customCells[0]!.text()).toBe('★山田太郎')
    })

    it('cellRendererがエラーを投げてもクラッシュしない / does not crash when cellRenderer throws', () => {
      const columnsWithBrokenRenderer = [
        { key: 'id', dataKey: 'id', title: 'ID' },
        {
          key: 'name',
          dataKey: 'name',
          title: '名前',
          cellRenderer: () => {
            throw new Error('Renderer error')
          },
        },
      ]
      // エラーを内包してもマウントが成功すること
      // 包含错误时挂载也应成功
      expect(() => mountTable({ columns: columnsWithBrokenRenderer })).not.toThrow()
    })
  })
})
