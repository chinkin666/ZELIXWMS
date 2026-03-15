import { Router } from 'express';
import { listBoxes, createBox, updateBox, deleteBox, sealBox, validateBoxes } from '@/api/controllers/fbaBoxController';

export const fbaBoxRouter = Router();
fbaBoxRouter.get('/', listBoxes);
fbaBoxRouter.post('/', createBox);
fbaBoxRouter.put('/:id', updateBox);
fbaBoxRouter.delete('/:id', deleteBox);
fbaBoxRouter.post('/:id/seal', sealBox);
fbaBoxRouter.get('/validate/:inboundOrderId', validateBoxes);
