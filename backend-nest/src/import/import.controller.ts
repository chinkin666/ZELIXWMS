// インポートコントローラ / 导入控制器
import { Controller, Post, Body } from '@nestjs/common';
import { ImportService } from './import.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/import')
@RequireRole('admin', 'manager', 'operator')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  // CSVデータバリデーション / CSV数据验证
  @Post('validate')
  validateCsv(
    @TenantId() tenantId: string,
    @Body() body: { data: any[]; mappingConfigId?: string },
  ) {
    return this.importService.validateCsv(tenantId, body.data, body.mappingConfigId);
  }

  // CSVデータインポート実行 / 执行CSV数据导入
  @Post('execute')
  importCsv(
    @TenantId() tenantId: string,
    @Body() body: { data: any[]; entityType: string },
  ) {
    return this.importService.importCsv(tenantId, body.data, body.entityType);
  }
}
