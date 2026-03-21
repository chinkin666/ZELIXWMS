// 公開ルートデコレータ（認証スキップ）/ 公开路由装饰器（跳过认证）
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
