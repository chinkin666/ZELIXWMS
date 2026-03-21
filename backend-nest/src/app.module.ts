import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
import { EmailTemplatesModule } from './email-templates/email-templates.module.js';
import { FormTemplatesModule } from './form-templates/form-templates.module.js';
import { PrintTemplatesModule } from './print-templates/print-templates.module.js';
import { MappingConfigsModule } from './mapping-configs/mapping-configs.module.js';
import { LotsModule } from './lots/lots.module.js';
import { ExceptionsModule } from './exceptions/exceptions.module.js';
import { FbaModule } from './fba/fba.module.js';
import { RslModule } from './rsl/rsl.module.js';
import { SagawaModule } from './sagawa/sagawa.module.js';
import { CarrierAutomationModule } from './carrier-automation/carrier-automation.module.js';
import { ApiLogsModule } from './api-logs/api-logs.module.js';
import { OperationLogsModule } from './operation-logs/operation-logs.module.js';
import { PassthroughModule } from './passthrough/passthrough.module.js';
import { SerialNumbersModule } from './serial-numbers/serial-numbers.module.js';
import { InventoryCategoriesModule } from './inventory-categories/inventory-categories.module.js';
import { InventoryLedgerModule } from './inventory-ledger/inventory-ledger.module.js';
import { SetProductsModule } from './set-products/set-products.module.js';
import { OutboundRequestsModule } from './outbound-requests/outbound-requests.module.js';
import { InspectionsModule } from './inspections/inspections.module.js';
import { LabelingTasksModule } from './labeling-tasks/labeling-tasks.module.js';
import { CycleCountsModule } from './cycle-counts/cycle-counts.module.js';
import { ListenersModule } from './common/listeners/listeners.module.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import envConfig from './config/env.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [envConfig] }),
    EventEmitterModule.forRoot(),
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
    EmailTemplatesModule,
    FormTemplatesModule,
    PrintTemplatesModule,
    MappingConfigsModule,
    LotsModule,
    ExceptionsModule,
    FbaModule,
    RslModule,
    SagawaModule,
    CarrierAutomationModule,
    ApiLogsModule,
    OperationLogsModule,
    PassthroughModule,
    SerialNumbersModule,
    InventoryCategoriesModule,
    InventoryLedgerModule,
    SetProductsModule,
    OutboundRequestsModule,
    InspectionsModule,
    LabelingTasksModule,
    CycleCountsModule,
    ListenersModule,
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
