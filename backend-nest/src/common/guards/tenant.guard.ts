// テナント分離ガード / 租户隔离守卫
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request.user?.tenantId) {
      throw new ForbiddenException('Tenant ID required');
    }
    request.tenantId = request.user.tenantId;
    return true;
  }
}
