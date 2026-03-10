export type FontSource = { family: string; url: string; weight?: string | number; style?: string }

/**
 * Load custom fonts for canvas rendering.
 *
 * Why:
 * - Canvas/Konva text measurement and rendering can change if a font isn't loaded yet.
 * - We want WYSIWYG between editor and export.
 */
export async function loadFonts(fonts: FontSource[]): Promise<void> {
  if (!Array.isArray(fonts) || fonts.length === 0) return

  // FontFace API: supported in modern browsers
  const loads = fonts.map(async (f) => {
    const family = String(f.family)
    const url = String(f.url)
    const fontFace = new FontFace(family, `url(${url})`, {
      weight: f.weight as any,
      style: f.style as any,
    })

    const loaded = await fontFace.load()
    ;(document as any).fonts?.add?.(loaded)

    // Ensure it's ready for measurements
    if ((document as any).fonts?.load) {
      await (document as any).fonts.load(`10px "${family}"`)
    }
  })

  await Promise.all(loads)
}





