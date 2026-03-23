/**
 * imageUrl ユニットテスト / 图片URL工具函数单元测试
 *
 * resolveImageUrl の検証
 * 验证 resolveImageUrl
 */
import { describe, it, expect, vi } from 'vitest'

// getApiBaseUrl と noImageSrc をモック / mock getApiBaseUrl 和 noImageSrc
vi.mock('@/api/base', () => ({
  getApiBaseUrl: () => 'http://localhost:3000/api',
}))

vi.mock('@/assets/images/no_image.png', () => ({
  default: '/no_image.png',
}))

// モジュールをインポート / 导入模块
import { resolveImageUrl } from '../imageUrl'

describe('resolveImageUrl / 画像URL解決', () => {
  it('falsy URL の場合はフォールバック画像を返す / falsy URL 时返回 fallback 图片', () => {
    expect(resolveImageUrl(undefined)).toBe('/no_image.png')
    expect(resolveImageUrl('')).toBe('/no_image.png')
  })

  it('カスタムフォールバック画像を使用する / 使用自定义 fallback 图片', () => {
    expect(resolveImageUrl(undefined, '/custom.png')).toBe('/custom.png')
  })

  it('http:// で始まるURLはそのまま返す / http:// 开头的 URL 原样返回', () => {
    expect(resolveImageUrl('http://example.com/img.png')).toBe('http://example.com/img.png')
  })

  it('https:// で始まるURLはそのまま返す / https:// 开头的 URL 原样返回', () => {
    expect(resolveImageUrl('https://cdn.example.com/img.png')).toBe('https://cdn.example.com/img.png')
  })

  it('スラッシュで始まる相対パスにサーバーベースURLを付与する / 斜杠开头的相对路径添加服务器基础URL', () => {
    const result = resolveImageUrl('/uploads/product.png')
    expect(result).toBe('http://localhost:3000/uploads/product.png')
  })

  it('スラッシュなしの相対パスにスラッシュを挿入する / 无斜杠的相对路径插入斜杠', () => {
    const result = resolveImageUrl('uploads/product.png')
    expect(result).toBe('http://localhost:3000/uploads/product.png')
  })
})
