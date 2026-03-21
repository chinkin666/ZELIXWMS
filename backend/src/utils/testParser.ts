/**
 * 临时测试脚本：验证解析器是否正确解析格式文件
 * テスト用スクリプト：パーサーがフォーマットファイルを正しく解析するか検証
 *
 * 使い方 / 使用方法: npx ts-node -r tsconfig-paths/register src/utils/testParser.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseFormatFile } from './carrierFormatParser';
import { logger } from '@/lib/logger';

const projectRoot = path.resolve(process.cwd(), '..');
const carrierFormatDir = path.join(projectRoot, 'carrier-format');
const files = fs.readdirSync(carrierFormatDir);
const formatFileName = files.find(
  (file) => file.includes('B2基本レイアウト説明') && file.endsWith('.txt'),
);

if (!formatFileName) {
  logger.error('Format file not found / フォーマットファイルが見つかりません');
  process.exit(1);
}

const formatFilePath = path.join(carrierFormatDir, formatFileName);
const formatFileContent = fs.readFileSync(formatFilePath, 'utf-8');

const columns = parseFormatFile(formatFileContent);

logger.info({ total: columns.length }, 'Parsed columns / 解析された列数');

columns.slice(0, 10).forEach((col, index) => {
  logger.info(
    {
      index: index + 1,
      name: col.name,
      type: col.type,
      maxWidth: col.maxWidth,
      required: col.required,
      userUploadable: col.userUploadable,
    },
    `Column ${index + 1}: ${col.name}`,
  );
});
