import { Router } from 'express';
import {
  listSerialNumbers,
  getSerialNumber,
  createSerialNumber,
  bulkCreateSerialNumbers,
  updateSerialNumber,
  updateStatus,
  getSerialNumberByCode,
} from '@/api/controllers/serialNumberController';

export const serialNumberRouter = Router();

serialNumberRouter.get('/lookup', getSerialNumberByCode);
serialNumberRouter.post('/bulk', bulkCreateSerialNumbers);
serialNumberRouter.get('/', listSerialNumbers);
serialNumberRouter.get('/:id', getSerialNumber);
serialNumberRouter.post('/', createSerialNumber);
serialNumberRouter.put('/:id', updateSerialNumber);
serialNumberRouter.put('/:id/status', updateStatus);
