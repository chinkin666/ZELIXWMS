import { Router } from 'express';
import {
  listWorkCharges,
  getWorkCharge,
  createWorkCharge,
  getWorkChargeSummary,
  deleteWorkCharge,
} from '@/api/controllers/workChargeController';

export const workChargeRouter = Router();

// サマリー（:id より先に定義）/ 汇总（在 :id 之前定义）
workChargeRouter.get('/summary', getWorkChargeSummary);

// CRUD
workChargeRouter.get('/', listWorkCharges);
workChargeRouter.get('/:id', getWorkCharge);
workChargeRouter.post('/', createWorkCharge);
workChargeRouter.delete('/:id', deleteWorkCharge);
