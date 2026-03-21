// リクエストIDミドルウェアテスト / 请求ID中间件测试
import { RequestIdMiddleware } from './request-id.middleware.js';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  // UUID生成 / 生成UUID
  it('should generate a UUID when no x-request-id header exists', () => {
    const req: any = { headers: {} };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(req.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(next).toHaveBeenCalled();
  });

  // 既存ヘッダーの使用 / 使用已有的请求头
  it('should use existing x-request-id header', () => {
    const existingId = 'my-custom-request-id';
    const req: any = { headers: { 'x-request-id': existingId } };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.requestId).toBe(existingId);
  });

  // レスポンスヘッダーの設定 / 设置响应头
  it('should set X-Request-Id response header', () => {
    const req: any = { headers: {} };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
  });

  // 既存IDでレスポンスヘッダーも同じ値 / 使用已有ID时响应头也是相同值
  it('should set response header with existing request id', () => {
    const existingId = 'existing-id-123';
    const req: any = { headers: { 'x-request-id': existingId } };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', existingId);
  });

  // next()の呼び出し / 调用next()
  it('should call next()', () => {
    const req: any = { headers: {} };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
