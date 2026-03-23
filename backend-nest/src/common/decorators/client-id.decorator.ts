// クライアントIDデコレータ（JWTから取得）/ 客户ID装饰器（从JWT获取）
// フロントエンドからの clientId パラメータを信頼せず、JWT claims から取得する
// 不信任前端传入的clientId参数，从JWT claims中获取
import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const ClientId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const clientId = request.user?.clientId;

    if (!clientId) {
      throw new ForbiddenException(
        'Client ID missing from JWT claims / JWTにクライアントIDがありません / JWT中缺少客户ID',
      );
    }

    return clientId;
  },
);
