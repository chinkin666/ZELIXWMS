/**
 * S3/MinIO 設定 / S3/MinIO 配置
 *
 * 開発環境: MinIO (Docker) を使用
 * 本番環境: AWS S3 Tokyo (ap-northeast-1) を使用
 * S3互換APIで統一、コード変更なしで切替可能
 *
 * 开发环境: MinIO (Docker)
 * 生产环境: AWS S3 Tokyo (ap-northeast-1)
 * S3兼容API统一，无需改代码即可切换
 */

export const s3Config = {
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'ap-northeast-1',
  accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  bucket: process.env.S3_BUCKET || 'zelix-wms-photos',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false', // MinIO需要true, AWS S3设为false
};
