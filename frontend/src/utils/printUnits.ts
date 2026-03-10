/**
 * Print / layout unit conversions for canvas-based rendering.
 *
 * We keep physical sizes (mm/cm) in the template, and convert to pixels for:
 * - editor preview (screen pxPerMm)
 * - export image for printing (exportDpi => pxPerMm)
 *
 * Having this in one place makes it easy to change assumptions later.
 */

/** Photoshop default resolution (DPI). Useful when specs are provided in px@72dpi. */
export const PHOTOSHOP_DPI = 72 as const

export const MM_PER_INCH = 25.4 as const
export const CM_PER_INCH = 2.54 as const
export const PT_PER_INCH = 72 as const
export const MM_PER_PT = MM_PER_INCH / PT_PER_INCH

/** Export DPI -> pixels per millimeter */
export function dpiToPxPerMm(dpi: number): number {
  return dpi / MM_PER_INCH
}

/** Millimeter -> pixels (given pxPerMm) */
export function mmToPx(mm: number, pxPerMm: number): number {
  return mm * pxPerMm
}

/** Pixels -> millimeter (given pxPerMm) */
export function pxToMm(px: number, pxPerMm: number): number {
  return px / pxPerMm
}

/** Centimeter -> pixels (defaults to Photoshop 72 DPI) */
export function cmToPx(cm: number, dpi: number = PHOTOSHOP_DPI): number {
  return (cm / CM_PER_INCH) * dpi
}

/** Pixels -> centimeter (defaults to Photoshop 72 DPI) */
export function pxToCm(px: number, dpi: number = PHOTOSHOP_DPI): number {
  return (px / dpi) * CM_PER_INCH
}

/** Point (pt) -> millimeter (mm). 1pt = 1/72 inch */
export function ptToMm(pt: number): number {
  return pt * MM_PER_PT
}

/** Millimeter (mm) -> point (pt). */
export function mmToPt(mm: number): number {
  return mm / MM_PER_PT
}


