/**
 * ZELIX WMS — Phase 1 Architecture Design Document
 * 2026-03-13
 *
 * ═══════════════════════════════════════════════════════════════
 * 1. SYSTEM OVERVIEW
 * ═══════════════════════════════════════════════════════════════
 *
 * Cloud-native 3PL Warehouse Management System:
 * - Frontend: Vue 3 + TypeScript + Element Plus + Vite
 * - Backend:  Node.js + TypeScript + Express + Mongoose + MongoDB
 * - Architecture: Module-based SaaS with plugin system
 *
 * Target: Multi-tenant 3PL operations
 *   Inbound → Storage → Picking → Packing → Shipping
 *
 * ═══════════════════════════════════════════════════════════════
 * 2. CORE ENGINES (Phase 1 Complete)
 * ═══════════════════════════════════════════════════════════════
 *
 * 2.1 DataTable Engine — frontend/src/core/datatable/
 *   Config-driven table rendering, 3 modes (priority order):
 *   1. component — Vue component via <component :is>
 *   2. render   — VNode render function
 *   3. prop     — Simple el-table-column prop binding
 *
 *   Files:
 *   - types/table.ts             WmsColumnDef<T>, WmsSortChangeEvent
 *   - hooks/useTableSelection.ts Multi-row selection composable
 *   - hooks/useTablePagination.ts Client-side pagination
 *   - hooks/useTableContext.ts   Provide/inject context sharing
 *   - WmsDataTable.vue           Core engine component
 *   - WmsPagination.vue          Pagination UI wrapper
 *
 * 2.2 Plugin System — frontend/src/core/plugin/
 *   5 plugin types (discriminated union):
 *   - field       Custom form fields (component + defaultValue + rules)
 *   - column      Table column extensions (WmsColumnDef[] + target + order)
 *   - page        Route-based pages (routes[])
 *   - workflow    Multi-step processes (steps[] with execute/canExecute)
 *   - integration External system adapters (init/destroy/healthCheck)
 *
 *   Files:
 *   - types.ts           Type definitions
 *   - PluginRegistry.ts  Singleton registry
 *   - usePlugins.ts      Reactive composables (shallowRef version counter)
 *
 * 2.3 Task Engine — backend/src/services/taskEngine.ts
 *   Unified warehouse task lifecycle:
 *   - 8 types: picking, putaway, replenishment, counting, sorting, packing, receiving, shipping
 *   - 6 statuses: pending → assigned → in_progress → completed | cancelled | on_hold
 *   - 4 priorities: urgent > high > normal > low
 *   - Auto task numbers: WT-YYYYMMDD-XXXXX
 *   - Auto InventoryLedger on completion:
 *       picking       → outbound (negative)
 *       putaway/recv  → inbound (positive)
 *       replenishment → outbound(source) + inbound(dest)
 *
 * 2.4 Rule Engine — backend/src/services/ruleEngine.ts
 *   JSON-based business rule evaluation:
 *   - 7 modules: inbound, outbound, inventory, slotting, billing, notification, quality
 *   - Condition groups with AND/OR logic
 *   - 11 operators: equals, not_equals, gt, lt, gte, lte, contains, not_contains, in, not_in, regex
 *   - Dot-notation field paths, stopOnMatch, validFrom/validTo, execution tracking
 *
 * 2.5 Inventory Ledger — backend/src/models/inventoryLedger.ts
 *   Immutable append-only ledger:
 *   - Stock = SUM(all entries for product+warehouse)
 *   - Types: inbound, outbound, reserve, release, adjustment, count
 *   - Full audit: executedBy, executedAt, reason, memo
 *
 * ═══════════════════════════════════════════════════════════════
 * 3. DATA MODELS (Phase 1 — 15 models)
 * ═══════════════════════════════════════════════════════════════
 *
 * 3.1 Multi-Tenant & 3PL
 *   Tenant       — tenants          code, name, plan(5), status, limits, features[]
 *   Client       — clients          clientCode(unique), name, plan, billing
 *   Warehouse    — warehouses       code(unique), name, coolTypes[], capacity
 *
 * 3.2 Inventory
 *   InventoryLedger      — inventory_ledger       productId, type, quantity(±), ref
 *   InventoryReservation — inventory_reservations  productId, qty, status(4), source(4)
 *   SerialNumber         — serial_numbers          productId+serialNumber(unique), status(6)
 *
 * 3.3 Wave Picking & Fulfillment
 *   Wave         — waves            waveNumber(unique), status(6), shipmentIds[]
 *   PickTask     — pick_tasks       waveId, assignedTo, progress tracking
 *   PickItem     — pick_items       pickTaskId, productId, locationId, quantity
 *   SortingTask  — sorting_tasks    waveId, shipmentId, sortingSlot
 *   PackingTask  — packing_tasks    shipmentId, boxCount, trackingNumber
 *
 * 3.4 Location & Slotting
 *   SlottingRule       — slotting_rules        criterion(6), conditions, targetZone
 *   ReplenishmentTask  — replenishment_tasks   fromLocation→toLocation, trigger(3)
 *
 * 3.5 Unified Task & Rules
 *   WarehouseTask  — warehouse_tasks    taskNumber, type(8), status(6), priority(4)
 *   RuleDefinition — rule_definitions   ruleCode, module(7), conditionGroups[], actions[]
 *
 * ═══════════════════════════════════════════════════════════════
 * 4. ER RELATIONSHIPS
 * ═══════════════════════════════════════════════════════════════
 *
 *   Tenant (1) ──→ (N) Client
 *   Tenant (1) ──→ (N) Warehouse
 *   Client (1) ──→ (N) Product
 *   Warehouse (1) ──→ (N) Location
 *   Product (1) ──→ (N) InventoryLedger
 *   Product (1) ──→ (N) InventoryReservation
 *   Product (1) ──→ (N) SerialNumber
 *   Product (1) ──→ (N) Lot
 *   Lot (1) ──→ (N) SerialNumber
 *   Wave (1) ──→ (N) PickTask
 *   PickTask (1) ──→ (N) PickItem
 *   Wave (1) ──→ (N) SortingTask
 *   ShipmentOrder (1) ──→ (1) PackingTask
 *   WarehouseTask ──→ Product, Location, Warehouse
 *
 * ═══════════════════════════════════════════════════════════════
 * 5. FRONTEND MODULE ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════
 *
 *   src/
 *   ├── core/
 *   │   ├── datatable/          DataTable Engine
 *   │   └── plugin/             Plugin System
 *   ├── modules/
 *   │   ├── shipment/           Shipment order management
 *   │   │   ├── columns.ts      Column defs with DI pattern
 *   │   │   └── components/V2OrderTable.vue
 *   │   └── warehouse/          Warehouse operations
 *   │       ├── types/task.ts   WarehouseTask types + JP labels
 *   │       ├── types/rule.ts   RuleDefinition types + JP labels
 *   │       ├── api/taskApi.ts  Task REST client
 *   │       └── api/ruleApi.ts  Rule REST client
 *   └── plugins/
 *       ├── yamato-carrier/     Yamato B2 Cloud integration
 *       ├── barcode-field/      Barcode scanner field
 *       └── index.ts            Plugin registration
 *
 * ═══════════════════════════════════════════════════════════════
 * 6. BACKEND SERVICE ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════
 *
 *   backend/src/
 *   ├── models/ (15 Mongoose models)
 *   │   ├── tenant.ts, client.ts, warehouse.ts
 *   │   ├── inventoryLedger.ts, inventoryReservation.ts, serialNumber.ts
 *   │   ├── wave.ts, pickTask.ts, pickItem.ts, sortingTask.ts, packingTask.ts
 *   │   ├── replenishmentTask.ts, slottingRule.ts
 *   │   └── warehouseTask.ts, ruleDefinition.ts
 *   └── services/
 *       ├── taskEngine.ts       Unified task lifecycle
 *       └── ruleEngine.ts       JSON rule evaluation
 *
 * ═══════════════════════════════════════════════════════════════
 * 7. KEY DESIGN DECISIONS
 * ═══════════════════════════════════════════════════════════════
 *
 *   1. Ledger-based inventory (not snapshot) — full audit trail, FIFO/FEFO support
 *   2. Unified WarehouseTask — all ops share lifecycle, simplifies dashboard
 *   3. JSON Rule Engine — business rules configurable without code changes
 *   4. Plugin system — extend without modifying core (Open/Closed)
 *   5. Config-driven tables — column definitions as data, not templates
 *   6. Immutable data patterns — new objects, never mutate
 *   7. Module-based frontend — feature folders, not type folders
 *   8. Static service classes — pure function containers
 *
 * ═══════════════════════════════════════════════════════════════
 * 8. PHASE 2 DEVELOPMENT PLAN
 * ═══════════════════════════════════════════════════════════════
 *
 * 8.1 Backend API Layer (Priority 1)
 *   1. /api/v1/tenants           Tenant CRUD
 *   2. /api/v1/clients           Client CRUD
 *   3. /api/v1/warehouses        Warehouse CRUD
 *   4. /api/v1/inventory         Ledger queries, stock levels, reservations
 *   5. /api/v1/waves             Wave create, assign, progress
 *   6. /api/v1/tasks             Task dashboard, assignment, lifecycle
 *   7. /api/v1/rules             Rule CRUD, test, toggle
 *   8. /api/v1/serial-numbers    Register, track, query
 *
 * 8.2 Frontend Pages (Priority 2)
 *   1. Task Dashboard            Real-time task queue + assignment
 *   2. Wave Management           Create waves, monitor picking
 *   3. Rule Configuration        Visual rule builder + test mode
 *   4. Client Management         3PL client CRUD
 *   5. Warehouse Management      Facility settings, zones
 *   6. Inventory Dashboard       Stock levels, reservations, ledger
 *   7. Serial Number Tracking    Individual item lifecycle
 *
 * 8.3 Workflow Engine (Priority 3)
 *   1. Inbound:  Receive → QC → Putaway → Slotting
 *   2. Outbound: Order → Wave → Pick → Sort → Pack → Ship
 *   3. Replenishment: Rule trigger → Task → Execute → Confirm
 *   4. Stocktaking: Plan → Count → Variance → Adjust
 *
 * 8.4 Integration Layer (Priority 4)
 *   1. Rakuten RMS    — Order sync plugin
 *   2. Shopify        — Order/inventory sync plugin
 *   3. Sagawa Express — Shipping label integration
 *   4. Yamato B2      — Already implemented (DO NOT MODIFY)
 *
 * ═══════════════════════════════════════════════════════════════
 * 9. CONSTRAINTS
 * ═══════════════════════════════════════════════════════════════
 *
 * DO NOT MODIFY:
 *   - backend/src/services/yamatoB2Service.ts
 *   - backend/src/utils/yamatoB2Format.ts
 *   - All existing views in frontend/src/views/
 *   - All existing API routes
 *
 * Phase 2 builds ON TOP of existing code. New modules, new routes, new pages.
 *
 * ═══════════════════════════════════════════════════════════════
 * 10. FILE INVENTORY (Phase 1 Output)
 * ═══════════════════════════════════════════════════════════════
 *
 * Total new files: 38
 *   Frontend core:    8 files (datatable engine)
 *   Frontend core:    4 files (plugin system)
 *   Frontend plugins: 4 files
 *   Frontend modules: 6 files (shipment + warehouse)
 *   Backend models:  15 files
 *   Backend services: 2 files
 *
 * All files pass TypeScript compilation.
 * No existing files were modified.
 */

export const ARCHITECTURE_VERSION = '1.0.0' as const
export const ARCHITECTURE_DATE = '2026-03-13' as const
