// 顧客モジュール（サブエンティティ含む）/ 客户模块（含子实体）
import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';
import { SubClientsController } from './sub-clients.controller.js';
import { SubClientsService } from './sub-clients.service.js';
import { ShopsController } from './shops.controller.js';
import { ShopsService } from './shops.service.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { SuppliersController } from './suppliers.controller.js';
import { SuppliersService } from './suppliers.service.js';
import { OrderSourceCompaniesController } from './order-source-companies.controller.js';
import { OrderSourceCompaniesService } from './order-source-companies.service.js';

@Module({
  controllers: [
    ClientsController,
    SubClientsController,
    ShopsController,
    CustomersController,
    SuppliersController,
    OrderSourceCompaniesController,
  ],
  providers: [
    ClientsService,
    SubClientsService,
    ShopsService,
    CustomersService,
    SuppliersService,
    OrderSourceCompaniesService,
  ],
  exports: [
    ClientsService,
    SubClientsService,
    ShopsService,
    CustomersService,
    SuppliersService,
    OrderSourceCompaniesService,
  ],
})
export class ClientsModule {}
