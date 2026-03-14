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

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Product management / 商品管理
 */

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products / 商品一覧取得
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number / ページ番号
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page / 1ページあたりの件数
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or SKU / 商品名・SKUで検索
 *     responses:
 *       200:
 *         description: Paginated product list / ページネーション付き商品一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *   post:
 *     tags: [Products]
 *     summary: Create a product / 商品作成
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Product created / 商品作成成功
 *       400:
 *         description: Validation error / バリデーションエラー
 */
productRouter.get('/', listProducts);
productRouter.post('/', createProduct);

/**
 * @swagger
 * /products/resolve/{sku}:
 *   get:
 *     tags: [Products]
 *     summary: Resolve product by SKU / SKUで商品検索
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *         description: Product SKU / 商品SKU
 *     responses:
 *       200:
 *         description: Product found / 商品取得成功
 *       404:
 *         description: Product not found / 商品が見つかりません
 */
productRouter.get('/resolve/:sku', resolveSku);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a single product / 商品詳細取得
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID / 商品ID
 *     responses:
 *       200:
 *         description: Product details / 商品詳細
 *       404:
 *         description: Product not found / 商品が見つかりません
 *   put:
 *     tags: [Products]
 *     summary: Update a product / 商品更新
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID / 商品ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       200:
 *         description: Product updated / 商品更新成功
 *       404:
 *         description: Product not found / 商品が見つかりません
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product / 商品削除
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID / 商品ID
 *     responses:
 *       200:
 *         description: Product deleted / 商品削除成功
 *       404:
 *         description: Product not found / 商品が見つかりません
 */
productRouter.get('/:id', getProduct);
productRouter.put('/:id', updateProduct);
productRouter.delete('/:id', deleteProduct);

/**
 * @swagger
 * /products/batch:
 *   post:
 *     tags: [Products]
 *     summary: Get multiple products by IDs / ID指定で複数商品取得
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Products returned / 商品返却成功
 */
productRouter.post('/batch', batchGetProducts);

/**
 * @swagger
 * /products/check-sku-availability:
 *   post:
 *     tags: [Products]
 *     summary: Check if SKU is available / SKU使用可否チェック
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sku:
 *                 type: string
 *     responses:
 *       200:
 *         description: Availability result / 使用可否結果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 */
productRouter.post('/check-sku-availability', checkSkuAvailability);

/**
 * @swagger
 * /products/validate-import:
 *   post:
 *     tags: [Products]
 *     summary: Validate import data before importing / インポートデータ事前バリデーション
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Validation results / バリデーション結果
 */
productRouter.post('/validate-import', validateImportProducts);

/**
 * @swagger
 * /products/import-bulk:
 *   post:
 *     tags: [Products]
 *     summary: Import products in bulk / 商品一括インポート
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Import results / インポート結果
 */
productRouter.post('/import-bulk', importProductsBulk);

/**
 * @swagger
 * /products/import-with-strategy:
 *   post:
 *     tags: [Products]
 *     summary: Import products with conflict strategy / 競合戦略付き商品インポート
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *               strategy:
 *                 type: string
 *                 enum: [skip, overwrite, merge]
 *     responses:
 *       200:
 *         description: Import results / インポート結果
 */
productRouter.post('/import-with-strategy', importProductsWithStrategy);

/**
 * @swagger
 * /products/upload-image:
 *   post:
 *     tags: [Products]
 *     summary: Upload product image / 商品画像アップロード
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (max 5MB) / 画像ファイル（最大5MB）
 *     responses:
 *       200:
 *         description: Image uploaded / 画像アップロード成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       400:
 *         description: Invalid file / 無効なファイル
 */
productRouter.post('/upload-image', imageUpload.single('image'), uploadProductImage);

/**
 * @swagger
 * /products/bulk:
 *   patch:
 *     tags: [Products]
 *     summary: Bulk update products / 商品一括更新
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     data:
 *                       type: object
 *     responses:
 *       200:
 *         description: Products updated / 商品更新成功
 */
productRouter.patch('/bulk', bulkUpdateProducts);

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         sku:
 *           type: string
 *           description: Stock Keeping Unit / 商品コード
 *         name:
 *           type: string
 *           description: Product name / 商品名
 *         category:
 *           type: string
 *           description: Product category / カテゴリ
 *         price:
 *           type: number
 *           description: Unit price / 単価
 *         weight:
 *           type: number
 *           description: Weight in grams / 重量（グラム）
 *         imageUrl:
 *           type: string
 *           description: Product image URL / 商品画像URL
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ProductInput:
 *       type: object
 *       required:
 *         - sku
 *         - name
 *       properties:
 *         sku:
 *           type: string
 *         name:
 *           type: string
 *         category:
 *           type: string
 *         price:
 *           type: number
 *         weight:
 *           type: number
 */
