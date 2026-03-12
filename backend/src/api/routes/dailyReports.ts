import { Router } from 'express';
import {
  listDailyReports,
  getDailyReport,
  generateDailyReport,
  closeDailyReport,
  lockDailyReport,
} from '@/api/controllers/dailyReportController';

export const dailyReportRouter = Router();

dailyReportRouter.get('/', listDailyReports);
dailyReportRouter.post('/generate', generateDailyReport);
dailyReportRouter.get('/:date', getDailyReport);
dailyReportRouter.post('/:date/close', closeDailyReport);
dailyReportRouter.post('/:date/lock', lockDailyReport);
