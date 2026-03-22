// 国コード管理サービス / 国家代码管理服务
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { countryCodes } from '../database/schema/reference.js';
import { WmsException } from '../common/exceptions/wms.exception.js';

@Injectable()
export class CountryCodesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 全国コード一覧取得（約250件、キャッシュ向き）/ 获取全部国家代码（约250条，适合缓存）
  async findAll() {
    return this.db
      .select()
      .from(countryCodes)
      .orderBy(countryCodes.alpha2);
  }

  // alpha2コードで検索 / 按alpha2代码查询
  async findByAlpha2(alpha2: string) {
    const [record] = await this.db
      .select()
      .from(countryCodes)
      .where(eq(countryCodes.alpha2, alpha2.toUpperCase()))
      .limit(1);

    if (!record) {
      throw new WmsException('COUNTRY_CODE_NOT_FOUND', `Country code ${alpha2} not found`);
    }

    return record;
  }
}
