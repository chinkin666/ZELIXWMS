import { Router } from 'express';
import {
  listLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  seedLocations,
} from '@/api/controllers/locationController';

export const locationRouter = Router();

locationRouter.get('/', listLocations);
locationRouter.post('/', createLocation);
locationRouter.post('/seed', seedLocations);
locationRouter.get('/:id', getLocation);
locationRouter.put('/:id', updateLocation);
locationRouter.delete('/:id', deleteLocation);
