/**
 * 环境变量验证 / 環境変数バリデーション
 *
 * 在服务器启动时检查必需和可选的环境变量
 * サーバー起動時に必須・オプションの環境変数をチェックする
 */

import { logger } from '@/lib/logger';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 验证所有环境变量并记录缺失项 / すべての環境変数を検証し、欠落をログに記録する
 *
 * 必须变量缺失时在生产环境会终止启动
 * 必須変数が欠落している場合、本番環境では起動を中止する
 */
export function validateEnv(): ValidationResult {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  const errors: string[] = [];
  const warnings: string[] = [];

  // ── 必须变量 / 必須変数 ──────────────────────────────────

  // MONGODB_URI: 生产环境必须显式设置 / 本番環境では明示的に設定が必要
  if (isProduction && !process.env.MONGODB_URI) {
    errors.push(
      'MONGODB_URI is required in production. ' +
        '本番環境では MONGODB_URI の設定が必須です。',
    );
  }

  // JWT_SECRET: 生产环境禁止使用默认值 / 本番環境ではデフォルト値の使用禁止
  if (isProduction && !process.env.JWT_SECRET) {
    errors.push(
      'JWT_SECRET is required in production — do not use the default dev secret. ' +
        '本番環境では JWT_SECRET の設定が必須です。デフォルトの開発用シークレットは使用しないでください。',
    );
  }

  // S3 凭证: 生产环境必须设置 / S3 認証情報: 本番環境では必須
  if (isProduction && (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY)) {
    errors.push(
      'S3_ACCESS_KEY and S3_SECRET_KEY are required in production. ' +
        '本番環境では S3_ACCESS_KEY と S3_SECRET_KEY の設定が必須です。',
    );
  }

  // ── 可选变量（缺失时发出警告）/ オプション変数（欠落時に警告） ──

  if (!process.env.REDIS_URL) {
    warnings.push(
      'REDIS_URL is not set — queue system will use default redis://127.0.0.1:6379 or be skipped. ' +
        'REDIS_URL 未設定 — キューシステムはデフォルト redis://127.0.0.1:6379 を使用するかスキップされます。',
    );
  }

  if (!process.env.SMTP_HOST) {
    warnings.push(
      'SMTP_HOST is not set — email notifications will be disabled. ' +
        'SMTP_HOST 未設定 — メール通知は無効になります。',
    );
  }

  if (!process.env.S3_BUCKET) {
    warnings.push(
      'S3_BUCKET is not set — using default bucket "zelix-wms-photos". ' +
        'S3_BUCKET 未設定 — デフォルトバケット "zelix-wms-photos" を使用します。',
    );
  }

  if (!process.env.CORS_ORIGINS) {
    warnings.push(
      'CORS_ORIGINS is not set — CORS will allow all origins in development. ' +
        'CORS_ORIGINS 未設定 — 開発環境ではすべてのオリジンを許可します。',
    );
  }

  if (!process.env.LOG_LEVEL) {
    warnings.push(
      'LOG_LEVEL is not set — using "info" in production, "debug" in development. ' +
        'LOG_LEVEL 未設定 — 本番は "info"、開発は "debug" を使用します。',
    );
  }

  // ── 结果输出 / 結果出力 ──────────────────────────────────

  for (const w of warnings) {
    logger.warn(`[env] ${w}`);
  }

  for (const e of errors) {
    logger.error(`[env] ${e}`);
  }

  const valid = errors.length === 0;

  if (valid) {
    logger.info(
      `[env] Environment validation passed (${warnings.length} warning(s)) / 環境変数バリデーション通過（警告 ${warnings.length} 件）`,
    );
  } else {
    logger.error(
      `[env] Environment validation FAILED: ${errors.length} error(s), ${warnings.length} warning(s) / 環境変数バリデーション失敗: エラー ${errors.length} 件、警告 ${warnings.length} 件`,
    );
  }

  return { valid, errors, warnings };
}
