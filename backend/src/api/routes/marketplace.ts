/**
 * マーケットプレイス連携ルート / 电商平台连接路由
 *
 * EC モール連携のエンドポイント定義。
 * 电商平台连接的端点定义。
 */
import { Router } from 'express';
import {
  listProviders,
  connectProvider,
  syncOrders,
  syncStock,
  getProviderStatus,
} from '@/api/controllers/marketplaceController';

export const marketplaceRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Marketplace
 *     description: EC モール連携 / Marketplace Integration
 */

/**
 * @swagger
 * /marketplace/providers:
 *   get:
 *     tags: [Marketplace]
 *     summary: プロバイダー一覧 / List available marketplace providers
 *     responses:
 *       200:
 *         description: プロバイダー一覧 / Provider list with status
 */
marketplaceRouter.get('/providers', listProviders);

/**
 * @swagger
 * /marketplace/{provider}/connect:
 *   post:
 *     tags: [Marketplace]
 *     summary: 接続設定 / Connect to a marketplace provider
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [amazon, rakuten, yahoo, shopify, base, stores, mercari]
 *     responses:
 *       200:
 *         description: 接続設定結果 / Connection result (stub)
 *       400:
 *         description: 未対応プロバイダー / Unsupported provider
 */
marketplaceRouter.post('/:provider/connect', connectProvider);

/**
 * @swagger
 * /marketplace/{provider}/sync-orders:
 *   post:
 *     tags: [Marketplace]
 *     summary: 注文同期 / Sync orders from marketplace
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 同期結果 / Sync result (stub)
 */
marketplaceRouter.post('/:provider/sync-orders', syncOrders);

/**
 * @swagger
 * /marketplace/{provider}/sync-stock:
 *   post:
 *     tags: [Marketplace]
 *     summary: 在庫同期 / Sync stock to marketplace
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 同期結果 / Sync result (stub)
 */
marketplaceRouter.post('/:provider/sync-stock', syncStock);

/**
 * @swagger
 * /marketplace/{provider}/status:
 *   get:
 *     tags: [Marketplace]
 *     summary: 接続ステータス / Get provider connection status
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ステータス情報 / Status info (stub)
 */
marketplaceRouter.get('/:provider/status', getProviderStatus);
