import { Router } from 'express';
import { createCarrier, deleteCarrier, getCarrier, listCarriers, updateCarrier } from '@/api/controllers/carrierController';

export const carrierRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Carriers
 *     description: Carrier management / 運送会社管理
 */

/**
 * @swagger
 * /carriers:
 *   get:
 *     tags: [Carriers]
 *     summary: List all carriers / 運送会社一覧取得
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number / ページ番号
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page / 1ページあたりの件数
 *     responses:
 *       200:
 *         description: List of carriers / 運送会社一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Carrier'
 *   post:
 *     tags: [Carriers]
 *     summary: Create a carrier / 運送会社作成
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CarrierInput'
 *     responses:
 *       201:
 *         description: Carrier created / 運送会社作成成功
 *       400:
 *         description: Validation error / バリデーションエラー
 */
carrierRouter.get('/', listCarriers);
carrierRouter.post('/', createCarrier);

/**
 * @swagger
 * /carriers/{id}:
 *   get:
 *     tags: [Carriers]
 *     summary: Get a single carrier / 運送会社詳細取得
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Carrier ID / 運送会社ID
 *     responses:
 *       200:
 *         description: Carrier details / 運送会社詳細
 *       404:
 *         description: Carrier not found / 運送会社が見つかりません
 *   put:
 *     tags: [Carriers]
 *     summary: Update a carrier / 運送会社更新
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Carrier ID / 運送会社ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CarrierInput'
 *     responses:
 *       200:
 *         description: Carrier updated / 運送会社更新成功
 *       404:
 *         description: Carrier not found / 運送会社が見つかりません
 *   delete:
 *     tags: [Carriers]
 *     summary: Delete a carrier / 運送会社削除
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Carrier ID / 運送会社ID
 *     responses:
 *       200:
 *         description: Carrier deleted / 運送会社削除成功
 *       404:
 *         description: Carrier not found / 運送会社が見つかりません
 */
carrierRouter.get('/:id', getCarrier);
carrierRouter.put('/:id', updateCarrier);
carrierRouter.delete('/:id', deleteCarrier);

/**
 * @swagger
 * components:
 *   schemas:
 *     Carrier:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           description: Carrier name / 運送会社名
 *         code:
 *           type: string
 *           description: Carrier code / 運送会社コード
 *         trackingUrlTemplate:
 *           type: string
 *           description: Tracking URL template / 追跡URLテンプレート
 *         isActive:
 *           type: boolean
 *           description: Active status / 有効フラグ
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CarrierInput:
 *       type: object
 *       required:
 *         - name
 *         - code
 *       properties:
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         trackingUrlTemplate:
 *           type: string
 *         isActive:
 *           type: boolean
 *           default: true
 */
