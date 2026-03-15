/**
 * Worker thread for parallel rendering
 * Each worker renders a single template independently
 * Uses simple orderNumber-based PDF caching
 */

import type { PrintTemplate, RenderOptions } from './skiaRenderer';
import { renderTemplateToPng } from './skiaRenderer'
import { checkPdfCache, savePdfToCache } from '../pdfCache'
import { logger } from '@/lib/logger'

export interface WorkerTask {
  item: {
    templateId: string
    orderId: string
    orderSourceCompanyId?: string
  }
  order: any
  template: PrintTemplate
  company: any | null
  options: RenderOptions
  index: number
}

export interface WorkerResult {
  success: boolean
  index: number
  result?: {
    pdfPath: string // Path to cached PDF file
    orderNumber: string
    widthMm: number
    heightMm: number
  }
  error?: string
}

/**
 * Build print context from order data
 */
function buildPrintContext(
  order: any,
  requiresYamatoSortCode = false,
  orderSourceCompany?: any
): Record<string, any> {
  const carrierRawRow =
    order?.carrierRawRow && typeof order.carrierRawRow === 'object'
      ? (order.carrierRawRow as Record<string, any>)
      : {}

  const ctx: Record<string, any> = {
    ...carrierRawRow,
    orderId: order?._id,
    orderNumber: order?.orderNumber,
    carrierId: order?.carrierId,
    invoiceType: order?.invoiceType,
    recipientPostalCode: order?.recipient?.postalCode,
    recipientAddressPrefecture: order?.recipient?.prefecture,
    recipientAddressCity: order?.recipient?.city,
    recipientAddressStreet: order?.recipient?.street,
    recipientAddressBuilding: (order?.recipient as any)?.building || '',
    recipientAddress:
      [order?.recipient?.prefecture, order?.recipient?.city, order?.recipient?.street, (order?.recipient as any)?.building]
        .filter(Boolean)
        .join(' ') || '',
    recipientName: order?.recipient?.name,
    recipientPhone: order?.recipient?.phone,
    senderPostalCode: order?.sender?.postalCode,
    senderAddressPrefecture: order?.sender?.prefecture,
    senderAddressCity: order?.sender?.city,
    senderAddressStreet: order?.sender?.street,
    senderAddressBuilding: (order?.sender as any)?.building || '',
    senderAddress:
      [order?.sender?.prefecture, order?.sender?.city, order?.sender?.street, (order?.sender as any)?.building]
        .filter(Boolean)
        .join(' ') || '',
    senderName: order?.sender?.name,
    senderPhone: order?.sender?.phone,
  }

  if (requiresYamatoSortCode) {
    const yamato = order?.carrierData?.yamato
    ctx['仕分けコード'] = yamato?.sortingCode || carrierRawRow['仕分けコード'] || '999999'
    ctx['発店コード1'] = yamato?.hatsuBaseNo1 || orderSourceCompany?.hatsuBaseNo1 || '000'
    ctx['発店コード2'] = yamato?.hatsuBaseNo2 || orderSourceCompany?.hatsuBaseNo2 || '000'
    ctx['発ベースNo-1'] = yamato?.hatsuBaseNo1 || orderSourceCompany?.hatsuBaseNo1 || '000'
    ctx['発ベースNo-2'] = yamato?.hatsuBaseNo2 || orderSourceCompany?.hatsuBaseNo2 || '000'
  }

  return ctx
}

/**
 * Simple transform mapping runner
 */
async function runTransformMapping(mapping: any, row: Record<string, any>): Promise<any> {
  if (!mapping || !mapping.inputs || mapping.inputs.length === 0) {
    return mapping?.defaultValue ?? ''
  }

  const inputValues: any[] = []
  for (const input of mapping.inputs) {
    let value: any
    if (input.type === 'column') {
      value = row[input.column]
    } else if (input.type === 'literal') {
      value = input.value
    }
    inputValues.push(value)
  }

  const combine = mapping.combine
  let result: any

  if (combine.plugin === 'combine.concat') {
    const sep = combine.params?.separator ?? ''
    const ignoreEmpty = combine.params?.ignoreEmpty !== false
    const filtered = ignoreEmpty
      ? inputValues.filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
      : inputValues
    result = filtered.map((v) => (v === undefined || v === null ? '' : String(v))).join(sep)
  } else if (combine.plugin === 'combine.first') {
    for (const v of inputValues) {
      if (v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '')) {
        result = v
        break
      }
    }
  } else {
    result = inputValues[0]
  }

  if (result === undefined || result === null || result === '') {
    return mapping.defaultValue ?? result
  }

  return result
}

/**
 * Worker entry point
 * Export a function for piscina to call
 */
export default async function renderWorker(task: WorkerTask): Promise<WorkerResult> {
  try {
    const { order, template, company, options, index } = task

    const orderNumber = order?.orderNumber as string
    if (!orderNumber) {
      throw new Error('Order number is required')
    }

    // Check PDF cache (based on orderNumber)
    const orderUpdatedAt = order?.status?.carrierReceipt?.receivedAt as Date | undefined
    const cachedPath = checkPdfCache(orderNumber, orderUpdatedAt)

    if (cachedPath) {
      // Cache hit - return file path directly
      return {
        success: true,
        index,
        result: {
          pdfPath: cachedPath,
          orderNumber,
          widthMm: template.canvas.widthMm,
          heightMm: template.canvas.heightMm,
        },
      }
    }

    // Cache miss - render new PDF
    const context = buildPrintContext(order, template.requiresYamatoSortCode, company)

    const renderResult = await renderTemplateToPng(
      template,
      context,
      (mapping, ctx) => runTransformMapping(mapping, ctx),
      {
        exportDpi: options.exportDpi,
        background: options.background,
      }
    )

    // Save PDF to cache (only PDF, no PNG)
    const pdfPath = await savePdfToCache(orderNumber, renderResult.pdfBuffer)

    // Free memory immediately
    renderResult.pngBuffer = null as any
    renderResult.pdfBuffer = null as any

    return {
      success: true,
      index,
      result: {
        pdfPath,
        orderNumber,
        widthMm: template.canvas.widthMm,
        heightMm: template.canvas.heightMm,
      },
    }
  } catch (error: any) {
    logger.error({ err: error }, `[RenderWorker] Error rendering item ${task.index}`)
    return {
      success: false,
      index: task.index,
      error: error?.message || String(error),
    }
  }
}
