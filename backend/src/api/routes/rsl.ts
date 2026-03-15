import { Router } from 'express';
import {
  listRslPlans,
  createRslPlan,
  getRslPlan,
  updateRslPlan,
  confirmRslPlan,
  shipRslPlan,
  deleteRslPlan,
} from '@/api/controllers/rslController';

export const rslRouter = Router();

/**
 * @swagger
 * /rsl/plans:
 *   get:
 *     tags: [RSL]
 *     summary: RSLプラン一覧 / List RSL plans
 *     responses:
 *       200:
 *         description: RSLプラン一覧 / RSL plan list
 */
rslRouter.get('/plans', listRslPlans);

/**
 * @swagger
 * /rsl/plans:
 *   post:
 *     tags: [RSL]
 *     summary: RSLプラン作成 / Create RSL plan
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
rslRouter.post('/plans', createRslPlan);

/**
 * @swagger
 * /rsl/plans/{id}:
 *   get:
 *     tags: [RSL]
 *     summary: RSLプラン取得 / Get RSL plan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: RSLプラン詳細 / RSL plan detail
 */
rslRouter.get('/plans/:id', getRslPlan);

/**
 * @swagger
 * /rsl/plans/{id}:
 *   put:
 *     tags: [RSL]
 *     summary: RSLプラン更新 / Update RSL plan
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
rslRouter.put('/plans/:id', updateRslPlan);

/**
 * @swagger
 * /rsl/plans/{id}/confirm:
 *   post:
 *     tags: [RSL]
 *     summary: RSLプラン確定 / Confirm RSL plan
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
rslRouter.post('/plans/:id/confirm', confirmRslPlan);

/**
 * @swagger
 * /rsl/plans/{id}/ship:
 *   post:
 *     tags: [RSL]
 *     summary: RSLプラン出荷 / Ship RSL plan
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
rslRouter.post('/plans/:id/ship', shipRslPlan);

/**
 * @swagger
 * /rsl/plans/{id}:
 *   delete:
 *     tags: [RSL]
 *     summary: RSLプラン削除 / Delete RSL plan
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
rslRouter.delete('/plans/:id', deleteRslPlan);
