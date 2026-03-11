/**
 * 郵便番号から住所を自動取得（zipcloud API）
 * https://zipcloud.ibsnet.co.jp/
 */

export interface PostalResult {
  prefecture: string // 都道府県
  city: string       // 市区町村
  street: string     // 町域
}

export const lookupPostalCode = async (zipcode: string): Promise<PostalResult | null> => {
  const digits = zipcode.replace(/\D/g, '')
  if (digits.length !== 7) return null

  try {
    const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`)
    const data = await res.json()
    if (data.results && data.results.length > 0) {
      const r = data.results[0]
      return {
        prefecture: r.address1 || '',
        city: r.address2 || '',
        street: r.address3 || '',
      }
    }
    return null
  } catch {
    return null
  }
}
