import { Router } from 'express';
import {
  listOrderGroups,
  getOrderGroupCounts,
  getOrderGroup,
  createOrderGroup,
  updateOrderGroup,
  deleteOrderGroup,
  reorderOrderGroups,
} from '@/api/controllers/orderGroupController';

export const orderGroupRouter = Router();

// List all order groups (sorted by priority)
orderGroupRouter.get('/', listOrderGroups);

// Get order counts per group (must be before /:id)
orderGroupRouter.get('/counts', getOrderGroupCounts);

// Get single order group
orderGroupRouter.get('/:id', getOrderGroup);

// Create order group
orderGroupRouter.post('/', createOrderGroup);

// Update order group
orderGroupRouter.put('/:id', updateOrderGroup);

// Delete order group
orderGroupRouter.delete('/:id', deleteOrderGroup);

// Reorder groups (update priorities based on array order)
orderGroupRouter.post('/reorder', reorderOrderGroups);
