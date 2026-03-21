// グローバル例外フィルターテスト / 全局异常过滤器测试
import { HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';
import { WmsException } from '../exceptions/wms.exception';

describe('GlobalExceptionFilter / グローバル例外フィルター / 全局异常过滤器', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({ method: 'GET', url: '/api/test' }),
      }),
    };
  });

  // 標準 HttpException を処理する / 处理标准 HttpException
  it('HttpException を正しくフォーマットする / 正确格式化 HttpException', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    filter.catch(exception, mockHost as any);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('Not Found');
    expect(body.timestamp).toBeDefined();
    expect(body.path).toBe('/api/test');
  });

  // WmsException をエラーコード付きで処理 / 处理带错误代码的 WmsException
  it('WmsException のエラーコードを含める / 包含 WmsException 错误代码', () => {
    const exception = new WmsException('INV_INSUFFICIENT_STOCK', 'Product ABC: 10 required, 5 available');
    filter.catch(exception, mockHost as any);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe('INV-001');
    expect(body.details).toContain('Product ABC');
  });

  // 未知エラー → 500 / 未知错误 → 500
  it('未知エラーで 500 を返す / 未知错误返回 500', () => {
    filter.catch(new Error('unexpected'), mockHost as any);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
  });

  // オブジェクトレスポンス付き HttpException / 带对象响应的 HttpException
  it('HttpException のオブジェクトレスポンスを処理 / 处理 HttpException 的对象响应', () => {
    const exception = new HttpException(
      { message: 'Validation failed', details: [{ field: 'sku', message: 'required' }] },
      HttpStatus.BAD_REQUEST,
    );
    filter.catch(exception, mockHost as any);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.message).toBe('Validation failed');
    expect(body.details).toHaveLength(1);
  });

  // 非 Error オブジェクト / 非 Error 对象
  it('非 Error オブジェクトも処理する / 处理非 Error 对象', () => {
    filter.catch('string error', mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });
});
