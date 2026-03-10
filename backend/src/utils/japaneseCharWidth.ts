/**
 * 日本語文字幅計算ユーティリティ
 * 全角文字 = 2、半角文字 = 1
 */

/**
 * 単一文字の幅を計算 (全角=2, 半角=1)
 * @param code 文字コード (charCodeAt の結果)
 * @returns 文字幅
 */
export function getCharWidth(code: number): number {
  // ASCII (半角)
  if (code <= 0x007f) return 1;
  // 半角カタカナ
  if (code >= 0xff61 && code <= 0xff9f) return 1;
  // 半角ハングル
  if (code >= 0xffa0 && code <= 0xffdc) return 1;
  // CJK統一漢字
  if (code >= 0x4e00 && code <= 0x9fff) return 2;
  // 平仮名
  if (code >= 0x3040 && code <= 0x309f) return 2;
  // 片仮名（全角）
  if (code >= 0x30a0 && code <= 0x30ff) return 2;
  // 全角ASCII・記号 (0xFF01-0xFF60)
  if (code >= 0xff01 && code <= 0xff60) return 2;
  // 全角通貨記号など (0xFFE0-0xFFEF)
  if (code >= 0xffe0 && code <= 0xffef) return 2;
  // CJK記号・句読点
  if (code >= 0x3000 && code <= 0x303f) return 2;
  // その他は全角として扱う（安全側）
  return 2;
}

/**
 * 文字列の表示幅を計算（全角=2、半角=1）
 * @param str 計算する文字列
 * @returns 文字幅
 */
export function getStringWidth(str: string): number {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    width += getCharWidth(str.charCodeAt(i));
  }
  return width;
}

/**
 * 文字列の表示幅を計算（エイリアス）
 * @deprecated getStringWidth を使用してください
 */
export const getJapaneseCharWidth = getStringWidth;

/**
 * 文字列を指定幅で切り詰め（全角=2、半角=1）
 * @param str 切り詰める文字列
 * @param maxWidth 最大幅
 * @returns 切り詰め後の文字列
 */
export function truncateByWidth(str: string, maxWidth: number): string {
  if (!str) return '';

  let width = 0;
  let result = '';

  for (let i = 0; i < str.length; i++) {
    const charWidth = getCharWidth(str.charCodeAt(i));

    if (width + charWidth > maxWidth) {
      break;
    }

    result += str[i];
    width += charWidth;
  }

  return result;
}

/**
 * 文字列を幅でスライス（日本語対応）
 * @param str スライスする文字列
 * @param startWidth 開始位置（1始まり）
 * @param endWidth 終了位置
 * @returns スライス後の文字列
 */
export function sliceByWidth(str: string, startWidth: number, endWidth: number): string {
  if (!str || startWidth > endWidth) return '';

  let currentWidth = 0;
  let startIndex = -1;
  let endIndex = str.length;

  for (let i = 0; i < str.length; i++) {
    const charWidth = getCharWidth(str.charCodeAt(i));

    // 開始位置を決定（startWidth-1 の位置から開始）
    if (startIndex < 0 && currentWidth + charWidth >= startWidth) {
      startIndex = i;
    }

    currentWidth += charWidth;

    // 終了位置を決定
    if (currentWidth >= endWidth) {
      endIndex = i + 1;
      break;
    }
  }

  // 文字列が短すぎて開始位置に到達しない場合
  if (startIndex < 0) {
    return '';
  }

  return str.slice(startIndex, endIndex);
}

/**
 * 文字列が指定幅を超えるか検証
 * @param str 検証する文字列
 * @param maxWidth 最大幅
 * @returns 超える場合は true
 */
export function exceedsWidth(str: string, maxWidth: number): boolean {
  return getStringWidth(str) > maxWidth;
}
