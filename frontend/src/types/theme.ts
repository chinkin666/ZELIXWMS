export interface ColorPalette {
  readonly alpha: string
  readonly beta: string
  readonly gamma: string
  readonly delta: string
  readonly epsilon: string
}

export interface FontDef {
  readonly family: string
  readonly fallback: string
  readonly url: string
}

export interface Typography {
  readonly headingsFont: FontDef
  readonly bodyFont: FontDef
  readonly navbarFont: FontDef
  readonly buttonsFont: FontDef
  readonly h1Size: number
  readonly h2Size: number
  readonly h3Size: number
  readonly h4Size: number
  readonly h5Size: number
  readonly h6Size: number
}

export interface ButtonConfig {
  readonly borderRadius: string
  readonly paddingY: string
  readonly paddingX: string
  readonly fontWeight: number
}

export interface ThemeConfig {
  readonly defaultPalette: string
  readonly palettes: Record<string, ColorPalette>
  readonly typography: Typography
  readonly buttons: ButtonConfig
  readonly borderRadius: string
  readonly boxShadow: string
}
