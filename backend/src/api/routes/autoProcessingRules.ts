import { Router } from 'express';
import {
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  reorderRules,
  runRule,
} from '@/api/controllers/autoProcessingRuleController';

export const autoProcessingRuleRouter = Router();

// List all rules (sorted by priority)
autoProcessingRuleRouter.get('/', listRules);

// Reorder rules (must be before /:id)
autoProcessingRuleRouter.post('/reorder', reorderRules);

// Get single rule
autoProcessingRuleRouter.get('/:id', getRule);

// Create rule
autoProcessingRuleRouter.post('/', createRule);

// Update rule
autoProcessingRuleRouter.put('/:id', updateRule);

// Delete rule
autoProcessingRuleRouter.delete('/:id', deleteRule);

// Manual run
autoProcessingRuleRouter.post('/:id/run', runRule);
