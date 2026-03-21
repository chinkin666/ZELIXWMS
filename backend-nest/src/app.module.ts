import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { ProductsModule } from './products/products.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { WarehousesModule } from './warehouses/warehouses.module.js';
import { InboundModule } from './inbound/inbound.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { CarriersModule } from './carriers/carriers.module.js';
import { AuthGuard } from './common/guards/auth.guard.js';
import { TenantGuard } from './common/guards/tenant.guard.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import envConfig from './config/env.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [envConfig] }),
    DatabaseModule,
    HealthModule,
    ProductsModule,
    ClientsModule,
    WarehousesModule,
    InboundModule,
    InventoryModule,
    CarriersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
