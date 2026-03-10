/**
 * Font manager for skia-canvas
 * Loads Japanese fonts for proper text rendering
 */

import { FontLibrary } from 'skia-canvas'
import path from 'path'
import fs from 'fs'

const FONT_DIR = process.env.FONT_DIR || path.join(__dirname, '../../../../fonts')

interface FontConfig {
  family: string
  files: Array<{
    path: string
    weight?: number
    style?: 'normal' | 'italic'
  }>
}

// List of required fonts
const REQUIRED_FONTS: FontConfig[] = [
  {
    family: 'Noto Sans JP',
    files: [
      { path: 'NotoSansJP-Regular.ttf', weight: 400 },
      { path: 'NotoSansJP-Bold.ttf', weight: 700 },
    ],
  },
  {
    family: 'Source Han Sans JP',
    files: [
      { path: 'SourceHanSansJP-Regular.otf', weight: 400 },
      { path: 'SourceHanSansJP-Bold.otf', weight: 700 },
    ],
  },
]

let fontsLoaded = false

/**
 * Load fonts into skia-canvas FontLibrary
 * Should be called once at startup
 */
export async function loadFonts(): Promise<void> {
  if (fontsLoaded) return

  // Create fonts directory if it doesn't exist
  if (!fs.existsSync(FONT_DIR)) {
    fs.mkdirSync(FONT_DIR, { recursive: true })
    console.log(`Created fonts directory at ${FONT_DIR}`)
    console.log('Please add Japanese fonts (e.g., NotoSansJP-Regular.ttf) to this directory')
  }

  for (const fontConfig of REQUIRED_FONTS) {
    for (const file of fontConfig.files) {
      const fontPath = path.join(FONT_DIR, file.path)
      if (fs.existsSync(fontPath)) {
        try {
          FontLibrary.use(fontConfig.family, fontPath)
          console.log(`Loaded font: ${fontConfig.family} from ${fontPath}`)
        } catch (error) {
          console.warn(`Failed to load font ${fontPath}:`, error)
        }
      } else {
        // Font file not found - this is expected initially
        // The font will fall back to system fonts
      }
    }
  }

  fontsLoaded = true
}

/**
 * Get list of available fonts
 */
export function getAvailableFonts(): string[] {
  return [...FontLibrary.families]
}

/**
 * Check if a specific font is available
 */
export function isFontAvailable(fontFamily: string): boolean {
  return FontLibrary.has(fontFamily)
}
