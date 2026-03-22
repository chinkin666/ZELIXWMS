// レスポンス変換（_id互換 + 分ページ互換）/ 响应变换（_id兼容 + 分页兼容）
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        if (!data) return data;
        // 配列の場合は各要素を変換 / 数组时转换每个元素
        if (Array.isArray(data)) return data.map(this.addIdAlias);
        // items 配列を持つページネーション → 旧フォーマット互換
        // 带items数组的分页 → 兼容旧格式（data数组 + 分页メタをフラット展開）
        if (data.items && Array.isArray(data.items)) {
          return this.addIdAlias({ ...data, items: data.items.map(this.addIdAlias) });
        }
        return this.addIdAlias(data);
      }),
    );
  }

  private addIdAlias(obj: any): any {
    if (obj && typeof obj === 'object' && obj.id && !obj._id) {
      return { ...obj, _id: obj.id };
    }
    return obj;
  }
}
