/**
 * carrierFormatParser 单元测试 / carrierFormatParser ユニットテスト
 *
 * 运输商格式文件解析器测试 / キャリアフォーマットファイルパーサーテスト
 */

import { describe, it, expect } from 'vitest';
import { parseFormatLine, parseFormatFile } from '../carrierFormatParser';

describe('carrierFormatParser / キャリアフォーマットパーサー', () => {
  // --- parseFormatLine ---

  describe('parseFormatLine / 行解析', () => {
    // 空行返回null / 空行はnullを返す
    it('should return null for empty or whitespace lines / 空行はnullを返す', () => {
      expect(parseFormatLine('')).toBeNull();
      expect(parseFormatLine('   ')).toBeNull();
      expect(parseFormatLine('\t')).toBeNull();
    });

    // 没有引号内容返回null / 引用符なしはnullを返す
    it('should return null for lines without quoted content / 引用符なしの行はnullを返す', () => {
      expect(parseFormatLine('no quotes here')).toBeNull();
    });

    // 基本列名解析 / 基本列名の解析
    it('should parse a basic column name from quoted content / 引用符内の列名を解析', () => {
      const result = parseFormatLine('"お届け先名"');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('お届け先名');
      expect(result!.type).toBe('string');
      expect(result!.required).toBe(false);
      expect(result!.userUploadable).toBe(true);
    });

    // 必须标记解析 / 必須マーク解析
    it('should detect required flag / 必須フラグを検出', () => {
      const result = parseFormatLine('(必须)"送り状番号"');
      expect(result).not.toBeNull();
      expect(result!.required).toBe(true);
    });

    // 系统回传标记 / システム回送マーク
    it('should detect system return flag and set userUploadable=false / システム回送フラグ検出', () => {
      const result = parseFormatLine('(上传后系统回传)"追跡番号"');
      expect(result).not.toBeNull();
      expect(result!.userUploadable).toBe(false);
    });

    // 列类型推断 / 列タイプ推論
    it('should infer column types from description / 記述から列タイプを推論', () => {
      // 日付型 / date型
      const dateLine = parseFormatLine('"出荷日\n日付 yyyy/mm/dd"');
      expect(dateLine!.type).toBe('date');

      // 数字型 / number型
      const numLine = parseFormatLine('"金額\n金額を入力"');
      expect(numLine!.type).toBe('number');

      // ブール型 / boolean型
      const boolLine = parseFormatLine('"利用フラグ\nフラグ区分"');
      expect(boolLine!.type).toBe('boolean');

      // 文字列型（デフォルト） / string型
      const strLine = parseFormatLine('"名前\n普通の説明"');
      expect(strLine!.type).toBe('string');
    });
  });

  // --- parseFormatLine maxWidth ---

  describe('parseFormatLine maxWidth / 最大幅解析', () => {
    // 半角文字数 / 半角文字数
    it('should parse hankaku character width / 半角文字幅を解析', () => {
      const result = parseFormatLine('"列名\n半角50文字"');
      expect(result!.maxWidth).toBe(50);
    });

    // 全角文字数（2倍） / 全角文字数（2倍）
    it('should double zenkaku character width / 全角文字幅を2倍にする', () => {
      const result = parseFormatLine('"列名\n全角25文字"');
      expect(result!.maxWidth).toBe(50);
    });

    // 全角/半角混在 / 全角/半角混在
    it('should handle mixed zenkaku/hankaku format / 全角/半角混在フォーマットを処理', () => {
      const result = parseFormatLine('"列名\n全角/半角 25文字/50文字"');
      expect(result!.maxWidth).toBe(50);
    });
  });

  // --- parseFormatFile ---

  describe('parseFormatFile / ファイル解析', () => {
    // 多行解析 / 複数行解析
    it('should parse multiple lines and skip empty/invalid ones / 複数行を解析し空行・無効行をスキップ', () => {
      const content = [
        '(必须)"送り状番号"',
        '',
        '"お届け先名"',
        'invalid line without quotes',
      ].join('\n');

      const columns = parseFormatFile(content);
      // 有效行2行（空行和无引号行被跳过） / 有効行2行（空行と引用符なし行はスキップ）
      expect(columns).toHaveLength(2);
      expect(columns[0].name).toBe('送り状番号');
      expect(columns[0].required).toBe(true);
      expect(columns[1].name).toBe('お届け先名');
      expect(columns[1].type).toBe('string');
    });

    // 空文件返回空数组 / 空ファイルは空配列を返す
    it('should return empty array for empty file / 空ファイルは空配列を返す', () => {
      expect(parseFormatFile('')).toEqual([]);
    });
  });
});
