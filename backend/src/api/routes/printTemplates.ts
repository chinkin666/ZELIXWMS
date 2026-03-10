import { Router } from 'express';
import {
  createTemplate,
  deleteTemplate,
  getTemplateById,
  listTemplates,
  updateTemplate,
} from '@/api/controllers/printTemplateController';

export const printTemplateRouter = Router();

printTemplateRouter.get('/', listTemplates);
printTemplateRouter.get('/:id', getTemplateById);
printTemplateRouter.post('/', createTemplate);
printTemplateRouter.put('/:id', updateTemplate);
printTemplateRouter.delete('/:id', deleteTemplate);





