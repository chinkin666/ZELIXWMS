import { ref, computed } from 'vue'
import type { ThemeConfig, ColorPalette } from '../types/theme'

const currentTheme = ref<ThemeConfig | null>(null)
const currentPaletteName = ref<string>('')

export function useTheme() {
  function applyTheme(theme: ThemeConfig, paletteName?: string) {
    currentTheme.value = theme
    const name = paletteName ?? theme.defaultPalette
    currentPaletteName.value = name
    applyPalette(theme, name)
    applyTypography(theme)
    applyButtons(theme)
  }

  function switchPalette(paletteName: string) {
    if (!currentTheme.value) return
    currentPaletteName.value = paletteName
    applyPalette(currentTheme.value, paletteName)
  }

  function applyPalette(theme: ThemeConfig, paletteName: string) {
    const palette = theme.palettes[paletteName]
    if (!palette) return
    const root = document.documentElement
    root.style.setProperty('--o-color-1', palette.alpha)
    root.style.setProperty('--o-color-2', palette.beta)
    root.style.setProperty('--o-color-3', palette.gamma)
    root.style.setProperty('--o-color-4', palette.delta)
    root.style.setProperty('--o-color-5', palette.epsilon)
  }

  function applyTypography(theme: ThemeConfig) {
    const root = document.documentElement
    const { typography } = theme
    root.style.setProperty('--font-heading', `'${typography.headingsFont.family}', ${typography.headingsFont.fallback}`)
    root.style.setProperty('--font-body', `'${typography.bodyFont.family}', ${typography.bodyFont.fallback}`)
    root.style.setProperty('--font-navbar', `'${typography.navbarFont.family}', ${typography.navbarFont.fallback}`)
    root.style.setProperty('--font-button', `'${typography.buttonsFont.family}', ${typography.buttonsFont.fallback}`)
    root.style.setProperty('--h1-size', `${typography.h1Size}rem`)
    root.style.setProperty('--h2-size', `${typography.h2Size}rem`)
    root.style.setProperty('--h3-size', `${typography.h3Size}rem`)
    root.style.setProperty('--h4-size', `${typography.h4Size}rem`)
    root.style.setProperty('--h5-size', `${typography.h5Size}rem`)
    root.style.setProperty('--h6-size', `${typography.h6Size}rem`)

    // Load Google Fonts
    loadGoogleFonts([
      typography.headingsFont,
      typography.bodyFont,
      typography.navbarFont,
      typography.buttonsFont,
    ])
  }

  function applyButtons(theme: ThemeConfig) {
    const root = document.documentElement
    root.style.setProperty('--btn-radius', theme.buttons.borderRadius)
    root.style.setProperty('--btn-padding-y', theme.buttons.paddingY)
    root.style.setProperty('--btn-padding-x', theme.buttons.paddingX)
    root.style.setProperty('--btn-font-weight', String(theme.buttons.fontWeight))
    root.style.setProperty('--border-radius', theme.borderRadius)
    root.style.setProperty('--box-shadow', theme.boxShadow)
  }

  function loadGoogleFonts(fonts: Array<{ url: string }>) {
    const uniqueUrls = [...new Set(fonts.map(f => f.url).filter(Boolean))]
    const existingLinks = document.querySelectorAll('link[data-theme-font]')
    existingLinks.forEach(el => el.remove())

    for (const url of uniqueUrls) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${url}&display=swap`
      link.setAttribute('data-theme-font', 'true')
      document.head.appendChild(link)
    }
  }

  const palette = computed<ColorPalette | null>(() => {
    if (!currentTheme.value || !currentPaletteName.value) return null
    return currentTheme.value.palettes[currentPaletteName.value] ?? null
  })

  const paletteNames = computed(() => {
    if (!currentTheme.value) return []
    return Object.keys(currentTheme.value.palettes)
  })

  return {
    currentTheme,
    currentPaletteName,
    palette,
    paletteNames,
    applyTheme,
    switchPalette,
  }
}
