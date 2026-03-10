import { Router } from 'express';
import {
  listFormTemplates,
  getFormTemplate,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
} from '@/api/controllers/formTemplateController';

const router = Router();

// GET /api/form-templates - すべての帳票テンプレートを取得
router.get('/', listFormTemplates);

// GET /api/form-templates/:id - 帳票テンプレートを取得
router.get('/:id', getFormTemplate);

// POST /api/form-templates - 帳票テンプレートを作成
router.post('/', createFormTemplate);

// PUT /api/form-templates/:id - 帳票テンプレートを更新
router.put('/:id', updateFormTemplate);

// DELETE /api/form-templates/:id - 帳票テンプレートを削除
router.delete('/:id', deleteFormTemplate);

export default router;
