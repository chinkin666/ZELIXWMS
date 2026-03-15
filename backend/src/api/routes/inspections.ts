import { Router } from 'express';
import { listInspections, createInspection, getInspection, verifyInspection } from '@/api/controllers/inspectionController';

export const inspectionRouter = Router();
inspectionRouter.get('/', listInspections);
inspectionRouter.post('/', createInspection);
inspectionRouter.get('/:id', getInspection);
inspectionRouter.post('/:id/verify', verifyInspection);
