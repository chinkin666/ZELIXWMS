import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

/**
 * 写真ストレージサービス / 照片存储服务
 *
 * 現在はローカルファイルシステムを使用。
 * S3/MinIO 対応は @aws-sdk/client-s3 インストール後に有効化。
 *
 * 当前使用本地文件系统。
 * S3/MinIO 支持在安装 @aws-sdk/client-s3 后启用。
 */

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'uploads/photos');

export interface PhotoUploadResult {
  key: string;
  url: string;
  size: number;
}

/**
 * 写真をアップロードする / 上传照片
 */
export async function uploadPhoto(
  buffer: Buffer,
  tenantId: string,
  category: string,
  refId: string,
  originalName?: string,
): Promise<PhotoUploadResult> {
  const ext = originalName ? path.extname(originalName).toLowerCase() : '.jpg';
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const safeExt = allowed.includes(ext) ? ext : '.jpg';

  const timestamp = Date.now();
  const hash = crypto.randomBytes(4).toString('hex');
  const key = `${tenantId}/${category}/${refId}/${timestamp}_${hash}${safeExt}`;

  const localPath = path.join(LOCAL_STORAGE_DIR, key);
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, buffer);
  const url = `/uploads/photos/${key}`;
  return { key, url, size: buffer.length };
}

/**
 * 写真を削除する / 删除照片
 */
export async function deletePhoto(key: string): Promise<void> {
  const localPath = path.join(LOCAL_STORAGE_DIR, key);
  if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
}

/**
 * 写真URLを生成する / 生成照片URL
 */
export function getPhotoUrl(key: string): string {
  return `/uploads/photos/${key}`;
}
