/**
 * 日本語フォント（Noto Sans JP）のローダー
 * CDN から動的にフォントをロードしてキャッシュする
 */

// フォントキャッシュ
let cachedFontData: Uint8Array | null = null
let loadingPromise: Promise<Uint8Array> | null = null

// Noto Sans JP フォントの CDN URL
// fontsource プロジェクトから取得
const FONT_URLS = [
  // fontsource (jsdelivr)
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-400-normal.ttf',
  // unpkg fontsource
  'https://unpkg.com/@fontsource/noto-sans-jp@5.1.1/files/noto-sans-jp-japanese-400-normal.woff',
  // jsDelivr から直接
  'https://cdn.jsdelivr.net/gh/nicholasmartin/fonts@master/noto-sans-jp/NotoSansJP-Regular.ttf',
  // Google Fonts (OTF)
  'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf',
]

/**
 * フォントを fetch して ArrayBuffer として取得
 */
async function fetchFont(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    mode: 'cors',
    cache: 'force-cache', // キャッシュを有効化
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${response.status}`)
  }
  
  return response.arrayBuffer()
}

/**
 * 日本語フォントをロード
 * キャッシュがあればキャッシュを返す
 */
export async function loadJapaneseFont(): Promise<Uint8Array> {
  // キャッシュがあれば返す
  if (cachedFontData) {
    return cachedFontData
  }
  
  // ロード中なら待機
  if (loadingPromise) {
    return loadingPromise
  }
  
  // ロード開始
  loadingPromise = (async () => {
    for (const url of FONT_URLS) {
      try {
        const arrayBuffer = await fetchFont(url)
        cachedFontData = new Uint8Array(arrayBuffer)
        return cachedFontData
      } catch (error) {
        console.warn(`Failed to load font from ${url}:`, error)
        // 次の URL を試す
      }
    }
    
    throw new Error('Failed to load Japanese font from all sources')
  })()
  
  try {
    return await loadingPromise
  } finally {
    loadingPromise = null
  }
}

/**
 * フォントがロード済みかどうか
 */
export function isJapaneseFontLoaded(): boolean {
  return cachedFontData !== null
}

/**
 * キャッシュをクリア
 */
export function clearFontCache(): void {
  cachedFontData = null
}
