import { Router } from 'express';
import {
  listPassthroughOrders,
  getPassthroughOrder,
  createOrder,
  arrive,
  completeOption,
  labelUploaded,
  ship,
  ackVariance,
  stagingDashboard,
} from '@/api/controllers/passthroughController';

export const passthroughRouter = Router();

// 暂存区看板 / 一時保管エリアダッシュボード
passthroughRouter.get('/staging', stagingDashboard);

// CRUD
passthroughRouter.get('/', listPassthroughOrders);
passthroughRouter.get('/:id', getPassthroughOrder);
passthroughRouter.post('/', createOrder);

// 状態遷移 / 状态流转
passthroughRouter.post('/:id/arrive', arrive);
passthroughRouter.post('/:id/complete-option', completeOption);
passthroughRouter.post('/:id/label-uploaded', labelUploaded);
passthroughRouter.post('/:id/ship', ship);
passthroughRouter.post('/:id/ack-variance', ackVariance);
