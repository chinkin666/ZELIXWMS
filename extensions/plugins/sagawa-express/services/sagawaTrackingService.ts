/**
 * 佐川追踪号解析服务 / 佐川追跡番号解析サービス
 *
 * e飛伝导出的 CSV（含追踪号）解析。
 * e飛伝から出力された CSV（追跡番号付き）を解析。
 */

/**
 * 解析佐川追踪号 CSV / 佐川追跡番号 CSV を解析
 *
 * @param csvContent CSV 内容（UTF-8）
 * @returns 追踪号映射 { orderNumber → trackingNumber } / 追跡番号マッピング
 */
export function parseSagawaTrackingCsv(csvContent: string): Map<string, string> {
  const result = new Map<string, string>();
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) return result;

  const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
  const orderIdx = headers.findIndex((h) => h.includes('お客様管理番号'));
  const trackIdx = headers.findIndex((h) => h.includes('お問い合せ送り状No'));

  if (orderIdx === -1 || trackIdx === -1) {
    return result;
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
    const orderNumber = cols[orderIdx];
    const trackingNumber = cols[trackIdx];
    if (orderNumber && trackingNumber) {
      result.set(orderNumber, trackingNumber);
    }
  }

  return result;
}
