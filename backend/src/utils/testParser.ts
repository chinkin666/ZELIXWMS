/**
 * 临时测试脚本：验证解析器是否正确解析格式文件
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseFormatFile } from './carrierFormatParser';

const projectRoot = path.resolve(process.cwd(), '..');
const carrierFormatDir = path.join(projectRoot, 'carrier-format');
const files = fs.readdirSync(carrierFormatDir);
const formatFileName = files.find(
  (file) => file.includes('B2基本レイアウト説明') && file.endsWith('.txt'),
);

if (!formatFileName) {
  console.error('Format file not found');
  process.exit(1);
}

const formatFilePath = path.join(carrierFormatDir, formatFileName);
const formatFileContent = fs.readFileSync(formatFilePath, 'utf-8');

const columns = parseFormatFile(formatFileContent);

console.log(`\n总共解析了 ${columns.length} 个列\n`);
console.log('前10个列的解析结果：\n');

columns.slice(0, 10).forEach((col, index) => {
  console.log(`${index + 1}. 列名: "${col.name}"`);
  console.log(`   描述: ${col.description?.substring(0, 100) || '(无)'}...`);
  console.log(`   类型: ${col.type}`);
  console.log(`   最大宽度: ${col.maxWidth || '(无限制)'}`);
  console.log(`   必须: ${col.required}`);
  console.log(`   用户可上传: ${col.userUploadable}`);
  console.log('');
});

