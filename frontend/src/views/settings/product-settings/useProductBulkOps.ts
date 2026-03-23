/**
 * 商品一括操作コンポーザブル / 商品批量操作组合式函数
 *
 * ProductSettings.vue から一括操作関連のロジックを分離。
 * 一括削除、一括バーコード生成、一括ラベル印刷を担当する。
 * 从 ProductSettings.vue 中分离批量操作相关逻辑。
 * 负责批量删除、批量条码生成、批量标签打印。
 */
import { ref, type Ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { deleteProduct, updateProduct } from '@/api/product'
import type { Product } from '@/types/product'

/**
 * 商品一括操作に関するリアクティブ状態と操作を提供する
 * 提供商品批量操作相关的响应式状态和操作
 *
 * @param list - 全商品リスト / 全商品列表
 * @param selectedKeys - 選択中の商品IDリスト / 已选择的商品ID列表
 * @param loadList - 商品リスト再読み込み関数 / 商品列表重新加载函数
 */
export function useProductBulkOps(
  list: Ref<Product[]>,
  selectedKeys: Ref<string[]>,
  loadList: () => Promise<void>,
) {
  const toast = useToast()
  const { t } = useI18n()

  // --- 一括削除 / 批量删除 ---
  /** 一括削除処理中フラグ / 批量删除处理中标志 */
  const isBulkDeleting = ref(false)

  /**
   * 選択された商品を一括削除する
   * 批量删除选中的商品
   */
  const handleBulkDelete = async () => {
    if (selectedKeys.value.length === 0) return
    try {
      await ElMessageBox.confirm(
        `${selectedKeys.value.length}件の商品を削除してもよろしいですか？この操作は取り消せません。 / 确定要删除${selectedKeys.value.length}件商品吗？此操作不可撤销。`,
        '確認 / 确认',
        { confirmButtonText: '削除 / 删除', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
      )
    } catch { return }
    isBulkDeleting.value = true
    let successCount = 0
    let failCount = 0
    for (const id of selectedKeys.value) {
      try {
        await deleteProduct(id)
        successCount++
      } catch {
        failCount++
      }
    }
    isBulkDeleting.value = false
    selectedKeys.value = []
    if (successCount > 0) toast.showSuccess(t('wms.product.deletedCount', `${successCount}件を削除しました`))
    if (failCount > 0) toast.showError(t('wms.product.deleteFailedCount', `${failCount}件の削除に失敗しました`))
    await loadList()
  }

  // --- 一括バーコード生成 / 批量条码生成 ---
  /** 一括バーコード生成処理中フラグ / 批量条码生成处理中标志 */
  const isBulkBarcode = ref(false)

  /**
   * 選択された商品にバーコードを一括生成する（SKUをバーコードとして設定）
   * 为选中的商品批量生成条码（将SKU设为条码）
   */
  const handleBulkBarcodeGenerate = async () => {
    const targets = list.value.filter(r => selectedKeys.value.includes(r._id) && (!r.barcode || r.barcode.length === 0))
    if (targets.length === 0) {
      toast.showError(t('wms.product.noBarcodeTargets', '選択された商品にバーコード未設定の商品がありません'))
      return
    }
    try {
      await ElMessageBox.confirm(
        `${targets.length}件の商品にバーコードを自動生成しますか？（SKUコードをバーコードとして設定します） / 确定要为${targets.length}件商品自动生成条码吗？（将SKU代码设为条码）`,
        '確認 / 确认',
        { confirmButtonText: '生成 / 生成', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
      )
    } catch { return }
    isBulkBarcode.value = true
    let successCount = 0
    let failCount = 0
    for (const p of targets) {
      try {
        await updateProduct(p._id, { barcode: [p.sku] })
        successCount++
      } catch {
        failCount++
      }
    }
    isBulkBarcode.value = false
    if (successCount > 0) toast.showSuccess(t('wms.product.barcodeSetCount', `${successCount}件にバーコードを設定しました`))
    if (failCount > 0) toast.showError(t('wms.product.barcodeSetFailed', `${failCount}件の設定に失敗しました`))
    await loadList()
  }

  // --- 一括ラベル印刷 / 批量标签打印 ---
  /** ラベル印刷ダイアログ表示フラグ / 标签打印对话框显示标志 */
  const labelPrintDialogVisible = ref(false)
  /** 単一ラベル印刷対象商品 / 单个标签打印目标商品 */
  const labelPrintProduct = ref<Product | null>(null)
  /** 一括ラベル印刷対象商品リスト / 批量标签打印目标商品列表 */
  const labelPrintProducts = ref<Product[]>([])

  /**
   * 単一商品のラベル印刷ダイアログを開く
   * 打开单个商品的标签打印对话框
   */
  const openLabelPrint = (product: Product) => {
    labelPrintProduct.value = product
    labelPrintProducts.value = []
    labelPrintDialogVisible.value = true
  }

  /**
   * 選択された商品をまとめてラベル印刷ダイアログに渡す
   * 将选中的商品传递给标签打印对话框
   */
  const handleBulkLabelPrint = () => {
    if (selectedKeys.value.length === 0) return
    const selected = list.value.filter((r) => selectedKeys.value.includes(r._id))
    if (selected.length === 0) return
    labelPrintProduct.value = null
    labelPrintProducts.value = selected
    labelPrintDialogVisible.value = true
  }

  return {
    // 一括削除 / 批量删除
    isBulkDeleting,
    handleBulkDelete,
    // 一括バーコード生成 / 批量条码生成
    isBulkBarcode,
    handleBulkBarcodeGenerate,
    // ラベル印刷 / 标签打印
    labelPrintDialogVisible,
    labelPrintProduct,
    labelPrintProducts,
    openLabelPrint,
    handleBulkLabelPrint,
  }
}
