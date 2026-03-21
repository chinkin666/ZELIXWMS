// レスポンス変換インターセプターテスト / 响应变换拦截器测试
import { TransformInterceptor } from './transform.interceptor';
import { of } from 'rxjs';

describe('TransformInterceptor / レスポンス変換 / 响应变换', () => {
  let interceptor: TransformInterceptor;
  const mockContext: any = { switchToHttp: () => ({ getRequest: () => ({}) }) };

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  // 単一オブジェクトに _id を追加 / 为单个对象添加 _id
  it('id を持つオブジェクトに _id を追加する / 为有 id 的对象添加 _id', (done) => {
    const handler = { handle: () => of({ id: 'uuid-1', name: 'Test' }) };
    interceptor.intercept(mockContext, handler as any).subscribe((result) => {
      expect(result._id).toBe('uuid-1');
      expect(result.id).toBe('uuid-1');
      done();
    });
  });

  // 配列の各要素に _id を追加 / 为数组每个元素添加 _id
  it('配列の各要素に _id を追加する / 为数组元素添加 _id', (done) => {
    const handler = { handle: () => of([{ id: '1' }, { id: '2' }]) };
    interceptor.intercept(mockContext, handler as any).subscribe((result) => {
      expect(result).toHaveLength(2);
      expect(result[0]._id).toBe('1');
      expect(result[1]._id).toBe('2');
      done();
    });
  });

  // ページネーション items に _id を追加 / 为分页 items 添加 _id
  it('items 配列の要素に _id を追加する / 为 items 数组元素添加 _id', (done) => {
    const handler = { handle: () => of({ items: [{ id: 'a' }], total: 1, page: 1, limit: 20 }) };
    interceptor.intercept(mockContext, handler as any).subscribe((result) => {
      expect(result.items[0]._id).toBe('a');
      expect(result.total).toBe(1);
      done();
    });
  });

  // null データをそのまま返す / 直接返回 null 数据
  it('null データを変更しない / 不修改 null 数据', (done) => {
    const handler = { handle: () => of(null) };
    interceptor.intercept(mockContext, handler as any).subscribe((result) => {
      expect(result).toBeNull();
      done();
    });
  });

  // 既に _id がある場合は上書きしない / 已有 _id 时不覆盖
  it('既存の _id を上書きしない / 不覆盖已有的 _id', (done) => {
    const handler = { handle: () => of({ id: 'new', _id: 'old' }) };
    interceptor.intercept(mockContext, handler as any).subscribe((result) => {
      expect(result._id).toBe('old');
      done();
    });
  });

  // id がないオブジェクトはスキップ / 跳过没有 id 的对象
  it('id がないオブジェクトをスキップする / 跳过没有 id 的对象', (done) => {
    const handler = { handle: () => of({ name: 'NoId' }) };
    interceptor.intercept(mockContext, handler as any).subscribe((result) => {
      expect(result._id).toBeUndefined();
      done();
    });
  });
});
