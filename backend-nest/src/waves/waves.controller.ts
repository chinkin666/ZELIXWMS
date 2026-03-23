// ウェーブコントローラ / 波次控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { WavesService } from './waves.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createWaveSchema, updateWaveSchema, type CreateWaveDto, type UpdateWaveDto } from './dto/create-wave.dto.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/waves')
@RequireRole('admin', 'manager', 'operator')
export class WavesController {
  constructor(private readonly wavesService: WavesService) {}

  // ウェーブ一覧取得 / 获取波次列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
  ) {
    return this.wavesService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      warehouseId,
      status,
    });
  }

  // ウェーブID検索 / 按ID查找波次
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.wavesService.findById(tenantId, id);
  }

  // ウェーブ作成 / 创建波次
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createWaveSchema)) dto: CreateWaveDto,
  ) {
    return this.wavesService.create(tenantId, dto);
  }

  // ウェーブ更新 / 更新波次
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWaveSchema)) dto: UpdateWaveDto,
  ) {
    return this.wavesService.update(tenantId, id, dto);
  }

  // ウェーブ削除（物理削除）/ 删除波次（物理删除）
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.wavesService.remove(tenantId, id);
  }

  // ========== ワークフロー / 工作流 ==========

  // ウェーブリリース（pending → in_progress）/ 波次释放（pending → in_progress）
  @Post(':id/release')
  release(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.wavesService.release(tenantId, id);
  }

  // ウェーブ完了（in_progress → completed）/ 波次完成（in_progress → completed）
  @Post(':id/complete')
  complete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.wavesService.complete(tenantId, id);
  }

  // ウェーブキャンセル（→ cancelled）/ 波次取消（→ cancelled）
  @Post(':id/cancel')
  cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.wavesService.cancel(tenantId, id);
  }
}
