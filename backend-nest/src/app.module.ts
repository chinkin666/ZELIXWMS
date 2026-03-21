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
import { ShipmentModule } from './shipment/shipment.module.js';
import { BillingModule } from './billing/billing.module.js';
import { ReturnsModule } from './returns/returns.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { ExtensionsModule } from './extensions/extensions.module.js';
import { StocktakingModule } from './stocktaking/stocktaking.module.js';
import { KpiModule } from './kpi/kpi.module.js';
import { DailyReportsModule } from './daily-reports/daily-reports.module.js';
import { QueueModule } from './queue/queue.module.js';
import { AuthGuard } from './common/guards/auth.guard.js';
import { TenantGuard } from './common/guards/tenant.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { AuthModule } from './auth/auth.module.js';
import { WavesModule } from './waves/waves.module.js';
import { WarehouseTasksModule } from './warehouse-tasks/warehouse-tasks.module.js';
import { MaterialsModule } from './materials/materials.module.js';
import { AdminModule } from './admin/admin.module.js';
import { ImportModule } from './import/import.module.js';
import { ClientPortalModule } from './client-portal/client-portal.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { RenderModule } from './render/render.module.js';
import { PeakModeModule } from './peak-mode/peak-mode.module.js';
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
    ShipmentModule,
    BillingModule,
    ReturnsModule,
    NotificationsModule,
    ExtensionsModule,
    StocktakingModule,
    KpiModule,
    DailyReportsModule,
    QueueModule,
    AuthModule,
    WavesModule,
    WarehouseTasksModule,
    MaterialsModule,
    AdminModule,
    ImportModule,
    ClientPortalModule,
    IntegrationsModule,
    RenderModule,
    PeakModeModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
