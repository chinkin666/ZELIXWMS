import { Router } from 'express';
import {
  listApiLogs,
  getApiLog,
  getApiStats,
  exportApiLogs,
} from '@/api/controllers/apiLogController';

export const apiLogRouter = Router();

apiLogRouter.get('/stats', getApiStats);
apiLogRouter.get('/export', exportApiLogs);
apiLogRouter.get('/:id', getApiLog);
apiLogRouter.get('/', listApiLogs);
