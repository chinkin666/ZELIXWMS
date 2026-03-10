import { Router } from 'express';
import { createCarrier, deleteCarrier, getCarrier, listCarriers, updateCarrier } from '@/api/controllers/carrierController';

export const carrierRouter = Router();

carrierRouter.get('/', listCarriers);
carrierRouter.get('/:id', getCarrier);
carrierRouter.post('/', createCarrier);
carrierRouter.put('/:id', updateCarrier);
carrierRouter.delete('/:id', deleteCarrier);







