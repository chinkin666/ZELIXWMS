import { Router } from 'express';
import {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  runSchedule,
  toggleSchedule,
  listTasks,
  getTask,
  listLogs,
  exportLogs,
} from '@/api/controllers/wmsScheduleController';

export const wmsScheduleRouter = Router();

wmsScheduleRouter.get('/', listSchedules);
wmsScheduleRouter.post('/', createSchedule);
wmsScheduleRouter.get('/tasks', listTasks);
wmsScheduleRouter.get('/tasks/:taskId', getTask);
wmsScheduleRouter.get('/logs', listLogs);
wmsScheduleRouter.get('/logs/export', exportLogs);
wmsScheduleRouter.get('/:id', getSchedule);
wmsScheduleRouter.put('/:id', updateSchedule);
wmsScheduleRouter.delete('/:id', deleteSchedule);
wmsScheduleRouter.post('/:id/run', runSchedule);
wmsScheduleRouter.post('/:id/toggle', toggleSchedule);
