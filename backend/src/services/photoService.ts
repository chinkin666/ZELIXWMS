import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { s3Config } from '@/config/s3';

/**
 * 写真ストレージサービス / 照片存储服务
 *
 * S3互換APIで写真をアップロード・取得・削除する。
 * S3が利用できない場合はローカルファイルシステムにフォールバック。
 *
 * S3兼容API上传/获取/删除照片。
 * S3不可用时降级到本地文件系统。
 */

// S3クライアントは遅延ロード（@aws-sdk未インストール時のフォールバック用）
// S3客户端延迟加载（@aws-sdk未安装时的降级用）
let s3Client: any = null;
let useLocalFallback = false;

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'uploads/photos');

async function getS3Client() {
  if (s3Client) return s3Client;
  if (useLocalFallback) return null;

  try {
    const { S3Client } = await import('@aws-sdk/client-s3');
    s3Client = new S3Client({
      endpoint: s3Config.endpoint,
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
      forcePathStyle: s3Config.forcePathStyle,
    });
    return s3Client;
  } catch {
    console.warn('[PhotoService] @aws-sdk/client-s3 not installed, using local file fallback / ローカルファイルフォールバックを使用');
    useLocalFallback = true;
    return null;
  }
}

/**
 * 写真アップロード結果 / 照片上传结果
 */
export interface PhotoUploadResult {
  /** ストレージキー / 存储键 */
  key: string;
  /** アクセスURL / 访问URL */
  url: string;
  /** ファイルサイズ(bytes) / 文件大小 */
  size: number;
}

/**
 * 写真をアップロードする / 上传照片
 *
 * @param buffer 画像データ / 图片数据
 * @param tenantId テナントID / 租户ID
 * @param category カテゴリ（inspections, exceptions, fba-boxes 等）/ 分类
 * @param refId 参照ID（入庫単ID、異常報告ID等）/ 引用ID
 * @param originalName 元ファイル名（拡張子取得用）/ 原文件名（获取扩展名用）
 */
export async function uploadPhoto(
  buffer: Buffer,
  tenantId: string,
  category: string,
  refId: string,
  originalName?: string,
): Promise<PhotoUploadResult> {
  const ext = originalName ? path.extname(originalName).toLowerCase() : '.jpg';
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const safeExt = allowed.includes(ext) ? ext : '.jpg';

  const timestamp = Date.now();
  const hash = crypto.randomBytes(4).toString('hex');
  const key = `${tenantId}/${category}/${refId}/${timestamp}_${hash}${safeExt}`;

  const client = await getS3Client();

  if (client) {
    // S3 アップロード / S3 上传
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await client.send(
      new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
        Body: buffer,
        ContentType: `image/${safeExt.replace('.', '')}`,
      }),
    );
    const url = `${s3Config.endpoint}/${s3Config.bucket}/${key}`;
    return { key, url, size: buffer.length };
  }

  // ローカルフォールバック / 本地降级
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
  const client = await getS3Client();

  if (client) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await client.send(
      new DeleteObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
      }),
    );
    return;
  }

  // ローカルフォールバック / 本地降级
  const localPath = path.join(LOCAL_STORAGE_DIR, key);
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
  }
}

/**
 * 写真URLを生成する / 生成照片URL
 */
export function getPhotoUrl(key: string): string {
  if (useLocalFallback) {
    return `/uploads/photos/${key}`;
  }
  return `${s3Config.endpoint}/${s3Config.bucket}/${key}`;
}
