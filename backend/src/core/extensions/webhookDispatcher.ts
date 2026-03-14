/**
 * WebhookDispatcher — Webhook 投递器 / Webhook ディスパッチャー
 *
 * 事件触发后，查找匹配的 Webhook 配置，异步 HTTP POST 到目标 URL。
 * イベント発生後、一致する Webhook 設定を検索し、非同期 HTTP POST で送信先 URL に配信する。
 *
 * 特性 / 特徴:
 * - HMAC-SHA256 签名 / HMAC-SHA256 署名
 * - 指数退避重试 / 指数バックオフリトライ
 * - 投递日志记录 / 配信ログ記録
 * - 30秒超时 / 30秒タイムアウト
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { Webhook } from '@/models/webhook';
import { WebhookLog } from '@/models/webhookLog';

/** Webhook 请求体格式 / Webhook リクエストボディフォーマット */
interface WebhookPayload {
  event: string;
  timestamp: string;
  deliveryId: string;
  data: Record<string, unknown>;
}

export class WebhookDispatcher {
  /**
   * 分发事件到所有匹配的 Webhook
   * イベントをすべての一致する Webhook に配信
   *
   * 异步执行，不阻塞调用方 / 非同期実行、呼び出し側をブロックしない
   */
  async dispatch(event: string, payload: Record<string, unknown>): Promise<void> {
    let webhooks;
    try {
      webhooks = await Webhook.find({ event, enabled: true }).lean();
    } catch (err) {
      logger.error({ event, err }, 'Failed to query webhooks / Webhook クエリ失敗');
      return;
    }

    if (webhooks.length === 0) return;

    logger.debug(
      { event, count: webhooks.length },
      'Dispatching webhooks / Webhook 配信中',
    );

    // 并行投递，每个 webhook 独立重试
    // 並列配信、各 webhook は独立してリトライ
    for (const webhook of webhooks) {
      this.deliverWithRetry(webhook, event, payload, 1).catch((err) => {
        logger.error(
          { webhookId: String(webhook._id), event, err },
          'Webhook delivery failed after all retries / 全リトライ後 Webhook 配信失敗',
        );
      });
    }
  }

  /**
   * 带重试的投递 / リトライ付き配信
   */
  private async deliverWithRetry(
    webhook: { _id: any; url: string; secret: string; retry: number; headers?: Record<string, string> },
    event: string,
    data: Record<string, unknown>,
    attempt: number,
  ): Promise<void> {
    const deliveryId = crypto.randomUUID();
    const body: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      deliveryId,
      data,
    };

    const bodyStr = JSON.stringify(body);
    const signature = this.sign(bodyStr, webhook.secret);

    const startTime = Date.now();
    let statusCode = 0;
    let responseBody = '';
    let error: string | undefined;

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': event,
          'X-Webhook-Delivery': deliveryId,
          ...(webhook.headers || {}),
        },
        body: bodyStr,
        signal: AbortSignal.timeout(30000), // 30秒超时 / 30秒タイムアウト
      });

      statusCode = response.status;
      responseBody = await response.text().catch(() => '');
      // 截断响应体 / レスポンスボディを切り捨て
      if (responseBody.length > 5000) {
        responseBody = responseBody.slice(0, 5000) + '...(truncated)';
      }

      const duration = Date.now() - startTime;

      if (response.ok) {
        // 成功 / 成功
        await this.writeLog(webhook._id, event, body, 'success', statusCode, responseBody, attempt, duration);
        return;
      }

      // 非 2xx: 记录并可能重试 / 非 2xx: 記録してリトライの可能性あり
      error = `HTTP ${statusCode}`;
      await this.writeLog(
        webhook._id, event, body,
        attempt < webhook.retry ? 'retrying' : 'failed',
        statusCode, responseBody, attempt, duration, error,
      );
    } catch (err: any) {
      const duration = Date.now() - startTime;
      error = err.message || String(err);

      await this.writeLog(
        webhook._id, event, body,
        attempt < webhook.retry ? 'retrying' : 'failed',
        0, '', attempt, duration, error,
      );
    }

    // 重试 / リトライ
    if (attempt < webhook.retry) {
      // 指数退避: 2s, 4s, 8s... / 指数バックオフ: 2s, 4s, 8s...
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return this.deliverWithRetry(webhook, event, data, attempt + 1);
    }
  }

  /**
   * 测试发送 / テスト送信
   */
  async test(webhookId: string): Promise<{
    success: boolean;
    statusCode: number;
    duration: number;
    error?: string;
  }> {
    const webhook = await Webhook.findById(webhookId).lean();
    if (!webhook) throw new Error('Webhook not found / Webhook が見つかりません');

    const body: WebhookPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      deliveryId: crypto.randomUUID(),
      data: { test: true, message: 'Webhook test from ZELIX WMS' },
    };

    const bodyStr = JSON.stringify(body);
    const signature = this.sign(bodyStr, webhook.secret);
    const startTime = Date.now();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': 'test',
          'X-Webhook-Delivery': body.deliveryId,
          ...(webhook.headers || {}),
        },
        body: bodyStr,
        signal: AbortSignal.timeout(10000), // 10秒超时 / 10秒タイムアウト
      });

      const duration = Date.now() - startTime;
      const responseBody = await response.text().catch(() => '');

      // 记录测试日志 / テストログを記録
      await this.writeLog(
        webhook._id, 'test', body,
        response.ok ? 'success' : 'failed',
        response.status, responseBody.slice(0, 5000), 1, duration,
        response.ok ? undefined : `HTTP ${response.status}`,
      );

      return { success: response.ok, statusCode: response.status, duration };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      return { success: false, statusCode: 0, duration, error: err.message };
    }
  }

  /**
   * HMAC-SHA256 签名 / HMAC-SHA256 署名
   */
  private sign(body: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  /**
   * 写入投递日志 / 配信ログを書き込む
   */
  private async writeLog(
    webhookId: any,
    event: string,
    payload: WebhookPayload,
    status: 'success' | 'failed' | 'retrying',
    statusCode: number,
    responseBody: string,
    attempt: number,
    duration: number,
    error?: string,
  ): Promise<void> {
    try {
      await WebhookLog.create({
        webhookId,
        event,
        payload,
        status,
        statusCode,
        responseBody,
        attempt,
        error,
        duration,
      });
    } catch (err) {
      logger.error({ err }, 'Failed to write webhook log / Webhook ログ書き込み失敗');
    }
  }
}
