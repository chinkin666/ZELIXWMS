import { randomUUID, randomBytes } from 'crypto';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { OrderGroup } from '@/models/orderGroup';

/**
 * Generate a globally unique, human-readable system id for orders.
 * Format: {prefix}_{yyyymmdd}_{tenant}_{time36}_{uuid8}
 * - yyyymmdd makes it sortable/recognizable by date
 * - tenant is sanitized to alnum, max 12 chars (tail)
 * - time36 + uuid8 keep collisions extremely unlikely
 */
export const generateOrderSystemId = (tenantId: string, prefix = 'ord'): string => {
  const tenantPart = tenantId.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || 'tenant';
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = Date.now().toString(36);
  const uuidPart = randomUUID().replace(/-/g, '').slice(0, 8);
  return `${prefix}_${datePart}_${tenantPart}_${timePart}_${uuidPart}`;
};

const formatYYYYMMDDLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
};

const generateRandomDigits = (length: number): string => {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => String(b % 10)).join('');
};

/**
 * 生成唯一的出荷管理No
 * 格式: SH{YYYYMMDD}-{8位随机数字} (例: SH20260311-42857631)
 *
 * 8位数字有1亿种组合，碰撞概率极低。
 * DB unique index 兜底，碰撞时自动重试。
 *
 * @param date 用于生成订单号的日期（可选，默认为当前日期）
 * @returns 唯一的订单号
 */
export const generateOrderNumber = async (date?: Date): Promise<string> => {
  const [n] = await generateOrderNumbers(1, date);
  return n;
};

/**
 * 批量生成订单号（同一批次内保证不重复）
 */
export const generateOrderNumbers = async (count: number, date?: Date): Promise<string[]> => {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return [];

  const targetDate = date || new Date();
  const dateStr = formatYYYYMMDDLocal(targetDate);
  const prefix = `SH${dateStr}-`;

  const maxRetries = 10;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const seen = new Set<string>();
    const candidates: string[] = [];
    while (candidates.length < n) {
      const code = `${prefix}${generateRandomDigits(8)}`;
      if (!seen.has(code)) {
        seen.add(code);
        candidates.push(code);
      }
    }

    const exists = await ShipmentOrder.findOne({ orderNumber: { $in: candidates } }).select('_id').lean().exec();
    if (!exists) return candidates;
  }

  throw new Error('出荷管理Noの生成に失敗しました（リトライ回数上限に達しました）');
};

// ============================================
// OrderGroup ID Generation
// ============================================

const getMaxOrderGroupSequenceForDate = async (dateStr: string): Promise<number> => {
  const regex = new RegExp(`^PK-${dateStr}-(\\d+)$`);

  const groups = await OrderGroup.find({
    orderGroupId: { $regex: regex },
  })
    .select('orderGroupId')
    .lean()
    .exec();

  let maxSequence = 0;
  for (const group of groups) {
    const match = (group as any).orderGroupId?.match(regex);
    if (match && match[1]) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSequence) maxSequence = seq;
    }
  }
  return maxSequence;
};

/**
 * 生成唯一的検品グループID
 * 格式: PK-yyyymmdd-00001 ~ PK-yyyymmdd-99999（超过五位数自动扩展位数）
 *
 * @param date 用于生成ID的日期（可选，默认为当前日期）
 * @returns 唯一的グループID
 */
export const generateOrderGroupId = async (date?: Date): Promise<string> => {
  const targetDate = date || new Date();
  const dateStr = formatYYYYMMDDLocal(targetDate);

  const maxRetries = 10;
  const base = await getMaxOrderGroupSequenceForDate(dateStr);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const seq = base + 1 + attempt;
    const seqStr = String(seq).padStart(5, '0');
    const candidate = `PK-${dateStr}-${seqStr}`;

    const exists = await OrderGroup.findOne({ orderGroupId: candidate }).select('_id').lean().exec();
    if (!exists) return candidate;
  }

  throw new Error('検品グループIDの生成に失敗しました（リトライ回数上限に達しました）');
};

/**
 * Convenience helper for generic unique tokens (non-order specific).
 */
export const generateUniqueToken = (prefix = 'token'): string => {
  const timePart = Date.now().toString(36);
  const uuidPart = randomUUID().replace(/-/g, '').slice(0, 16);
  return `${prefix}_${timePart}_${uuidPart}`;
};



