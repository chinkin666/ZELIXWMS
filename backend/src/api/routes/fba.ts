import { Router } from 'express';
import {
  listFbaPlans,
  createFbaPlan,
  getFbaPlan,
  updateFbaPlan,
  confirmFbaPlan,
  shipFbaPlan,
  deleteFbaPlan,
} from '@/api/controllers/fbaController';

export const fbaRouter = Router();

/**
 * @swagger
 * /fba/plans:
 *   get:
 *     tags: [FBA]
 *     summary: FBAプラン一覧 / List FBA plans
 *     responses:
 *       200:
 *         description: FBAプラン一覧 / FBA plan list
 */
fbaRouter.get('/plans', listFbaPlans);

/**
 * @swagger
 * /fba/plans:
 *   post:
 *     tags: [FBA]
 *     summary: FBAプラン作成 / Create FBA plan
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: 作成成功 / Created
 */
fbaRouter.post('/plans', createFbaPlan);

/**
 * @swagger
 * /fba/plans/{id}:
 *   get:
 *     tags: [FBA]
 *     summary: FBAプラン取得 / Get FBA plan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FBAプラン詳細 / FBA plan detail
 */
fbaRouter.get('/plans/:id', getFbaPlan);

/**
 * @swagger
 * /fba/plans/{id}:
 *   put:
 *     tags: [FBA]
 *     summary: FBAプラン更新 / Update FBA plan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功 / Updated
 */
fbaRouter.put('/plans/:id', updateFbaPlan);

/**
 * @swagger
 * /fba/plans/{id}/confirm:
 *   post:
 *     tags: [FBA]
 *     summary: FBAプラン確定 / Confirm FBA plan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 確定成功 / Confirmed
 */
fbaRouter.post('/plans/:id/confirm', confirmFbaPlan);

/**
 * @swagger
 * /fba/plans/{id}/ship:
 *   post:
 *     tags: [FBA]
 *     summary: FBAプラン出荷 / Ship FBA plan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 出荷完了 / Shipped
 */
fbaRouter.post('/plans/:id/ship', shipFbaPlan);

/**
 * @swagger
 * /fba/plans/{id}:
 *   delete:
 *     tags: [FBA]
 *     summary: FBAプラン削除 / Delete FBA plan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 削除成功 / Deleted
 */
fbaRouter.delete('/plans/:id', deleteFbaPlan);
