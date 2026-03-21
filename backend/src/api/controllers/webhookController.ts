/**
 * Webhook 管理 API 控制器 / Webhook 管理 API コントローラ
 *
 * CRUD + 测试发送 + 投递日志查询
 * CRUD + テスト送信 + 配信ログクエリ
 */

import type { Request, Response } from 'express';
import crypto from 'crypto';
import { Webhook } from '@/models/webhook';
import { WebhookLog } from '@/models/webhookLog';
import { extensionManager } from '@/core/extensions';
import { HOOK_EVENTS } from '@/core/extensions/types';
import net from 'net';

/**
 * SSRF防護: 内部・プライベートURLをブロック / SSRF防护: 阻止内部或私有URL
 * ブロック対象 / 阻止对象: localhost, 127.0.0.1, 0.0.0.0, ::1, 169.254.169.254, 10.x, 172.16-31.x, 192.168.x
 */
function isPrivateOrBlockedUrl(urlString: string): boolean {
  const parsed = new URL(urlString);
  const hostname = parsed.hostname.toLowerCase();

  // ブロックリスト / 黑名单
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
  if (blockedHosts.includes(hostname)) return true;

  // IPアドレスの場合、プライベートIP範囲をチェック / 如果是IP地址，检查私有IP范围
  if (net.isIPv4(hostname)) {
    const parts = hostname.split('.').map(Number);
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 127.0.0.0/8
    if (parts[0] === 127) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    // 169.254.0.0/16 (link-local / リンクローカル)
    if (parts[0] === 169 && parts[1] === 254) return true;
  }

  return false;
}

/**
 * GET /api/extensions/webhooks
 * 列出所有 Webhook / すべての Webhook を一覧
 */
export async function listWebhooks(req: Request, res: Response) {
  try {
    const { event, enabled } = req.query;
    const filter: Record<string, unknown> = {};
    if (typeof event === 'string' && event) filter.event = event;
    if (enabled === 'true') filter.enabled = true;
    if (enabled === 'false') filter.enabled = false;

    const webhooks = await Webhook.find(filter).sort({ createdAt: -1 }).lean();

    // 附加可用事件列表 / 利用可能なイベント一覧を付与
    const availableEvents = Object.values(HOOK_EVENTS);

    res.json({ data: webhooks, availableEvents });
  } catch (err) {
    // エラー詳細を非公開 / 不泄露错误详情
    res.status(500).json({ error: 'Internal server error / 内部サーバーエラー / 内部服务器错误' });
  }
}

/**
 * GET /api/extensions/webhooks/:id
 * 获取单个 Webhook / 単一 Webhook を取得
 */
export async function getWebhook(req: Request, res: Response) {
  try {
    const webhook = await Webhook.findById(req.params.id).lean();
    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found / Webhook が見つかりません' });
      return;
    }
    res.json(webhook);
  } catch (err) {
    // エラー詳細を非公開 / 不泄露错误详情
    res.status(500).json({ error: 'Internal server error / 内部サーバーエラー / 内部服务器错误' });
  }
}

/**
 * POST /api/extensions/webhooks
 * 创建 Webhook / Webhook を作成
 */
export async function createWebhook(req: Request, res: Response) {
  try {
    const { event, name, url, secret, enabled, retry, headers, description } = req.body;

    if (!event || !name || !url) {
      res.status(400).json({ error: 'event, name, url are required / event, name, url は必須です' });
      return;
    }

    // 验证事件名有效 / イベント名が有効か検証
    const validEvents = Object.values(HOOK_EVENTS) as string[];
    if (!validEvents.includes(event)) {
      res.status(400).json({
        error: `Invalid event: ${event}`,
        validEvents,
      });
      return;
    }

    // 验证 URL 格式 / URL フォーマットを検証
    try {
      new URL(url);
    } catch {
      res.status(400).json({ error: 'Invalid URL format / 無効な URL フォーマットです' });
      return;
    }

    // SSRF防護: 内部URLをブロック / SSRF防护: 阻止内部URL
    if (isPrivateOrBlockedUrl(url)) {
      res.status(400).json({ error: 'Internal/private URLs are not allowed / 内部・プライベートURLは許可されていません / 不允许内部或私有URL' });
      return;
    }

    const webhook = await Webhook.create({
      event,
      name,
      url,
      // 如果未提供 secret，自动生成 / secret 未指定時は自動生成
      secret: secret || crypto.randomBytes(32).toString('hex'),
      enabled: enabled !== false,
      retry: Math.min(Math.max(retry ?? 3, 0), 10),
      headers: headers || {},
      description,
    });

    res.status(201).json(webhook.toObject());
  } catch (err) {
    // エラー詳細を非公開 / 不泄露错误详情
    res.status(500).json({ error: 'Internal server error / 内部サーバーエラー / 内部服务器错误' });
  }
}

/**
 * PUT /api/extensions/webhooks/:id
 * 更新 Webhook / Webhook を更新
 */
export async function updateWebhook(req: Request, res: Response) {
  try {
    const { event, name, url, secret, enabled, retry, headers, description } = req.body;

    const update: Record<string, unknown> = {};
    if (event !== undefined) {
      const validEvents = Object.values(HOOK_EVENTS) as string[];
      if (!validEvents.includes(event)) {
        res.status(400).json({ error: `Invalid event: ${event}` });
        return;
      }
      update.event = event;
    }
    if (name !== undefined) update.name = name;
    if (url !== undefined) {
      try {
        new URL(url);
      } catch {
        res.status(400).json({ error: 'Invalid URL format / 無効な URL フォーマットです' });
        return;
      }
      // SSRF防護: 内部URLをブロック / SSRF防护: 阻止内部URL
      if (isPrivateOrBlockedUrl(url)) {
        res.status(400).json({ error: 'Internal/private URLs are not allowed / 内部・プライベートURLは許可されていません / 不允许内部或私有URL' });
        return;
      }
      update.url = url;
    }
    if (secret !== undefined) update.secret = secret;
    if (enabled !== undefined) update.enabled = enabled;
    if (retry !== undefined) update.retry = Math.min(Math.max(retry, 0), 10);
    if (headers !== undefined) update.headers = headers;
    if (description !== undefined) update.description = description;

    const webhook = await Webhook.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true },
    ).lean();

    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found / Webhook が見つかりません' });
      return;
    }

    res.json(webhook);
  } catch (err) {
    // エラー詳細を非公開 / 不泄露错误详情
    res.status(500).json({ error: 'Internal server error / 内部サーバーエラー / 内部服务器错误' });
  }
}

/**
 * DELETE /api/extensions/webhooks/:id
 * 删除 Webhook / Webhook を削除
 */
export async function deleteWebhook(req: Request, res: Response) {
  try {
    const webhook = await Webhook.findByIdAndDelete(req.params.id).lean();
    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found / Webhook が見つかりません' });
      return;
    }
    res.json({ message: 'Webhook deleted / Webhook を削除しました' });
  } catch (err) {
    // エラー詳細を非公開 / 不泄露错误详情
    res.status(500).json({ error: 'Internal server error / 内部サーバーエラー / 内部服务器错误' });
  }
}

/**
 * POST /api/extensions/webhooks/:id/test
 * 测试 Webhook 发送 / Webhook テスト送信
 */
export async function testWebhook(req: Request, res: Response) {
  try {
    const dispatcher = extensionManager.getWebhookDispatcher();
    const result = await dispatcher.test(req.params.id);
    res.json(result);
  } catch (err) {
    // エラー詳細を非公開 / 不泄露错误详情
    res.status(500).json({ error: 'Internal server error / 内部サーバーエラー / 内部服务器错误' });
  }
}

/**
 * POST /api/extensions/webhooks/:id/toggle
 * 快速切换启用/禁用 / 有効/無効をトグル
 */
export async function toggleWebhook(req: Request, res: Response) {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found / Webhook が見つかりません' });
      return;
    }

    webhook.enabled = !webhook.enabled;
    await webhook.save();

    res.json({
      _id: webhook._id,
      enabled: webhook.enabled,
      message: webhook.enabled ? 'Webhook enabled / 有効化' : 'Webhook disabled / 無効化',
    });
  } catch (err) {
    // エラー詳細を非公開 / 不泄露错误详情
    res.status(500).json({ error: 'Internal server error / 内部サーバーエラー / 内部服务器错误' });
  }
}

/**
 * GET /api/extensions/webhooks/:id/logs
 * 查询投递日志 / 配信ログをクエリ
 */
export async function getWebhookLogs(req: Request, res: Response) {
  try {
    const { status, page = '1', limit = '50' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { webhookId: req.params.id };
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      WebhookLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      WebhookLog.countDocuments(filter),
    ]);

    res.json({
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    // エラー詳細を非公開 / 不泄露错误详情
    res.status(500).json({ error: 'Internal server error / 内部サーバーエラー / 内部服务器错误' });
  }
}
