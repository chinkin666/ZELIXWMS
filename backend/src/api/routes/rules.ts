import { Router } from 'express';
import {
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  testRule,
} from '@/api/controllers/ruleController';

export const ruleRouter = Router();

ruleRouter.post('/test', testRule);
ruleRouter.get('/', listRules);
ruleRouter.get('/:id', getRule);
ruleRouter.post('/', createRule);
ruleRouter.put('/:id', updateRule);
ruleRouter.put('/:id/toggle', toggleRule);
ruleRouter.delete('/:id', deleteRule);
