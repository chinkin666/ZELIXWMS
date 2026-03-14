/**
 * 自然順ソート比較関数 / 自然排序比较函数
 * 数字と区切り文字（"-"等）を含む文字列のソートに使用 / 用于处理包含数字和分隔符（如"-"）的字符串排序
 * 例: "1-1" < "1-2" < "11-1" < "11-2"
 *
 * @param a 第一の値 / 第一个值
 * @param b 第二の値 / 第二个值
 * @returns 負数は a < b、正数は a > b、0は a === b / 负数表示 a < b, 正数表示 a > b, 0 表示 a === b
 */
export function naturalSort(a: any, b: any): number {
  // null/undefined処理 / 处理 null/undefined
  if (a === null || a === undefined) {
    return b === null || b === undefined ? 0 : -1
  }
  if (b === null || b === undefined) {
    return 1
  }

  const aStr = String(a)
  const bStr = String(b)

  // 空文字列またはプレースホルダー処理 / 处理空字符串或占位符
  if (aStr === '' || aStr === '-') {
    return bStr === '' || bStr === '-' ? 0 : -1
  }
  if (bStr === '' || bStr === '-') {
    return 1
  }

  // 文字列を数字と非数字部分に分割 / 将字符串分割成数字和非数字部分
  const tokenize = (str: string): Array<string | number> => {
    const tokens: Array<string | number> = []
    let current = ''
    let isNumber = false

    for (let i = 0; i < str.length; i++) {
      const char = str[i]
      if (char === undefined) continue
      const charIsDigit = /[0-9]/.test(char)

      if (i === 0) {
        isNumber = charIsDigit
        current = char
      } else if (charIsDigit === isNumber) {
        current += char
      } else {
        // 型切替、現在のトークンを保存 / 类型切换，保存当前token
        tokens.push(isNumber ? parseInt(current, 10) : current)
        current = char
        isNumber = charIsDigit
      }
    }

    // 最後のトークンを追加 / 添加最后一个token
    if (current) {
      tokens.push(isNumber ? parseInt(current, 10) : current)
    }

    return tokens
  }

  const aTokens = tokenize(aStr)
  const bTokens = tokenize(bStr)

  // トークン配列を比較 / 比较token数组
  const maxLength = Math.max(aTokens.length, bTokens.length)
  for (let i = 0; i < maxLength; i++) {
    const aToken = aTokens[i]
    const bToken = bTokens[i]

    // いずれかの配列が終了した場合 / 如果某个数组已经结束
    if (aToken === undefined) return -1
    if (bToken === undefined) return 1

    // 型が異なる場合、数字優先 / 如果类型不同，数字优先
    if (typeof aToken === 'number' && typeof bToken === 'string') {
      return -1
    }
    if (typeof aToken === 'string' && typeof bToken === 'number') {
      return 1
    }

    // 同一型の比較 / 相同类型比较
    if (typeof aToken === 'number' && typeof bToken === 'number') {
      if (aToken !== bToken) {
        return aToken - bToken
      }
    } else {
      // 文字列比較（大文字小文字区別なし） / 字符串比较（不区分大小写）
      const aLower = String(aToken).toLowerCase()
      const bLower = String(bToken).toLowerCase()
      if (aLower !== bLower) {
        return aLower < bLower ? -1 : 1
      }
    }
  }

  return 0
}

