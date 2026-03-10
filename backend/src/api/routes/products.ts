import { Router } from 'express';
import multer from 'multer';
import {
  batchGetProducts,
  bulkUpdateProducts,
  checkSkuAvailability,
  createProduct,
  deleteProduct,
  getProduct,
  importProductsBulk,
  importProductsWithStrategy,
  listProducts,
  resolveSku,
  updateProduct,
  uploadProductImage,
  validateImportProducts,
} from '@/api/controllers/productController';

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です') as any, false);
    }
  },
});

export const productRouter = Router();

productRouter.get('/', listProducts);
productRouter.get('/resolve/:sku', resolveSku);
productRouter.get('/:id', getProduct);
productRouter.post('/', createProduct);
productRouter.post('/batch', batchGetProducts);
productRouter.post('/check-sku-availability', checkSkuAvailability);
productRouter.post('/validate-import', validateImportProducts);
productRouter.post('/import-bulk', importProductsBulk);
productRouter.post('/import-with-strategy', importProductsWithStrategy);
productRouter.post('/upload-image', imageUpload.single('image'), uploadProductImage);
productRouter.patch('/bulk', bulkUpdateProducts);
productRouter.put('/:id', updateProduct);
productRouter.delete('/:id', deleteProduct);

