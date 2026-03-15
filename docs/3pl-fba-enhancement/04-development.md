# 04 开发实现 / 開発実装

> 3PL + FBA 通过型业务系统增强 / 3PL + FBA 通過型業務システム強化
> 任务拆分、代码位置、实现指引 / タスク分解・コード位置・実装ガイド

## 1. 代码组织 / コード構成

### 1.1 后端新增文件 / バックエンド新規ファイル

```
backend/src/
├── models/
│   ├── fbaBox.ts                     # FBA 箱模型 / FBA 箱モデル
│   ├── exceptionReport.ts            # 异常报告模型 / 異常報告モデル
│   ├── inspectionRecord.ts           # 检品记录模型 / 検品記録モデル
│   ├── labelingTask.ts               # 贴标任务模型 / ラベルタスクモデル
│   ├── cycleCountPlan.ts             # 循环盘点模型 / 循環棚卸モデル
│   └── fbaRemovalOrder.ts            # FBA 移除订单模型 / FBA 返送注文モデル
│
├── api/controllers/
│   ├── inspectionController.ts       # 检品 API / 検品 API
│   ├── labelingController.ts         # 贴标 API / ラベル API
│   ├── fbaBoxController.ts           # FBA 箱 API / FBA 箱 API
│   ├── exceptionController.ts        # 异常报告 API / 異常報告 API
│   ├── cycleCountController.ts       # 循环盘点 API / 循環棚卸 API
│   ├── fbaRemovalController.ts       # FBA 移除 API / FBA 返送 API
│   ├── uploadController.ts           # 照片上传 API / 写真アップロード API
│   ├── kpiController.ts              # KPI API / KPI API
│   └── reportController.ts           # 报告 API / レポート API
│
├── api/routes/
│   ├── inspections.ts
│   ├── labeling.ts
│   ├── fbaBoxes.ts
│   ├── exceptions.ts
│   ├── cycleCounts.ts
│   ├── fbaRemovals.ts
│   ├── uploads.ts
│   ├── kpi.ts
│   └── reports.ts
│
├── services/
│   ├── inspectionService.ts          # 检品业务逻辑 / 検品ビジネスロジック
│   ├── labelingService.ts            # 贴标业务逻辑 / ラベルビジネスロジック
│   ├── fbaBoxService.ts              # FBA 箱管理逻辑 / FBA 箱管理ロジック
│   ├── exceptionService.ts           # 异常处理逻辑 / 異常処理ロジック
│   ├── cycleCountService.ts          # 盘点逻辑 / 棚卸ロジック
│   ├── fbaRemovalService.ts          # FBA 移除逻辑 / FBA 返送ロジック
│   ├── photoService.ts               # 照片存储服务 / 写真ストレージサービス
│   ├── kpiService.ts                 # KPI 计算 / KPI 計算
│   ├── reportService.ts              # 报告生成 / レポート生成
│   ├── notificationService.ts        # 可靠通知 / 確実通知
│   └── importService.ts              # Excel 导入 / Excel インポート
│
├── api/middleware/
│   └── auditLogger.ts                # 统一审计中间件 / 統一監査ミドルウェア
│
└── config/
    └── s3.ts                         # S3/MinIO 配置 / S3/MinIO 設定
```

### 1.2 前端新增文件 / フロントエンド新規ファイル

```
frontend/src/
├── api/
│   ├── inspection.ts                 # 检品 API 客户端
│   ├── labeling.ts                   # 贴标 API 客户端
│   ├── fbaBox.ts                     # FBA 箱 API 客户端
│   ├── exception.ts                  # 异常报告 API 客户端
│   ├── cycleCount.ts                 # 循环盘点 API 客户端
│   ├── fbaRemoval.ts                 # FBA 移除 API 客户端
│   ├── upload.ts                     # 照片上传 API 客户端
│   └── kpi.ts                        # KPI API 客户端
│
├── components/
│   ├── photo/
│   │   ├── PhotoCapture.vue          # 拍照/上传组件 / 撮影・アップロードコンポーネント
│   │   └── PhotoGallery.vue          # 照片查看组件 / 写真閲覧コンポーネント
│   ├── scanner/
│   │   └── BarcodeScanInput.vue      # 扫码输入组件 / バーコードスキャン入力
│   └── print/
│       └── LabelPrintButton.vue      # 标签打印按钮 / ラベル印刷ボタン
│
├── views/
│   ├── inspection/
│   │   ├── InspectionList.vue        # 检品记录列表 / 検品記録一覧
│   │   └── InspectionForm.vue        # 检品操作页（移动端）/ 検品操作画面（モバイル）
│   ├── labeling/
│   │   ├── LabelingTaskList.vue      # 贴标任务列表/看板 / ラベルタスク一覧
│   │   └── LabelingOperation.vue     # 贴标操作页（移动端）/ ラベル操作画面（モバイル）
│   ├── fba/
│   │   ├── FbaBoxManagement.vue      # FBA 箱管理 / FBA 箱管理
│   │   └── FbaRemovalList.vue        # FBA 移除订单 / FBA 返送注文一覧
│   ├── exceptions/
│   │   ├── ExceptionList.vue         # 异常报告列表 / 異常報告一覧
│   │   └── ExceptionCreate.vue       # 异常上报（移动端）/ 異常報告（モバイル）
│   ├── cycle-count/
│   │   ├── CycleCountList.vue        # 盘点计划列表 / 棚卸計画一覧
│   │   └── CycleCountOperation.vue   # 盘点操作（移动端）/ 棚卸操作（モバイル）
│   └── kpi/
│       └── KpiDashboard.vue          # KPI 仪表板 / KPI ダッシュボード
```

### 1.3 需要修改的现有文件 / 修正が必要な既存ファイル

```
后端 / バックエンド:
- backend/src/api/routes/index.ts                  # 注册新路由 / 新ルート登録
- backend/src/models/inboundOrder.ts               # 扩展字段 / フィールド拡張 (Phase 1)
- backend/src/models/stockQuant.ts                 # 扩展 inventoryStatus / ステータス拡張 (Phase 1)
- backend/src/models/fbaShipmentPlan.ts            # 扩展多仓/箱级 / 複数FC・箱レベル拡張 (Phase 1)
- backend/src/models/user.ts                       # 扩展 certifications / 資格拡張 (Phase 4)
- backend/src/services/chargeService.ts            # 新增计费触发点 / 新規課金トリガー (Phase 1)
- backend/src/services/taskEngine.ts               # 新增任务类型 / 新規タスクタイプ (Phase 1)
- backend/src/services/inboundWorkflow.ts          # 集成检品/主管复核 / 検品・責任者確認統合 (Phase 1)
- backend/src/config/swagger.ts                    # 新 API 文档 / 新 API ドキュメント

前端 / フロントエンド:
- frontend/src/router/index.ts                     # 新页面路由 / 新ページルート
- frontend/src/components/layout/menuData.ts       # 菜单项 / メニュー項目
- frontend/src/components/layout/WmsSettingsSidebar.vue  # 设置菜单 / 設定メニュー
- frontend/src/views/fba/FbaPlanCreate.vue         # 集成箱管理入口 / 箱管理入口統合
- frontend/src/views/fba/FbaPlanList.vue           # 集成箱管理入口 / 箱管理入口統合
```

## 2. 任务拆分 / タスク分解

### Phase 1: 核心缺失（P0）

#### 1.1 照片存储基础设施

```
任务: 搭建 S3/MinIO 照片存储服务
预估: 1-2 天
依赖: 无（基础设施，其他功能依赖此项）

步骤:
1. 配置 MinIO (docker-compose 添加 minio 服务)
2. 创建 backend/src/config/s3.ts (S3 客户端配置)
3. 创建 backend/src/services/photoService.ts
   - upload(file, tenantId, category, refId) → {key, url, thumbnailUrl}
   - delete(key)
   - generateThumbnail(buffer, maxWidth=300)
4. 创建 backend/src/api/controllers/uploadController.ts
   - POST /api/uploads/photos (multer + photoService)
5. 创建 frontend/src/components/photo/PhotoCapture.vue
   - 摄像头调用 + 相册选择
   - 客户端压缩 (canvas resize)
   - 上传进度
6. 创建 frontend/src/components/photo/PhotoGallery.vue
   - 缩略图网格 + 全屏查看
7. 创建 frontend/src/api/upload.ts
```

#### 1.2 检品增强

```
任务: 扩展检品流程，支持多维度检品 + 拍照 + 异常分类
预估: 3-4 天
依赖: 1.1 (照片存储)

步骤:
1. 创建 backend/src/models/inspectionRecord.ts
2. 创建 backend/src/services/inspectionService.ts
   - createInspection(inboundOrderId, lineNumber, mode, checks)
   - submitInspection(id, results, photos)
   - verifyInspection(id, verifierId)
   - 自动创建 ExceptionReport（如有异常）
   - 自动触发 inspection 计费
3. 创建 backend/src/api/controllers/inspectionController.ts
4. 创建 backend/src/api/routes/inspections.ts
5. 扩展 InboundOrderLine 模型 (inspectionMode, inspectionRecordId, appearanceStatus)
6. 修改 inboundWorkflow.ts 的 confirmReceiveLine() 集成检品
7. 创建 frontend/src/views/inspection/InspectionForm.vue (移动端优先)
   - 扫码 → 显示检品项 → 逐项通过/失败 → 拍照 → 提交
8. 创建 frontend/src/views/inspection/InspectionList.vue
9. 创建 frontend/src/api/inspection.ts
```

#### 1.3 异常报告模块

```
任务: 异常报告全流程（创建/通知/确认/处理/关闭）
预估: 3-4 天
依赖: 1.1 (照片存储)

步骤:
1. 创建 backend/src/models/exceptionReport.ts
2. 创建 backend/src/services/exceptionService.ts
   - create(data) → 自动判定级别对应响应时效
   - notify(id) → 调用 notificationService
   - acknowledge(id, clientUserId)
   - resolve(id, resolution)
   - checkSlaBreaches() → 定时任务调用
3. 创建 backend/src/services/notificationService.ts
   - sendWithRetry(webhookId, event, payload, maxRetries=3)
   - 记录 delivery log
   - 超时未送达 → 升级通知
4. 创建 backend/src/api/controllers/exceptionController.ts
5. 创建 backend/src/api/routes/exceptions.ts
6. 创建 frontend/src/views/exceptions/ExceptionCreate.vue (移动端)
   - 选异常类型 → 填描述 → 拍照 → 一键提交
7. 创建 frontend/src/views/exceptions/ExceptionList.vue
   - SLA 倒计时、级别颜色高亮
8. 创建 frontend/src/api/exception.ts
9. 扩展 ClientPortal: 异常确认入口
```

#### 1.4 贴标任务管理

```
任务: FNSKU 贴标全流程 + 标签打印 + 双人复核
预估: 4-5 天
依赖: 1.1 (照片存储), FBA 模块

步骤:
1. 创建 backend/src/models/labelingTask.ts
2. 创建 backend/src/services/labelingService.ts
   - batchCreateFromPlan(fbaShipmentPlanId) → 按 plan items 生成贴标任务
   - startPrint(id, operatorId) → pending → printing
   - startLabel(id) → printing → labeling
   - updateProgress(id, completedQuantity)
   - verify(id, verifierId, result) → labeling → verifying → completed
   - 完成时自动计费 (labeling 费)
   - fail 时自动创建 ExceptionReport
3. 创建 backend/src/api/controllers/labelingController.ts
4. 创建 backend/src/api/routes/labeling.ts
5. 扩展 printConfig.ts: 添加 FNSKU 标签模板 (30x50mm)
6. 创建 frontend/src/views/labeling/LabelingOperation.vue (移动端)
   - 扫商品 → 显示 FNSKU → 确认贴标 → 计数 → 完成后转交复核
7. 创建 frontend/src/views/labeling/LabelingTaskList.vue
   - 看板布局：待打印 / 贴标中 / 复核中 / 完成
8. 创建 frontend/src/components/print/LabelPrintButton.vue
   - 选择打印机 → 设置数量 → 打印
9. 创建 frontend/src/api/labeling.ts
```

#### 1.5 FBA 箱级管理

```
任务: FBA 箱 CRUD + 分箱/合箱/换箱 + 箱规校验
预估: 4-5 天
依赖: FBA 模块

步骤:
1. 创建 backend/src/models/fbaBox.ts
2. 创建 backend/src/services/fbaBoxService.ts
   - createBox(planId, boxData) → 自动编号
   - updateBox(boxId, data)
   - splitBox(sourceBoxId, splitConfig) → 一拆多
   - mergeBoxes(boxIds, targetBoxId) → 多合一（校验同一 plan）
   - replaceBox(boxId, newDimensions) → 换箱
   - sealBox(boxId, operatorId, photoUrl)
   - validateBoxes(planId) → 校验全部箱的重量/尺寸
     - 单箱 ≤15kg (混合 SKU) / ≤30kg (单一 SKU)
     - 最长边 ≤63.5cm, 三边合计 ≤150cm
   - 分箱/合箱完成时自动计费
3. 扩展 FbaShipmentPlan 模型 (isMultiFc, splitPlans, boxValidation)
4. 创建 backend/src/api/controllers/fbaBoxController.ts
5. 创建 backend/src/api/routes/fbaBoxes.ts
6. 创建 frontend/src/views/fba/FbaBoxManagement.vue
   - 箱列表 + 箱内容编辑
   - 分箱/合箱/换箱操作
   - 实时箱规校验（红/绿提示）
   - 封箱拍照
7. 修改 FbaPlanCreate.vue / FbaPlanList.vue: 添加"管理箱"入口
8. 创建 frontend/src/api/fbaBox.ts
```

### Phase 2: FBA 增强（P0-P1）

#### 2.1 多仓纳品拆分

```
预估: 2-3 天
依赖: 1.5 (FBA 箱管理)

步骤:
1. 扩展 FbaShipmentPlan 模型的 splitPlans 字段
2. 在 fbaBoxService 中添加:
   - splitPlanToMultiFc(planId, fcAssignments)
     - fcAssignments: [{ fc: 'NRT5', boxIds: [...] }, ...]
   - 校验: 每个箱只能分配到一个 FC
   - 自动计算多仓附加费
3. 更新 FbaBoxManagement.vue: 添加 FC 分配界面
   - 拖拽箱到不同 FC 分区
   - 每个 FC 独立显示追踪号输入
```

#### 2.2 FBA 移除订单

```
预估: 3-4 天
依赖: 1.2 (检品)

步骤:
1. 创建 backend/src/models/fbaRemovalOrder.ts
2. 创建 backend/src/services/fbaRemovalService.ts
   - 复用 inspectionService 的检品逻辑
   - 客户指令执行: 重发 FBA / FBM 上架 / 退回 / 废弃
   - 重发 FBA → 创建新 FbaShipmentPlan
   - FBM 上架 → 创建 StockMove (inbound)
   - 废弃 → 拍照留档 + StockMove (adjustment)
3. 创建 controller + route + frontend
```

#### 2.3 箱规校验增强

```
预估: 1 天
依赖: 1.5 (FBA 箱管理)

步骤:
1. 在 fbaBoxService.validateBoxes() 中实现完整校验规则
2. FBA Plan confirm 时自动触发校验
3. 校验不通过阻止 confirm 状态转换
4. 前端实时校验反馈（编辑箱信息时即时提示）
```

### Phase 3: 运营增强（P1）

#### 3.1 循环盘点

```
预估: 4-5 天
依赖: 无

步骤:
1. 创建 model + service + controller + route
2. 自动生成逻辑:
   - 读取 warehouseId 下所有有库存的 SKU
   - 随机选取 20%（排除上月已盘 SKU）
   - 按库位生成盘点项
3. 移动端盘点页面: 扫库位 → 扫商品 → 输入实数
4. 差异率 >0.5% 自动预警
5. 定时任务: 每月 1 日自动生成
```

#### 3.2 库龄预警 + 超期计费

```
预估: 2-3 天
依赖: 无

步骤:
1. 扩展 StockQuant 模型 (inventoryStatus)
2. 定时任务扫描 lastMovedAt
3. 60 天 → 通知客户
4. 90 天 → 自动计费 (overdue_storage)
5. 180 天 → 生成客户指令请求
6. 库龄预警列表页面（按库龄排序、客户筛选）
```

#### 3.3 入库预报 Excel 导入

```
预估: 3-4 天
依赖: 无

步骤:
1. 创建 backend/src/services/importService.ts
   - parseExcel(buffer) → 识别模板类型
   - matchSkus(rows, tenantId) → SKU 匹配
   - preview(parsed) → 返回匹配率、差异项
   - confirm(previewId) → 创建 InboundOrder
2. 复用已有 mapping_configs collection 做列映射
3. 前端: 拖拽上传 → 预览表格 → 确认导入
```

#### 3.4 SOP 表单电子化

```
预估: 3-4 天
依赖: 1.1, 1.2, 1.4, 1.5

步骤:
1. 收货登记表 → InboundOrder 扩展字段 + 收货确认页面
2. 检品记录表 → InspectionRecord (已在 1.2 完成)
3. 贴标作业表 → LabelingTask (已在 1.4 完成)
4. FBA 出货核对表 → FBA 出货确认流程
   - 四项一致核对页面（移动端）
   - 逐项扫码确认 → 拍照 → 签名确认
5. 异常报告单 → ExceptionReport (已在 1.3 完成)
```

### Phase 4: 管理增强（P2）

#### 4.1 KPI 仪表板

```
预估: 3-4 天
依赖: Phase 1-3 数据积累

步骤:
1. kpiService: 聚合计算各项 KPI
2. KPI 目标配置（可按客户/仓库自定义）
3. 仪表板: 仪表盘 + 趋势图 + 目标对比
```

#### 4.2 自动报告

```
预估: 3-4 天
依赖: Phase 1-3

步骤:
1. reportService: 日报/周报/月报模板
2. 定时任务自动生成
3. 预览 + 一键发送（邮件/系统通知）
```

#### 4.3 计费扩展

```
预估: 1-2 天
依赖: 无

步骤:
1. ServiceRate 新增费率类型枚举值
2. 管理界面添加新费率配置
```

#### 4.4 其他 P2 功能

```
- 大促模式（仓容监控 + 冻结开关）: 1-2 天
- 员工资格管理（User 扩展 + 到期提醒）: 1-2 天
- 客户准入审核（Client 扩展 + 审核流程）: 2-3 天
- 操作审计中间件: 1 天
- 租户隔离中间件: 1-2 天
```

## 3. 开发规范 / 開発規範

### 3.1 通用规范

```
- 所有新 model 必须包含 tenantId 字段和对应索引
- 所有新 controller 必须通过 requireAuth 中间件
- 所有新 route 必须注册到 api/routes/index.ts
- 所有自动编号使用 XXX-YYYYMMDD-NNN 格式
- 所有写操作必须记录 operationLog（Phase 4 后由审计中间件接管）
- 所有计费操作通过 chargeService.createAutoCharge() 触发
- 所有照片通过 photoService 统一管理
- 代码注释使用中日双语 / コードコメントは中日バイリンガル
- commit message 使用中日双语 / コミットメッセージは中日バイリンガル
```

### 3.2 移动端开发规范

```
- 触摸目标最小 44x44px
- 扫码输入框自动聚焦
- 操作成功/失败使用 scanBeep 声音反馈
- 关键操作有确认弹窗
- 网络异常时显示重试按钮（不静默失败）
- 页面加载使用 skeleton loading
```

### 3.3 测试要求

```
- 新增 service 必须有单元测试
- 关键业务流程（检品/贴标/箱管理）必须有集成测试
- 箱规校验必须有边界值测试
- API 端点必须有基本的请求/响应测试
```

## 4. 参考文档 / 参考文書

- [需求文档](./01-requirements.md)
- [设计文档](./02-design.md)
- [技术方案](./03-technical.md)
- [开发计划](./05-plan.md)
- [决策记录](./06-decisions.md)
