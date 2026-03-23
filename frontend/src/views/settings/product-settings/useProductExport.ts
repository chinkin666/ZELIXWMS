/**
 * 商品CSV出力コンポーザブル / 商品CSV导出组合式函数
 *
 * ProductSettings.vue から CSV出力関連のロジックを分離。
 * エクスポート列定義、プリセット管理、CSV生成を担当する。
 * 从 ProductSettings.vue 中分离CSV导出相关逻辑。
 * 负责导出列定义、预设管理、CSV生成。
 */
import { ref, type Ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import type { Product } from '@/types/product'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

/** エクスポート列定義 / 导出列定义 */
export interface ExportColumn {
  key: string
  label: string
  getValue: (r: Product) => string | number
}

/** エクスポートプリセット / 导出预设 */
export interface ExportPreset {
  name: string
  columns: string[]
}

/** ローカルストレージキー / 本地存储键 */
const EXPORT_STORAGE_KEY = 'zelix_product_export_presets'

/**
 * 商品CSV出力に関するリアクティブ状態と操作を提供する
 * 提供商品CSV导出相关的响应式状态和操作
 *
 * @param stockMap - 在庫数マップ（productId → totalQuantity） / 库存数量映射
 * @param filteredList - フィルタ済み商品リスト / 已过滤的商品列表
 */
export function useProductExport(
  stockMap: Ref<Map<string, number>>,
  filteredList: Ref<Product[]>,
) {
  const { confirm } = useConfirmDialog()
  const toast = useToast()
  const { t } = useI18n()

  // --- 全エクスポート列定義 / 全部导出列定义 ---
  const allExportColumns: ExportColumn[] = [
    { key: 'sku', label: t('wms.product.skuCode', 'SKU管理番号'), getValue: r => r.sku },
    { key: 'name', label: t('wms.product.printName', '印刷用商品名'), getValue: r => r.name },
    { key: 'nameFull', label: t('wms.product.productName', '商品名'), getValue: r => r.nameFull || '' },
    { key: 'barcode', label: t('wms.product.inspectionCode', '検品コード'), getValue: r => (r.barcode || []).join(' / ') },
    { key: 'category', label: t('wms.product.category', 'カテゴリー'), getValue: r => { const m: Record<string, string> = { '0': t('wms.product.catProduct', '商品'), '1': t('wms.product.catConsumable', '消耗品'), '2': t('wms.product.catWork', '作業'), '3': t('wms.product.catBonus', 'おまけ'), '4': t('wms.product.catMaterial', '部材') }; return m[r.category || '0'] || t('wms.product.catProduct', '商品') } },
    { key: 'coolType', label: t('wms.product.coolType', 'クール区分'), getValue: r => { const m: Record<string, string> = { '0': t('wms.product.coolNormal', '通常'), '1': t('wms.product.coolFrozen', 'クール冷凍'), '2': t('wms.product.coolChilled', 'クール冷蔵') }; return m[r.coolType || ''] || '' } },
    { key: 'mailCalcEnabled', label: t('wms.product.mailCalc', 'メール便計算'), getValue: r => r.mailCalcEnabled ? t('wms.product.enabled', 'する') : t('wms.product.disabled', 'しない') },
    { key: 'mailCalcMaxQuantity', label: t('wms.product.mailCalcMax', 'メール便最大数量'), getValue: r => r.mailCalcMaxQuantity ?? '' },
    { key: 'price', label: t('wms.product.price', '商品金額'), getValue: r => r.price ?? '' },
    { key: 'handlingTypes', label: t('wms.product.handlingTypes', '荷扱い'), getValue: r => (r.handlingTypes || []).join(' / ') },
    { key: 'memo', label: t('wms.product.memo', 'メモ'), getValue: r => r.memo || '' },
    { key: 'subSkus', label: t('wms.product.subSkus', '子SKU'), getValue: r => (r.subSkus || []).map(s => s.subSku).join(' / ') },
    { key: 'stockQuantity', label: t('wms.product.stockQuantity', '在庫数'), getValue: r => stockMap.value.get(r._id) ?? 0 },
    { key: 'customField1', label: t('wms.product.customField1', '独自1'), getValue: r => r.customField1 || '' },
    { key: 'customField2', label: t('wms.product.customField2', '独自2'), getValue: r => r.customField2 || '' },
    { key: 'customField3', label: t('wms.product.customField3', '独自3'), getValue: r => r.customField3 || '' },
    { key: 'customField4', label: t('wms.product.customField4', '独自4'), getValue: r => r.customField4 || '' },
    { key: 'width', label: t('wms.product.width', '幅(mm)'), getValue: r => r.width ?? '' },
    { key: 'depth', label: t('wms.product.depth', '奥行(mm)'), getValue: r => r.depth ?? '' },
    { key: 'height', label: t('wms.product.height', '高さ(mm)'), getValue: r => r.height ?? '' },
    { key: 'weight', label: t('wms.product.weight', '重量(g)'), getValue: r => r.weight ?? '' },
    { key: 'nameEn', label: t('wms.product.nameEn', '英語商品名'), getValue: r => r.nameEn || '' },
    { key: 'countryOfOrigin', label: t('wms.product.countryOfOrigin', '原産国'), getValue: r => r.countryOfOrigin || '' },
    { key: 'allocationRule', label: t('wms.product.allocationRule', '引当規則'), getValue: r => r.allocationRule || 'FIFO' },
    { key: 'serialTrackingEnabled', label: t('wms.product.serialTracking', 'シリアルNo管理'), getValue: r => r.serialTrackingEnabled ? t('wms.product.enabled', 'する') : t('wms.product.disabled', 'しない') },
    { key: 'inboundExpiryDays', label: t('wms.product.inboundExpiryDays', '入庫期限日数'), getValue: r => r.inboundExpiryDays ?? '' },
    { key: 'imageUrl', label: t('wms.product.imageUrl', '画像URL'), getValue: r => r.imageUrl || '' },
    { key: 'createdAt', label: t('wms.product.createdAt', '作成日時'), getValue: r => r.createdAt ? new Date(r.createdAt).toLocaleString('ja-JP') : '' },
    { key: 'updatedAt', label: t('wms.product.updatedAt', '更新日時'), getValue: r => r.updatedAt ? new Date(r.updatedAt).toLocaleString('ja-JP') : '' },
  ]

  // --- リアクティブ状態 / 响应式状态 ---
  /** エクスポートパネル表示フラグ / 导出面板显示标志 */
  const showExportPanel = ref(false)
  /** 選択中のエクスポート列キー / 已选择的导出列键 */
  const exportColumnKeys = ref<string[]>(allExportColumns.map(c => c.key))
  /** 保存済みプリセット一覧 / 已保存预设列表 */
  const exportPresets = ref<ExportPreset[]>([])
  /** 現在選択中のプリセット名 / 当前选择的预设名 */
  const selectedExportPreset = ref('')

  /**
   * ローカルストレージからプリセットを読み込む
   * 从本地存储加载预设
   */
  const loadExportPresets = () => {
    try {
      const raw = localStorage.getItem(EXPORT_STORAGE_KEY)
      exportPresets.value = raw ? JSON.parse(raw) : []
    } catch { exportPresets.value = [] }
  }

  /**
   * プリセットをローカルストレージに永続化する
   * 将预设持久化到本地存储
   */
  const persistExportPresets = () => {
    localStorage.setItem(EXPORT_STORAGE_KEY, JSON.stringify(exportPresets.value))
  }

  /**
   * 選択されたプリセットを読み込んで列キーを反映する
   * 加载选中的预设并应用列键
   */
  const loadExportPreset = () => {
    if (!selectedExportPreset.value) {
      exportColumnKeys.value = allExportColumns.map(c => c.key)
      return
    }
    const p = exportPresets.value.find(x => x.name === selectedExportPreset.value)
    if (p) exportColumnKeys.value = [...p.columns]
  }

  /**
   * 現在の列選択をプリセットとして保存する
   * 将当前列选择保存为预设
   */
  const saveExportPreset = () => {
    const name = prompt(t('wms.product.enterPresetName', 'プリセット名を入力してください:'))
    if (!name) return
    const preset: ExportPreset = { name, columns: [...exportColumnKeys.value] }
    const idx = exportPresets.value.findIndex(x => x.name === name)
    if (idx >= 0) {
      exportPresets.value = exportPresets.value.map((p, i) => i === idx ? preset : p)
    } else {
      exportPresets.value = [...exportPresets.value, preset]
    }
    persistExportPresets()
    selectedExportPreset.value = name
    toast.showSuccess(t('wms.product.presetSaved', `プリセット「${name}」を保存しました`))
  }

  /**
   * 選択中のプリセットを削除する
   * 删除选中的预设
   */
  const deleteExportPreset = async () => {
    if (!selectedExportPreset.value) return
    try {
      if (!(await confirm('この操作を実行しますか？'))) return
    } catch { return }
    exportPresets.value = exportPresets.value.filter(p => p.name !== selectedExportPreset.value)
    persistExportPresets()
    selectedExportPreset.value = ''
    exportColumnKeys.value = allExportColumns.map(c => c.key)
  }

  /**
   * フィルタ済みデータをCSVとしてエクスポートする
   * 将已过滤的数据导出为CSV
   */
  const exportCsv = () => {
    const data = filteredList.value
    if (data.length === 0) { toast.showError(t('wms.product.noDataToExport', 'エクスポートするデータがありません')); return }
    const activeCols = allExportColumns.filter(c => exportColumnKeys.value.includes(c.key))
    if (activeCols.length === 0) { toast.showError(t('wms.product.selectAtLeastOneColumn', '出力する列を1つ以上選択してください')); return }
    const headers = activeCols.map(c => c.label)
    const csvRows = data.map(r => activeCols.map(c => c.getValue(r)))
    const bom = '\uFEFF'
    const csv = bom + [headers.join(','), ...csvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `商品マスター_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.showSuccess(t('wms.product.exportedCount', `${data.length}件をエクスポートしました`))
  }

  return {
    // 列定義 / 列定义
    allExportColumns,
    // 状態 / 状态
    showExportPanel,
    exportColumnKeys,
    exportPresets,
    selectedExportPreset,
    // 操作 / 操作
    loadExportPresets,
    loadExportPreset,
    saveExportPreset,
    deleteExportPreset,
    exportCsv,
  }
}
