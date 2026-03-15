/**
 * マーケットプレイス連携コントローラー / 电商平台连接控制器
 *
 * EC モール連携のインターフェーススタブ。
 * 电商平台连接的接口桩。
 */
import type { Request, Response } from 'express';
import { logger } from '@/lib/logger';

/**
 * 利用可能プロバイダー一覧 / 可用平台列表
 */
const SUPPORTED_PROVIDERS = [
  'amazon',
  'rakuten',
  'yahoo',
  'shopify',
  'base',
  'stores',
  'mercari',
] as const;

type ProviderName = typeof SUPPORTED_PROVIDERS[number];

/**
 * プロバイダー名のバリデーション / 平台名验证
 */
function isValidProvider(provider: string): provider is ProviderName {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(provider);
}

/**
 * プロバイダー一覧取得 / 获取平台列表
 *
 * 利用可能なマーケットプレイスとその接続ステータスを返す。
 * 返回可用的电商平台及其连接状态。
 *
 * GET /api/marketplace/providers
 */
export const listProviders = async (_req: Request, res: Response): Promise<void> => {
  const providers = SUPPORTED_PROVIDERS.map((name) => ({
    name,
    status: 'not_configured' as const,
    message: '未実装 / Not implemented',
  }));

  res.json({ providers });
};

/**
 * プロバイダー接続設定（スタブ） / 平台连接设置（桩）
 *
 * POST /api/marketplace/:provider/connect
 */
export const connectProvider = async (req: Request, res: Response): Promise<void> => {
  const { provider } = req.params;

  if (!isValidProvider(provider)) {
    res.status(400).json({
      status: 'error',
      message: `未対応のプロバイダーです: ${provider} / Unsupported provider: ${provider}`,
      supportedProviders: SUPPORTED_PROVIDERS,
    });
    return;
  }

  logger.info({ provider }, 'マーケットプレイス接続リクエスト / Marketplace connect request');

  res.json({
    status: 'not_configured',
    message: '未実装：接続設定は保存されていません / Not implemented: connection settings not saved yet',
    provider,
  });
};

/**
 * 注文同期（スタブ） / 订单同步（桩）
 *
 * POST /api/marketplace/:provider/sync-orders
 */
export const syncOrders = async (req: Request, res: Response): Promise<void> => {
  const { provider } = req.params;

  if (!isValidProvider(provider)) {
    res.status(400).json({
      status: 'error',
      message: `未対応のプロバイダーです: ${provider} / Unsupported provider: ${provider}`,
    });
    return;
  }

  logger.info({ provider }, 'マーケットプレイス注文同期リクエスト / Marketplace order sync request');

  res.json({
    status: 'not_configured',
    message: '未実装：注文同期は実装されていません / Not implemented: order sync not available yet',
    provider,
  });
};

/**
 * 在庫同期（スタブ） / 库存同步（桩）
 *
 * POST /api/marketplace/:provider/sync-stock
 */
export const syncStock = async (req: Request, res: Response): Promise<void> => {
  const { provider } = req.params;

  if (!isValidProvider(provider)) {
    res.status(400).json({
      status: 'error',
      message: `未対応のプロバイダーです: ${provider} / Unsupported provider: ${provider}`,
    });
    return;
  }

  logger.info({ provider }, 'マーケットプレイス在庫同期リクエスト / Marketplace stock sync request');

  res.json({
    status: 'not_configured',
    message: '未実装：在庫同期は実装されていません / Not implemented: stock sync not available yet',
    provider,
  });
};

/**
 * 接続ステータス照会（スタブ） / 连接状态查询（桩）
 *
 * GET /api/marketplace/:provider/status
 */
export const getProviderStatus = async (req: Request, res: Response): Promise<void> => {
  const { provider } = req.params;

  if (!isValidProvider(provider)) {
    res.status(400).json({
      status: 'error',
      message: `未対応のプロバイダーです: ${provider} / Unsupported provider: ${provider}`,
    });
    return;
  }

  res.json({
    provider,
    status: 'not_configured',
    message: '未実装 / Not implemented',
    connectedAt: null,
    lastSyncAt: null,
  });
};
