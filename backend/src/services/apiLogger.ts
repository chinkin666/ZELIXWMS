import mongoose from 'mongoose';
import { ApiLog } from '@/models/apiLog';
import type { IApiLog } from '@/models/apiLog';

export interface CreateApiLogData {
  readonly apiName: string;
  readonly action: string;
  readonly status?: IApiLog['status'];
  readonly requestUrl?: string;
  readonly requestMethod?: string;
  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly referenceNumber?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface CompleteApiLogResult {
  readonly status: IApiLog['status'];
  readonly statusCode?: number;
  readonly processedCount?: number;
  readonly successCount?: number;
  readonly errorCount?: number;
  readonly message?: string;
  readonly errorDetail?: string;
}

/**
 * Create a new API log entry. Returns the document _id so the caller can
 * update the log later via `completeApiLog`.
 */
export async function createApiLog(
  data: CreateApiLogData,
): Promise<mongoose.Types.ObjectId | null> {
  try {
    const doc = await ApiLog.create({
      ...data,
      status: data.status ?? 'running',
      startedAt: new Date(),
    });
    return doc._id;
  } catch {
    // Logging failures must never break the main flow
    return null;
  }
}

/**
 * Mark an existing API log as completed (success / error / timeout).
 * Automatically calculates `durationMs` from `startedAt`.
 */
export async function completeApiLog(
  logId: mongoose.Types.ObjectId | string | null,
  result: CompleteApiLogResult,
): Promise<void> {
  if (!logId) return;
  try {
    const now = new Date();
    const existing = await ApiLog.findById(logId).lean();
    const durationMs =
      existing?.startedAt != null
        ? now.getTime() - new Date(existing.startedAt).getTime()
        : undefined;

    await ApiLog.findByIdAndUpdate(logId, {
      $set: {
        status: result.status,
        ...(result.statusCode !== undefined && { statusCode: result.statusCode }),
        ...(result.processedCount !== undefined && { processedCount: result.processedCount }),
        ...(result.successCount !== undefined && { successCount: result.successCount }),
        ...(result.errorCount !== undefined && { errorCount: result.errorCount }),
        ...(result.message !== undefined && { message: result.message }),
        ...(result.errorDetail !== undefined && { errorDetail: result.errorDetail }),
        completedAt: now,
        ...(durationMs !== undefined && { durationMs }),
      },
    });
  } catch {
    // Logging failures must never break the main flow
  }
}
