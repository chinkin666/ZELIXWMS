// 国コード管理コントローラ / 国家代码管理控制器
import { Controller, Get, Param } from '@nestjs/common';
import { CountryCodesService } from './country-codes.service.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('api/country-codes')
@Public()
export class CountryCodesController {
  constructor(private readonly countryCodesService: CountryCodesService) {}

  // 全国コード一覧取得 / 获取全部国家代码列表
  @Public()
  @Get()
  findAll() {
    return this.countryCodesService.findAll();
  }

  // alpha2コードで検索 / 按alpha2代码查询
  @Public()
  @Get(':alpha2')
  findByAlpha2(@Param('alpha2') alpha2: string) {
    return this.countryCodesService.findByAlpha2(alpha2);
  }
}
