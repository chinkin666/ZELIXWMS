/**
 * ヤマト運輸 お届け日数テーブル（地域ブロック方式）
 *
 * 発送元・届け先の都道府県から最短お届け日数を算出する。
 * 出荷予定日 + 日数 = 最短お届け可能日
 */

// 地域ブロック定義
const REGION_MAP: Record<string, number> = {
  // 0: 北海道
  '北海道': 0,
  // 1: 東北
  '青森': 1, '青森県': 1, '岩手': 1, '岩手県': 1, '宮城': 1, '宮城県': 1,
  '秋田': 1, '秋田県': 1, '山形': 1, '山形県': 1, '福島': 1, '福島県': 1,
  // 2: 関東
  '茨城': 2, '茨城県': 2, '栃木': 2, '栃木県': 2, '群馬': 2, '群馬県': 2,
  '埼玉': 2, '埼玉県': 2, '千葉': 2, '千葉県': 2, '東京': 2, '東京都': 2,
  '神奈川': 2, '神奈川県': 2,
  // 3: 中部
  '新潟': 3, '新潟県': 3, '富山': 3, '富山県': 3, '石川': 3, '石川県': 3,
  '福井': 3, '福井県': 3, '山梨': 3, '山梨県': 3, '長野': 3, '長野県': 3,
  '岐阜': 3, '岐阜県': 3, '静岡': 3, '静岡県': 3, '愛知': 3, '愛知県': 3,
  // 4: 関西
  '三重': 4, '三重県': 4, '滋賀': 4, '滋賀県': 4, '京都': 4, '京都府': 4,
  '大阪': 4, '大阪府': 4, '兵庫': 4, '兵庫県': 4, '奈良': 4, '奈良県': 4,
  '和歌山': 4, '和歌山県': 4,
  // 5: 中国
  '鳥取': 5, '鳥取県': 5, '島根': 5, '島根県': 5, '岡山': 5, '岡山県': 5,
  '広島': 5, '広島県': 5, '山口': 5, '山口県': 5,
  // 6: 四国
  '徳島': 6, '徳島県': 6, '香川': 6, '香川県': 6, '愛媛': 6, '愛媛県': 6,
  '高知': 6, '高知県': 6,
  // 7: 九州
  '福岡': 7, '福岡県': 7, '佐賀': 7, '佐賀県': 7, '長崎': 7, '長崎県': 7,
  '熊本': 7, '熊本県': 7, '大分': 7, '大分県': 7, '宮崎': 7, '宮崎県': 7,
  '鹿児島': 7, '鹿児島県': 7,
  // 8: 沖縄
  '沖縄': 8, '沖縄県': 8,
}

//            北海道 東北 関東 中部 関西 中国 四国 九州 沖縄
const DAYS: number[][] = [
  /* 北海道 */ [1,   1,  2,  2,  2,  3,  3,  3,  3],
  /* 東北   */ [2,   1,  1,  1,  2,  2,  2,  2,  3],
  /* 関東   */ [2,   1,  1,  1,  1,  2,  2,  2,  3],
  /* 中部   */ [2,   1,  1,  1,  1,  1,  2,  2,  3],
  /* 関西   */ [2,   2,  1,  1,  1,  1,  1,  2,  3],
  /* 中国   */ [3,   2,  2,  1,  1,  1,  1,  1,  3],
  /* 四国   */ [3,   2,  2,  2,  1,  1,  1,  1,  3],
  /* 九州   */ [3,   2,  2,  2,  2,  1,  1,  1,  3],
  /* 沖縄   */ [3,   3,  3,  3,  3,  3,  3,  3,  2],
]

// デフォルト日数（都道府県不明の場合）
const DEFAULT_DAYS = 2

/**
 * 都道府県名から地域ブロック番号を取得
 */
const getRegion = (prefecture: string | undefined | null): number | null => {
  if (!prefecture) return null
  const trimmed = prefecture.trim()
  return REGION_MAP[trimmed] ?? null
}

/**
 * 発送元・届け先の都道府県から最短お届け日数を取得
 */
export const getMinDeliveryDays = (
  senderPrefecture: string | undefined | null,
  recipientPrefecture: string | undefined | null,
): number => {
  const from = getRegion(senderPrefecture)
  const to = getRegion(recipientPrefecture)
  if (from === null || to === null) return DEFAULT_DAYS
  return DAYS[from][to]
}

/**
 * 出荷予定日 + 最短日数 → 最短お届け可能日（YYYY-MM-DD 文字列）
 */
export const getMinDeliveryDate = (
  shipPlanDate: string | undefined | null,
  senderPrefecture: string | undefined | null,
  recipientPrefecture: string | undefined | null,
): string | undefined => {
  if (!shipPlanDate) return undefined
  const normalized = shipPlanDate.replace(/\//g, '-').substring(0, 10)
  const base = new Date(normalized)
  if (isNaN(base.getTime())) return undefined

  const days = getMinDeliveryDays(senderPrefecture, recipientPrefecture)
  base.setDate(base.getDate() + days)

  const y = base.getFullYear()
  const m = String(base.getMonth() + 1).padStart(2, '0')
  const d = String(base.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
