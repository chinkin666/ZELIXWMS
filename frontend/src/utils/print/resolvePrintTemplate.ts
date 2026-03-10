import type { Carrier } from '@/types/carrier'
import type { CarrierAutomationConfig, PdfSource } from '@/types/carrierAutomation'
import { isBuiltInCarrierId } from '@/utils/carrier'

export interface PrintTemplateResolutionContext {
  /** All carriers (including built-in) */
  carriers: Carrier[]
  /** Carrier automation config (for built-in carriers like YAMATO_B2) */
  carrierAutomationConfig?: CarrierAutomationConfig | null
}

/**
 * Resolve the PDF source for a given carrierId and invoiceType
 *
 * Only built-in carriers (like YAMATO_B2) can use 'b2-webapi' as PDF source.
 * User-added carriers always use 'local' (template-based rendering).
 *
 * @returns 'b2-webapi' or 'local' (default)
 */
export function resolvePdfSource(
  carrierId: string | undefined,
  invoiceType: string | undefined,
  context: PrintTemplateResolutionContext
): PdfSource {
  if (!carrierId || !invoiceType) {
    return 'local'
  }

  // Only built-in carriers can use b2-webapi PDF source
  if (isBuiltInCarrierId(carrierId)) {
    const config = context.carrierAutomationConfig
    if (!config?.yamatoB2?.serviceTypeMapping) {
      return 'local'
    }
    const serviceConfig = config.yamatoB2.serviceTypeMapping[invoiceType]
    return serviceConfig?.pdfSource || 'local'
  }

  // User-added carriers always use local templates
  return 'local'
}

/**
 * Resolve the print template ID for a given carrierId and invoiceType
 *
 * For built-in carriers (like YAMATO_B2):
 *   - Look up from CarrierAutomationConfig.yamatoB2.serviceTypeMapping[invoiceType].printTemplateId
 *
 * For user-added carriers:
 *   - Look up from Carrier.services where invoiceType matches
 *
 * @returns The printTemplateId or undefined if not found
 */
export function resolvePrintTemplateId(
  carrierId: string | undefined,
  invoiceType: string | undefined,
  context: PrintTemplateResolutionContext
): string | undefined {
  if (!carrierId || !invoiceType) {
    return undefined
  }

  // Check if built-in carrier
  if (isBuiltInCarrierId(carrierId)) {
    // For built-in carriers, look up from CarrierAutomationConfig
    const config = context.carrierAutomationConfig
    if (!config?.yamatoB2?.serviceTypeMapping) {
      return undefined
    }
    const serviceConfig = config.yamatoB2.serviceTypeMapping[invoiceType]
    return serviceConfig?.printTemplateId
  }

  // For user-added carriers, look up from Carrier.services
  const carrier = context.carriers.find((c) => c._id === carrierId)
  if (!carrier?.services) {
    return undefined
  }
  const service = carrier.services.find((s) => s.invoiceType === invoiceType)
  return service?.printTemplateId
}
