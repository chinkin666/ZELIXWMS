import { ref } from 'vue'
import type { OrderDocument } from '@/types/order'
import type { PrintTemplate } from '@/types/printTemplate'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import type { Carrier } from '@/types/carrier'
import type { CarrierAutomationConfig } from '@/types/carrierAutomation'
import { fetchPrintTemplate } from '@/api/printTemplates'
import { fetchOrderSourceCompanyById } from '@/api/orderSourceCompany'
import { fetchShipmentOrdersByIds, updateShipmentOrderStatus } from '@/api/shipmentOrders'
import { renderTemplateToPngBlob } from '@/utils/print/renderTemplateToPng'
import { printImage, printPdfBlob } from '@/utils/print/printImage'
import { getPrintConfig } from '@/utils/print/printConfig'
import { resolvePrintTemplateId, resolvePdfSource } from '@/utils/print/resolvePrintTemplate'
import { yamatoB2FetchBatchPdf } from '@/api/carrierAutomation'
import { useToast } from '@/composables/useToast'

export interface PrintContext {
  carriers: Carrier[]
  printTemplatesCache: PrintTemplate[]
  carrierAutomationConfig: CarrierAutomationConfig | null
}

/**
 * Composable for print preview rendering and printing logic.
 * Shared between inspection pages (OneByOneInspection, OneProductInspection, OrderItemScan).
 */
export function useInspectionPrint() {
  const { show: showToast } = useToast()
  const printRendering = ref(false)
  const printError = ref('')
  const printImageUrl = ref('')
  const printTemplate = ref<PrintTemplate | null>(null)
  const orderSourceCompany = ref<OrderSourceCompany | null>(null)
  const currentPdfSource = ref<'local' | 'b2-webapi'>('local')
  let lastPrintObjectUrl: string | null = null

  function cleanupPrintImage() {
    printError.value = ''
    printImageUrl.value = ''
    if (lastPrintObjectUrl) {
      URL.revokeObjectURL(lastPrintObjectUrl)
      lastPrintObjectUrl = null
    }
  }

  function findDefaultTemplate(
    order: OrderDocument,
    allTemplates: PrintTemplate[],
    ctx: PrintContext,
  ): PrintTemplate | null {
    const carrierId = order?.carrierId
    const invoiceType = order?.invoiceType
    if (!carrierId || !invoiceType) return null

    const templateId = resolvePrintTemplateId(carrierId, invoiceType, {
      carriers: ctx.carriers,
      carrierAutomationConfig: ctx.carrierAutomationConfig,
    })

    if (!templateId) return null
    return allTemplates.find((t) => t.id === templateId) || null
  }

  /**
   * Legacy findDefaultTemplate for OrderItemScan that uses carrierId/invoiceType matching directly.
   */
  function findDefaultTemplateLegacy(
    order: OrderDocument,
    allTemplates: PrintTemplate[],
  ): PrintTemplate | null {
    const carrierId = order?.carrierId
    const invoiceType = order?.invoiceType
    if (!carrierId || !invoiceType) return null

    const matched = allTemplates.filter((t) => {
      const carrierMatch = t.carrierId === 'any' || t.carrierId === carrierId
      const invoiceMatch = t.invoiceType === 'any' || t.invoiceType === invoiceType
      return carrierMatch && invoiceMatch
    })

    if (matched.length === 0) return null

    const defaultTemplates = matched.filter((t) => t.isDefault === true)
    if (defaultTemplates.length > 0) return defaultTemplates[0] || null

    return matched[0] || null
  }

  async function renderPrintPreview(order: OrderDocument, ctx: PrintContext) {
    printRendering.value = true
    printError.value = ''
    cleanupPrintImage()

    const pdfSource = resolvePdfSource(order.carrierId, order.invoiceType, {
      carriers: ctx.carriers,
      carrierAutomationConfig: ctx.carrierAutomationConfig,
    })
    currentPdfSource.value = pdfSource

    if (pdfSource === 'b2-webapi') {
      if (!order.trackingId) {
        printError.value = '追跡番号がありません（B2 CloudからPDFを取得できません）'
      }
      printRendering.value = false
      return
    }

    try {
      const allTemplates = ctx.printTemplatesCache
      if (allTemplates.length === 0) {
        printError.value = '印刷テンプレートが読み込まれていません'
        return
      }

      const template = findDefaultTemplate(order, allTemplates, ctx)
      if (!template) {
        printError.value = '該当する印刷テンプレートが見つかりません'
        return
      }

      if (order.orderSourceCompanyId) {
        try {
          orderSourceCompany.value = await fetchOrderSourceCompanyById(order.orderSourceCompanyId)
        } catch {
          orderSourceCompany.value = null
        }
      } else {
        orderSourceCompany.value = null
      }

      const fullTemplate = await fetchPrintTemplate(template.id)
      printTemplate.value = fullTemplate

      const [fullOrder] = await fetchShipmentOrdersByIds<OrderDocument>(
        [order._id!],
        { includeRawData: true },
      )
      const orderForPrint = fullOrder || order

      const blob = await renderTemplateToPngBlob(
        fullTemplate,
        orderForPrint,
        { exportDpi: 203, background: 'white' },
        orderSourceCompany.value,
      )

      const url = URL.createObjectURL(blob)
      lastPrintObjectUrl = url
      printImageUrl.value = url
    } catch (e: any) {
      // 印刷プレビューエラー / 打印预览错误
      printError.value = e?.message || String(e)
    } finally {
      printRendering.value = false
    }
  }

  /**
   * Legacy render for OrderItemScan that loads templates from localStorage.
   */
  async function renderPrintPreviewLegacy(order: OrderDocument) {
    printRendering.value = true
    printError.value = ''
    cleanupPrintImage()

    try {
      const storedTemplates = localStorage.getItem('allPrintTemplatesCache')
      if (!storedTemplates) {
        printError.value = '印刷テンプレートが読み込まれていません'
        return
      }

      const allTemplates = JSON.parse(storedTemplates) as PrintTemplate[]
      const template = findDefaultTemplateLegacy(order, allTemplates)

      if (!template) {
        printError.value = '該当する印刷テンプレートが見つかりません（配送業者と送り状種類に一致するテンプレートが必要です）'
        return
      }

      if (order.orderSourceCompanyId) {
        try {
          orderSourceCompany.value = await fetchOrderSourceCompanyById(order.orderSourceCompanyId)
        } catch (e) {
          // ご依頼主情報読み込み失敗 / Failed to load OrderSourceCompany
          orderSourceCompany.value = null
        }
      } else {
        orderSourceCompany.value = null
      }

      const fullTemplate = await fetchPrintTemplate(template.id)
      printTemplate.value = fullTemplate

      const blob = await renderTemplateToPngBlob(
        fullTemplate,
        order,
        { exportDpi: 203, background: 'white' },
        orderSourceCompany.value,
      )

      const url = URL.createObjectURL(blob)
      lastPrintObjectUrl = url
      printImageUrl.value = url
    } catch (e: any) {
      // 印刷プレビューエラー / 打印预览错误
      printError.value = e?.message || String(e)
    } finally {
      printRendering.value = false
    }
  }

  async function executePrint(order: OrderDocument) {
    if (!printImageUrl.value || !printTemplate.value) {
      printError.value = '印刷データが準備できていません'
      showToast('印刷データが準備できていません', 'danger')
      return
    }

    try {
      await printImage(printImageUrl.value, {
        widthMm: printTemplate.value.canvas.widthMm,
        heightMm: printTemplate.value.canvas.heightMm,
        title: `Print ${order.orderNumber || ''}`.trim(),
      })

      const config = getPrintConfig()
      if (config.method === 'local-bridge') {
        showToast('印刷ジョブを送信しました', 'success')
      } else {
        showToast('印刷を開始しました（印刷ダイアログで100%スケール/余白なしを選択してください）', 'info', 5000)
      }
    } catch (e: any) {
      const msg = e?.message || String(e)
      printError.value = msg
      showToast(`印刷に失敗しました: ${msg}`, 'danger', 5000)
    }
  }

  async function printFromB2WebApi(order: OrderDocument) {
    if (!order.trackingId) {
      printError.value = '追跡番号がありません'
      showToast('追跡番号がありません（B2 CloudからPDFを取得できません）', 'danger')
      return
    }

    try {
      const pdfBlob = await yamatoB2FetchBatchPdf([order.trackingId])
      await printPdfBlob(pdfBlob, {
        title: `Print ${order.orderNumber || ''}`.trim(),
        templateType: 'b2-cloud',
      })
      const config = getPrintConfig()
      if (config.method === 'local-bridge') {
        showToast('印刷ジョブを送信しました', 'success')
      } else {
        showToast('印刷を開始しました', 'success')
      }
    } catch (e: any) {
      const msg = e?.message || String(e)
      printError.value = msg
      showToast(`B2 Cloud PDF印刷に失敗しました: ${msg}`, 'danger', 5000)
    }
  }

  async function markOrderCompleted(order: OrderDocument) {
    if (!order?._id) return
    const orderId = String(order._id)
    try {
      await Promise.all([
        updateShipmentOrderStatus(orderId, 'mark-printed'),
        updateShipmentOrderStatus(orderId, 'mark-inspected'),
      ])
    } catch (e: any) {
      // ステータス更新失敗 / 状态更新失败
      showToast(`ステータス更新に失敗しました: ${e?.message || String(e)}`, 'danger')
    }
  }

  async function markOrderInspectedOnly(order: OrderDocument) {
    if (!order?._id) return
    const orderId = String(order._id)
    try {
      await updateShipmentOrderStatus(orderId, 'mark-inspected')
    } catch (e: any) {
      // ステータス更新失敗 / 状态更新失败
      showToast(`ステータス更新に失敗しました: ${e?.message || String(e)}`, 'danger')
    }
  }

  return {
    printRendering,
    printError,
    printImageUrl,
    printTemplate,
    orderSourceCompany,
    currentPdfSource,
    cleanupPrintImage,
    renderPrintPreview,
    renderPrintPreviewLegacy,
    findDefaultTemplate,
    findDefaultTemplateLegacy,
    executePrint,
    printFromB2WebApi,
    markOrderCompleted,
    markOrderInspectedOnly,
  }
}
