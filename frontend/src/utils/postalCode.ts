/**
 * 邮政编码自动填写 / 郵便番号自動入力
 *
 * zipcloud API 经由住所を自動検索。
 * https://zipcloud.ibsnet.co.jp/
 */

export interface PostalResult {
  prefecture: string
  city: string
  street: string
}

/**
 * 根据邮政编码查询地址 / 郵便番号から住所を検索
 * @param zipcode 7桁の郵便番号（ハイフンなし）
 */
export async function lookupPostalCode(zipcode: string): Promise<PostalResult | null> {
  const cleaned = zipcode.replace(/[-\s]/g, '')
  if (!/^\d{7}$/.test(cleaned)) return null

  try {
    const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`)
    const data = await res.json()

    if (data.status !== 200 || !data.results || data.results.length === 0) {
      return null
    }

    const r = data.results[0]
    return {
      prefecture: r.address1 || '',
      city: r.address2 || '',
      street: r.address3 || '',
    }
  } catch {
    return null
  }
}
