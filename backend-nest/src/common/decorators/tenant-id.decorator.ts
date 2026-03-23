// テナントIDデコレータ（回退値なし、未設定時は403）/ 租户ID装饰器（无回退值，未设置时403）
import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const tenantId = request.tenantId || request.user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID required / テナントIDが必要です / 需要租户ID');
    }
    return tenantId;
  },
);
