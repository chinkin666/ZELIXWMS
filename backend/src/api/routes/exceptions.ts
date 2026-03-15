import { Router } from 'express';
import {
  listExceptions, createException, getException,
  notifyException, acknowledgeException, resolveException, slaStatus,
} from '@/api/controllers/exceptionController';

export const exceptionRouter = Router();
exceptionRouter.get('/sla-status', slaStatus);
exceptionRouter.get('/', listExceptions);
exceptionRouter.post('/', createException);
exceptionRouter.get('/:id', getException);
exceptionRouter.post('/:id/notify', notifyException);
exceptionRouter.post('/:id/acknowledge', acknowledgeException);
exceptionRouter.post('/:id/resolve', resolveException);
