import { Router } from 'express';
import {
  listEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  previewEmailTemplate,
} from '@/api/controllers/emailTemplateController';

export const emailTemplateRouter = Router();

emailTemplateRouter.post('/preview', previewEmailTemplate);
emailTemplateRouter.get('/', listEmailTemplates);
emailTemplateRouter.get('/:id', getEmailTemplate);
emailTemplateRouter.post('/', createEmailTemplate);
emailTemplateRouter.put('/:id', updateEmailTemplate);
emailTemplateRouter.delete('/:id', deleteEmailTemplate);
