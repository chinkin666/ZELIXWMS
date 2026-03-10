/**
 * Carrier格式文件解析器
 * 用于解析carrier格式定义文件
 */

import { IColumnConfig, ColumnDataType } from '@/models/carrier';

/**
 * 解析列类型
 * 根据描述文本推断数据类型
 */
function parseColumnType(description: string): ColumnDataType {
  const desc = description.toLowerCase();
  
  if (desc.includes('日付') || desc.includes('date') || desc.includes('yyyy/mm/dd')) {
    return 'date';
  }
  if (desc.includes('数字') || desc.includes('数字') || desc.includes('金額') || desc.includes('金額')) {
    return 'number';
  }
  if (desc.includes('フラグ') || desc.includes('区分') || desc.includes('利用') || desc.includes('利用しない')) {
    return 'boolean';
  }
  
  return 'string';
}

/**
 * 解析最大字符宽度
 * 从描述中提取字符数量限制
 * 格式如：半角50文字、全角/半角 25文字/50文字等
 * 注意：全角/半角格式中，全角字符算2个字符宽度，半角字符算1个字符宽度
 * 所以如果描述是"全角/半角 25文字/50文字"，最大宽度应该是50（半角字符的最大数量）
 */
function parseMaxWidth(description: string): number | undefined {
  // 匹配模式：半角XX文字、全角XX文字、XX文字/XX文字
  const patterns = [
    /全角\/半角\s*(\d+)文字\/\d+文字/,  // 全角/半角 25文字/50文字（取第二个数字，半角的最大值）
    /全角\/半角\s*(\d+)文字/,          // 全角/半角 25文字（全角字符数，需要乘以2）
    /半角(\d+)文字/,                    // 半角50文字
    /全角(\d+)文字/,                    // 全角25文字（需要乘以2）
    /(\d+)文字/,                        // 50文字（通用，假设是半角）
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      const width = parseInt(match[1], 10);
      
      // 如果是全角/半角格式，取第二个数字（半角的最大值）
      if (description.includes('全角/半角')) {
        const fullHalfMatch = description.match(/全角\/半角\s*(\d+)文字\/(\d+)文字/);
        if (fullHalfMatch) {
          // 返回半角字符的最大数量（因为全角算2，半角算1，所以半角的最大数量就是最大宽度）
          return parseInt(fullHalfMatch[2], 10);
        }
        // 如果只有全角数字，乘以2
        return width * 2;
      }
      
      // 如果是纯全角，乘以2
      if (description.includes('全角') && !description.includes('半角')) {
        return width * 2;
      }
      
      // 其他情况（半角或未指定），直接返回
      return width;
    }
  }
  
  return undefined;
}

/**
 * 解析格式文件的一行
 * @param line 文件的一行内容
 * @returns 列配置或null（如果是空行或无效行）
 */
export function parseFormatLine(line: string): IColumnConfig | null {
  // 去除首尾空白
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  
  // 检查是否有标记
  const hasRequired = trimmed.includes('(必须)');
  const hasSystemReturn = trimmed.includes('(上传后系统回传)');
  
  // 移除标记
  let content = trimmed
    .replace(/\(必须\)/g, '')
    .replace(/\(上传后系统回传\)/g, '')
    .trim();
  
  // 移除行末的 `: "..."` 格式（如果有）
  content = content.replace(/:\s*"[^"]*"\s*$/, '').trim();
  
  // 提取引号内的内容
  const quoteMatch = content.match(/"([^"]+)"/);
  if (!quoteMatch) {
    return null;
  }
  
  const quotedContent = quoteMatch[1];
  
  // 第一个\n之前是列名，之后是描述
  const firstNewlineIndex = quotedContent.indexOf('\n');
  const columnName = firstNewlineIndex >= 0 
    ? quotedContent.substring(0, firstNewlineIndex).trim()
    : quotedContent.trim();
  const description = firstNewlineIndex >= 0
    ? quotedContent.substring(firstNewlineIndex + 1).trim()
    : '';
  
  if (!columnName) {
    return null;
  }
  
  // 解析类型和最大宽度
  const type = parseColumnType(description);
  const maxWidth = parseMaxWidth(description);
  
  return {
    name: columnName,
    description: description || undefined,
    type,
    maxWidth,
    required: hasRequired,
    userUploadable: !hasSystemReturn, // 系统回传的字段用户不需要上传
  };
}

/**
 * 解析整个格式文件
 * @param fileContent 文件内容
 * @returns 列配置数组
 */
export function parseFormatFile(fileContent: string): IColumnConfig[] {
  const lines = fileContent.split('\n');
  const columns: IColumnConfig[] = [];
  
  for (const line of lines) {
    const column = parseFormatLine(line);
    if (column) {
      columns.push(column);
    }
  }
  
  return columns;
}

