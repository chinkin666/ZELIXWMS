import { Router } from 'express';
import {
  listOperationLogs,
  exportOperationLogs,
} from '@/api/controllers/operationLogController';

export const operationLogRouter = Router();

operationLogRouter.get('/export', exportOperationLogs);
operationLogRouter.get('/', listOperationLogs);
