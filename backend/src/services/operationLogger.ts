import { OperationLog } from '@/models/operationLog';
import type { OperationAction, OperationCategory } from '@/models/operationLog';
import type mongoose from 'mongoose';

export interface LogOperationInput {
  readonly action: OperationAction;
  readonly category?: OperationCategory;
  readonly description: string;
  readonly productId?: mongoose.Types.ObjectId | string;
  readonly productSku?: string;
  readonly productName?: string;
  readonly locationCode?: string;
  readonly lotNumber?: string;
  readonly quantity?: number;
  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly referenceNumber?: string;
  readonly userName?: string;
  readonly ipAddress?: string;
  readonly metadata?: Record<string, unknown>;
}

/** カテゴリ自動推定 */
function inferCategory(action: OperationAction): OperationCategory {
  if (action.startsWith('inbound_')) return 'inbound';
  if (action.startsWith('outbound_')) return 'outbound';
  if (action.startsWith('return_')) return 'return';
  if (['transfer', 'adjustment', 'stocktaking', 'lot_update'].includes(action)) return 'inventory';
  return 'master';
}

/**
 * 操作ログを非同期で記録する。
 * メイン処理をブロックしないよう、エラーは内部で吸収する。
 */
export async function logOperation(data: LogOperationInput): Promise<void> {
  try {
    const category = data.category ?? inferCategory(data.action);
    await OperationLog.create({
      action: data.action,
      category,
      description: data.description,
      productId: data.productId,
      productSku: data.productSku,
      productName: data.productName,
      locationCode: data.locationCode,
      lotNumber: data.lotNumber,
      quantity: data.quantity,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      referenceNumber: data.referenceNumber,
      userName: data.userName ?? 'system',
      ipAddress: data.ipAddress,
      metadata: data.metadata,
    });
  } catch {
    // Fire-and-forget: ログ記録失敗はメイン処理に影響させない
  }
}
