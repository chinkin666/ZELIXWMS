/**
 * 日本語文字幅計算ユーティリティ
 * 全角文字 = 2、半角文字 = 1
 */

/**
 * 単一文字の幅を計算 (全角=2, 半角=1)
 */
export function getCharWidth(code: number): number {
  if (code <= 0x007f) return 1
  if (code >= 0xff61 && code <= 0xff9f) return 1
  if (code >= 0xffa0 && code <= 0xffdc) return 1
  if (code >= 0x4e00 && code <= 0x9fff) return 2
  if (code >= 0x3040 && code <= 0x309f) return 2
  if (code >= 0x30a0 && code <= 0x30ff) return 2
  if (code >= 0xff01 && code <= 0xff60) return 2
  if (code >= 0xffe0 && code <= 0xffef) return 2
  if (code >= 0x3000 && code <= 0x303f) return 2
  return 2
}

/**
 * 文字列の表示幅を計算（全角=2、半角=1）
 */
export function getStringWidth(str: string): number {
  let width = 0
  for (let i = 0; i < str.length; i++) {
    width += getCharWidth(str.charCodeAt(i))
  }
  return width
}

/**
 * 文字列を指定幅で分割（前半と後半を返す）
 * @param str 分割する文字列
 * @param maxWidth 前半の最大幅（半角単位）
 * @returns [前半, 後半]
 */
export function splitByWidth(str: string, maxWidth: number): [string, string] {
  if (!str) return ['', '']
  let width = 0
  for (let i = 0; i < str.length; i++) {
    const cw = getCharWidth(str.charCodeAt(i))
    if (width + cw > maxWidth) {
      return [str.substring(0, i), str.substring(i)]
    }
    width += cw
  }
  return [str, '']
}
