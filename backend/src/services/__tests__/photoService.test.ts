/**
 * photoService 单元测试 / photoService ユニットテスト
 *
 * 写真アップロード・削除・URL生成のテスト
 * 照片上传、删除、URL生成的测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

// fs をモック / mock fs
vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

import fs from 'fs';

describe('photoService / 写真サービス', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('uploadPhoto / 写真アップロード', () => {
    it('JPG画像をアップロードできること / 可以上传JPG图片', async () => {
      const { uploadPhoto } = await import('../photoService');
      const buffer = Buffer.from('fake-image-data');
      const result = await uploadPhoto(buffer, 'T1', 'inspection', 'order-1', 'photo.jpg');

      expect(result.key).toContain('T1/inspection/order-1/');
      expect(result.key).toMatch(/\.jpg$/);
      expect(result.url).toContain('/uploads/photos/');
      expect(result.size).toBe(buffer.length);
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('PNG画像もアップロードできること / 也可以上传PNG', async () => {
      const { uploadPhoto } = await import('../photoService');
      const result = await uploadPhoto(Buffer.from('png-data'), 'T1', 'damage', 'r-1', 'pic.png');
      expect(result.key).toMatch(/\.png$/);
    });

    it('不正な拡張子は.jpgにフォールバック / 不允许的扩展名回退为.jpg', async () => {
      const { uploadPhoto } = await import('../photoService');
      const result = await uploadPhoto(Buffer.from('data'), 'T1', 'other', 'x', 'file.exe');
      expect(result.key).toMatch(/\.jpg$/);
    });

    it('originalNameなしの場合は.jpgを使用 / 无originalName时使用.jpg', async () => {
      const { uploadPhoto } = await import('../photoService');
      const result = await uploadPhoto(Buffer.from('data'), 'T1', 'other', 'x');
      expect(result.key).toMatch(/\.jpg$/);
    });

    it('WebP画像もアップロード可能 / WebP也可以上传', async () => {
      const { uploadPhoto } = await import('../photoService');
      const result = await uploadPhoto(Buffer.from('webp'), 'T1', 'cat', 'ref', 'img.webp');
      expect(result.key).toMatch(/\.webp$/);
    });

    it('PDFファイルもアップロード可能 / PDF也可以上传', async () => {
      const { uploadPhoto } = await import('../photoService');
      const result = await uploadPhoto(Buffer.from('pdf'), 'T1', 'doc', 'ref', 'file.pdf');
      expect(result.key).toMatch(/\.pdf$/);
    });
  });

  describe('deletePhoto / 写真削除', () => {
    it('存在するファイルを削除すること / 删除存在的文件', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const { deletePhoto } = await import('../photoService');
      await deletePhoto('T1/inspection/order-1/123_abc.jpg');

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('存在しないファイルは何もしない / 不存在的文件不做任何操作', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const { deletePhoto } = await import('../photoService');
      await deletePhoto('T1/nonexistent.jpg');

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('getPhotoUrl / 写真URL生成', () => {
    it('正しいURLを返すこと / 返回正确的URL', async () => {
      const { getPhotoUrl } = await import('../photoService');
      const url = getPhotoUrl('T1/inspection/order-1/123_abc.jpg');
      expect(url).toBe('/uploads/photos/T1/inspection/order-1/123_abc.jpg');
    });
  });
});
