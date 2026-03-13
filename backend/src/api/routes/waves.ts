import { Router } from 'express';
import {
  listWaves,
  getWave,
  createWave,
  updateWave,
  deleteWave,
  startWave,
  completeWave,
} from '@/api/controllers/waveController';

export const waveRouter = Router();

waveRouter.get('/', listWaves);
waveRouter.get('/:id', getWave);
waveRouter.post('/', createWave);
waveRouter.put('/:id', updateWave);
waveRouter.delete('/:id', deleteWave);
waveRouter.put('/:id/start', startWave);
waveRouter.put('/:id/complete', completeWave);
