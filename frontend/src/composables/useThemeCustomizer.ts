import { ref, reactive, watch, readonly } from 'vue'

export interface ThemePreset {
  readonly name: string
  readonly primary: string
  readonly secondary: string
  readonly action: string
}

export interface ThemeSettings {
  // Preset
  presetName: string
  // Colors
  primaryColor: string
  secondaryColor: string
  actionColor: string
  // Layout
  sidebarWidth: number
  navbarHeight: number
  fontSize: number
  borderRadius: number
  contentMaxWidth: number
  // Font
  fontFamily: string
  // Dark mode
  darkMode: 'light' | 'dark' | 'system'
}

const STORAGE_KEY = 'odoo-theme-settings'

const DEFAULT_SETTINGS: Readonly<ThemeSettings> = Object.freeze({
  presetName: 'Odoo Default',
  primaryColor: '#714B67',
  secondaryColor: '#8f8f8f',
  actionColor: '#00A09D',
  sidebarWidth: 240,
  navbarHeight: 46,
  fontSize: 14,
  borderRadius: 4,
  contentMaxWidth: 1140,
  fontFamily: 'System Default',
  darkMode: 'light',
})

export const THEME_PRESETS: readonly ThemePreset[] = Object.freeze([
  { name: 'Odoo Default', primary: '#714B67', secondary: '#8f8f8f', action: '#00A09D' },
  { name: 'Ocean Blue', primary: '#2196F3', secondary: '#607D8B', action: '#03A9F4' },
  { name: 'Forest Green', primary: '#4CAF50', secondary: '#795548', action: '#8BC34A' },
  { name: 'Sunset Orange', primary: '#FF5722', secondary: '#9E9E9E', action: '#FF9800' },
  { name: 'Midnight', primary: '#1a1a2e', secondary: '#16213e', action: '#0f3460' },
  { name: 'Rose Gold', primary: '#b76e79', secondary: '#c9a0a0', action: '#e8b4b8' },
])

export const FONT_OPTIONS: readonly string[] = Object.freeze([
  'System Default',
  'Inter',
  'Roboto',
  'Open Sans',
  'Nunito',
  'Poppins',
])

// Module-level singleton state
const settings = reactive<ThemeSettings>({ ...DEFAULT_SETTINGS })
const isOpen = ref(false)

function getFontFamilyValue(fontName: string): string {
  if (fontName === 'System Default') {
    return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, "Noto Sans", Arial, sans-serif'
  }
  return `"${fontName}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
}

function loadGoogleFont(fontName: string): void {
  if (fontName === 'System Default') return

  const id = `theme-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`
  if (document.getElementById(id)) return

  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`
  document.head.appendChild(link)
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function generateDerivedColors(hex: string): {
  light: string
  lighter: string
  lightest: string
  hoverDark: string
} {
  const { h, s, l } = hexToHsl(hex)
  return {
    light: `hsl(${h}, ${s}%, ${Math.min(l + 30, 95)}%)`,
    lighter: `hsl(${h}, ${s}%, ${Math.min(l + 35, 97)}%)`,
    lightest: `hsl(${h}, ${s}%, ${Math.min(l + 38, 98)}%)`,
    hoverDark: `hsl(${h}, ${s}%, ${Math.max(l - 10, 10)}%)`,
  }
}

function applyTheme(): void {
  const root = document.documentElement

  // Colors
  root.style.setProperty('--o-brand-primary', settings.primaryColor)
  root.style.setProperty('--o-brand-odoo', settings.primaryColor)
  root.style.setProperty('--o-brand-secondary', settings.secondaryColor)
  root.style.setProperty('--o-action', settings.actionColor)
  root.style.setProperty('--odoo-brand', settings.primaryColor)
  root.style.setProperty('--odoo-purple', settings.primaryColor)

  // Derived colors
  const derived = generateDerivedColors(settings.primaryColor)
  root.style.setProperty('--o-brand-light', derived.light)
  root.style.setProperty('--o-brand-lighter', derived.lighter)
  root.style.setProperty('--o-brand-lightest', derived.lightest)
  root.style.setProperty('--o-brand-hover-dark', derived.hoverDark)

  // Layout
  root.style.setProperty('--sidebar-width', `${settings.sidebarWidth}px`)
  root.style.setProperty('--o-navbar-height', `${settings.navbarHeight}px`)
  root.style.setProperty('--topbar-height', `${settings.navbarHeight}px`)
  root.style.setProperty('--o-font-size-base', `${settings.fontSize}px`)
  root.style.setProperty('--o-border-radius', `${settings.borderRadius}px`)
  root.style.setProperty('--o-border-radius-sm', `${Math.max(settings.borderRadius - 1, 0)}px`)
  root.style.setProperty('--o-border-radius-lg', `${settings.borderRadius + 2}px`)
  root.style.setProperty('--o-form-sheet-max-width', `${settings.contentMaxWidth}px`)

  // Font
  loadGoogleFont(settings.fontFamily)
  root.style.setProperty('--o-font-family', getFontFamilyValue(settings.fontFamily))
  document.body.style.fontFamily = getFontFamilyValue(settings.fontFamily)

  // Dark mode
  applyDarkMode(settings.darkMode)
}

function applyDarkMode(mode: 'light' | 'dark' | 'system'): void {
  const root = document.documentElement
  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    root.setAttribute('data-theme', mode)
  }
}

function saveSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings }))
  } catch {
    console.warn('Failed to save theme settings to localStorage')
  }
}

function loadSavedTheme(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<ThemeSettings>
      Object.assign(settings, { ...DEFAULT_SETTINGS, ...parsed })
    }
  } catch {
    console.warn('Failed to load theme settings from localStorage')
  }
  applyTheme()
}

function resetTheme(): void {
  Object.assign(settings, { ...DEFAULT_SETTINGS })
  applyTheme()
  saveSettings()
}

function applyPreset(preset: ThemePreset): void {
  settings.presetName = preset.name
  settings.primaryColor = preset.primary
  settings.secondaryColor = preset.secondary
  settings.actionColor = preset.action
  applyTheme()
}

function openCustomizer(): void {
  isOpen.value = true
}

function closeCustomizer(): void {
  isOpen.value = false
}

export function useThemeCustomizer() {
  // Listen for system dark mode changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleSystemChange = () => {
    if (settings.darkMode === 'system') {
      applyDarkMode('system')
    }
  }
  mediaQuery.addEventListener('change', handleSystemChange)

  return {
    settings,
    isOpen: readonly(isOpen),
    applyTheme,
    applyPreset,
    saveSettings,
    loadSavedTheme,
    resetTheme,
    openCustomizer,
    closeCustomizer,
    THEME_PRESETS,
    FONT_OPTIONS,
  }
}
