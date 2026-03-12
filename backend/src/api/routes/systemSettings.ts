import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  resetSettings,
} from '@/api/controllers/systemSettingsController';

export const systemSettingsRouter = Router();

systemSettingsRouter.get('/', getSettings);
systemSettingsRouter.put('/', updateSettings);
systemSettingsRouter.post('/reset', resetSettings);
