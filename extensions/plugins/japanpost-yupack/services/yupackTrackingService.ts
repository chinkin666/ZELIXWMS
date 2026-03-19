/**
 * ゆうパック追跡番号解析サービス / Yu-Pack 追踪号解析服务
 *
 * ゆうプリR から出力された CSV（追跡番号付き）を解析。
 * 解析从 ゆうプリR 导出的 CSV（含追踪号）。
 *
 * ゆうパック追跡番号は 12 桁 / Yu-Pack 追踪号为12位数字
 */

/**
 * ゆうパック追跡番号 CSV を解析 / 解析 Yu-Pack 追踪号 CSV
 *
 * @param csvContent CSV 内容（UTF-8 or Shift_JIS decoded）
 * @returns 追跡番号マッピング { orderNumber → trackingNumber }
 */
export function parseYupackTrackingCsv(csvContent: string): Map<string, string> {
  const result = new Map<string, string>();
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) return result;

  const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());

  // ゆうプリR のカラム名候補 / ゆうプリR 的列名候选
  const orderIdx = headers.findIndex((h) =>
    h.includes('お客様管理番号') || h.includes('管理番号'),
  );
  const trackIdx = headers.findIndex((h) =>
    h.includes('追跡番号') || h.includes('問い合わせ番号') || h.includes('送り状番号'),
  );

  if (orderIdx === -1 || trackIdx === -1) {
    return result;
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const orderNumber = cols[orderIdx]?.trim();
    const trackingNumber = cols[trackIdx]?.trim();

    if (orderNumber && trackingNumber && isValidYupackTracking(trackingNumber)) {
      result.set(orderNumber, trackingNumber);
    }
  }

  return result;
}

/**
 * ゆうパック追跡番号バリデーション / Yu-Pack 追踪号验证
 *
 * ゆうパックは 12 桁数字（先頭の数字で種別判定）
 * Yu-Pack 为12位数字（首位数字判定类型）
 */
export function isValidYupackTracking(tracking: string): boolean {
  const digits = tracking.replace(/[^0-9]/g, '');
  // 11-13桁の数字を許容（旧フォーマット・新フォーマット混在対応）
  // 允许11-13位数字（兼容旧格式和新格式）
  return digits.length >= 11 && digits.length <= 13;
}

/**
 * 简单 CSV 行解析（处理引号内逗号） / 简单 CSV 行解析（处理引号内的逗号）
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);

  return result;
}
