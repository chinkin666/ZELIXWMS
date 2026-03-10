import type { PrintTemplate } from '@/types/printTemplate'

export function createEmptyPrintTemplate(overrides?: Partial<PrintTemplate>): PrintTemplate {
  return {
    id: overrides?.id || (crypto.randomUUID?.() || Math.random().toString(36).slice(2)),
    name: overrides?.name ?? '',
    canvas: {
      widthMm: overrides?.canvas?.widthMm ?? 100,
      heightMm: overrides?.canvas?.heightMm ?? 150,
      pxPerMm: overrides?.canvas?.pxPerMm ?? 4,
    },
    elements: Array.isArray(overrides?.elements) ? overrides!.elements! : [],
    meta: overrides?.meta ?? { version: 1 },
  }
}


