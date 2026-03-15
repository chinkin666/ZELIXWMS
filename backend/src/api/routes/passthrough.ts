import { Router } from 'express';
import multer from 'multer';
import {
  listPassthroughOrders,
  getPassthroughOrder,
  createOrder,
  arrive,
  completeOption,
  labelUploaded,
  ship,
  ackVariance,
  stagingDashboard,
  uploadAndSplitLabel,
} from '@/api/controllers/passthroughController';

export const passthroughRouter = Router();

// PDF アップロード用 multer（メモリストレージ、5MB制限）
// PDF 上传用 multer（内存存储，5MB 限制）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// 暂存区看板 / 一時保管エリアダッシュボード
passthroughRouter.get('/staging', stagingDashboard);

// CRUD
passthroughRouter.get('/', listPassthroughOrders);
passthroughRouter.get('/:id', getPassthroughOrder);
passthroughRouter.post('/', createOrder);

// 状態遷移 / 状态流转
passthroughRouter.post('/:id/arrive', arrive);
passthroughRouter.post('/:id/complete-option', completeOption);
passthroughRouter.post('/:id/label-uploaded', labelUploaded);
passthroughRouter.post('/:id/ship', ship);
passthroughRouter.post('/:id/ack-variance', ackVariance);

// FBA/RSLラベルPDFアップロード＋分割 / FBA/RSL标PDF上传+拆分
passthroughRouter.post('/:id/upload-label', upload.single('file'), uploadAndSplitLabel);
