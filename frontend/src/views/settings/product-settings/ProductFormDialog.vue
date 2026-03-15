<template>
  <ODialog
    :open="dialogVisible"
    size="xl"
    @close="handleClose"
  >
    <template #title>
      {{ title }}
    </template>

    <div class="o-sheet-scroll">
      <div class="o-sheet">
        <!-- Top fields (2-column grid) -->
        <div class="o-top-fields">
          <div class="o-top-col">
            <!-- SKU -->
            <div class="o-field-row">
              <label class="o-field-label">{{ t('wms.product.skuCode', 'SKU管理番号') }} <span class="required-badge">{{ t('wms.common.required', '必須') }}</span></label>
              <div class="o-field-value">
                <input class="o-inline-input" :value="formData.sku" @input="(e: Event) => formData.sku = (e.target as HTMLInputElement).value" :placeholder="t('wms.product.skuPlaceholder', '半角英数字')" />
              </div>
            </div>
            <!-- 印刷用商品名 -->
            <div class="o-field-row">
              <label class="o-field-label">{{ t('wms.product.printName', '印刷用商品名') }} <span class="required-badge">{{ t('wms.common.required', '必須') }}</span></label>
              <div class="o-field-value">
                <input class="o-inline-input" :value="formData.name" @input="(e: Event) => formData.name = (e.target as HTMLInputElement).value" :placeholder="t('wms.product.printNamePlaceholder', '印刷に使用する商品名')" />
              </div>
            </div>
            <!-- 商品名 -->
            <div class="o-field-row">
              <label class="o-field-label">{{ t('wms.product.productName', '商品名') }}</label>
              <div class="o-field-value">
                <input class="o-inline-input" :value="formData.nameFull" @input="(e: Event) => formData.nameFull = (e.target as HTMLInputElement).value" :placeholder="t('wms.product.productNamePlaceholder', '正式商品名')" />
              </div>
            </div>
            <!-- クール区分 -->
            <div class="o-field-row">
              <label class="o-field-label">{{ t('wms.product.coolType', 'クール区分') }}</label>
              <div class="o-field-value">
                <select class="o-inline-input" :value="formData.coolType" @change="(e: Event) => formData.coolType = (e.target as HTMLSelectElement).value">
                  <option value="">{{ t('wms.common.pleaseSelect', '選択してください') }}</option>
                  <option v-for="opt in COOL_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
            </div>
            <!-- カテゴリー -->
            <div class="o-field-row">
              <label class="o-field-label">{{ t('wms.product.category', 'カテゴリー') }}</label>
              <div class="o-field-value">
                <select class="o-inline-input" :value="formData.category" @change="(e: Event) => formData.category = (e.target as HTMLSelectElement).value">
                  <option value="">{{ t('wms.common.pleaseSelect', '選択してください') }}</option>
                  <option v-for="opt in CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
            </div>
            <!-- JANコード / JAN码 -->
            <div class="o-field-row">
              <label class="o-field-label">JANコード</label>
              <div class="o-field-value">
                <input class="o-inline-input" :value="formData.janCode" @input="(e: Event) => formData.janCode = (e.target as HTMLInputElement).value" placeholder="4901234567890" />
              </div>
            </div>
            <!-- 仕入先コード / 仕入先代码 -->
            <div class="o-field-row">
              <label class="o-field-label">仕入先コード</label>
              <div class="o-field-value">
                <input class="o-inline-input" :value="formData.supplierCode" @input="(e: Event) => formData.supplierCode = (e.target as HTMLInputElement).value" placeholder="仕入先コード" />
              </div>
            </div>
          </div>
          <div class="o-top-col">
            <!-- メール便計算 -->
            <div class="o-field-row">
              <label class="o-field-label">{{ t('wms.product.mailCalc', 'メール便計算') }} <span class="required-badge">{{ t('wms.common.required', '必須') }}</span></label>
              <div class="o-field-value">
                <select class="o-inline-input" :value="String(formData.mailCalcEnabled)" @change="(e: Event) => formData.mailCalcEnabled = (e.target as HTMLSelectElement).value === 'true'">
                  <option value="false">{{ t('wms.common.disabled', 'しない') }}</option>
                  <option value="true">{{ t('wms.common.enabled', 'する') }}</option>
                </select>
              </div>
            </div>
            <!-- メール便最大数量 -->
            <div class="o-field-row">
              <label class="o-field-label">{{ t('wms.product.mailCalcMaxQty', 'メール便最大数量') }}</label>
              <div class="o-field-value">
                <input
                  class="o-inline-input"
                  type="number"
                  :value="formData.mailCalcMaxQuantity"
                  @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; formData.mailCalcMaxQuantity = v === '' ? undefined : Number(v) }"
                  :disabled="!formData.mailCalcEnabled"
                  :placeholder="formData.mailCalcEnabled ? t('wms.product.mailCalcMaxQtyPlaceholder', '最大数量を入力') : '-'"
                  :min="1"
                />
              </div>
            </div>
            <!-- 商品金額 -->
            <div class="o-field-row">
              <label class="o-field-label">{{ t('wms.product.price', '商品金額') }}</label>
              <div class="o-field-value">
                <input
                  class="o-inline-input"
                  type="number"
                  :value="formData.price"
                  @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; formData.price = v === '' ? undefined : Number(v) }"
                  :placeholder="t('wms.product.pricePlaceholder', '金額')"
                />
              </div>
            </div>
            <!-- 原価（仕入単価）/ 成本价（采购单价） -->
            <div class="o-field-row">
              <label class="o-field-label">原価（仕入単価）</label>
              <div class="o-field-value">
                <input
                  class="o-inline-input"
                  type="number"
                  :value="formData.costPrice"
                  @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; formData.costPrice = v === '' ? undefined : Number(v) }"
                  placeholder="仕入原価"
                  min="0"
                />
              </div>
            </div>
            <!-- メモ -->
            <div class="o-field-row">
              <label class="o-field-label">{{ t('wms.product.memo', 'メモ') }}</label>
              <div class="o-field-value">
                <input class="o-inline-input" :value="formData.memo" @input="(e: Event) => formData.memo = (e.target as HTMLInputElement).value" :placeholder="t('wms.product.memo', 'メモ')" />
              </div>
            </div>
            <!-- 在庫管理 -->
            <div class="o-field-row">
              <label class="o-field-label">{{ t('wms.product.inventoryManagement', '在庫管理') }}</label>
              <div class="o-field-value">
                <select class="o-inline-input" :value="String(formData.inventoryEnabled)" @change="(e: Event) => formData.inventoryEnabled = (e.target as HTMLSelectElement).value === 'true'">
                  <option value="false">{{ t('wms.common.disabled', 'しない') }}</option>
                  <option value="true">{{ t('wms.common.enabled', 'する') }}</option>
                </select>
              </div>
            </div>
            <!-- シリアルNo管理 -->
            <div class="o-field-row">
              <label class="o-field-label">{{ t('wms.product.serialTracking', 'シリアルNo管理') }}</label>
              <div class="o-field-value">
                <select class="o-inline-input" :value="String(formData.serialTrackingEnabled)" @change="(e: Event) => formData.serialTrackingEnabled = (e.target as HTMLSelectElement).value === 'true'">
                  <option value="false">{{ t('wms.common.disabled', 'しない') }}</option>
                  <option value="true">{{ t('wms.common.enabled', 'する') }}</option>
                </select>
              </div>
            </div>
            <!-- ロット管理 / 批次管理 -->
            <div class="o-field-row">
              <label class="o-field-label">ロット管理</label>
              <div class="o-field-value">
                <select class="o-inline-input" :value="String(formData.lotTrackingEnabled)" @change="(e: Event) => formData.lotTrackingEnabled = (e.target as HTMLSelectElement).value === 'true'">
                  <option value="false">しない</option>
                  <option value="true">する</option>
                </select>
              </div>
            </div>
            <!-- 賞味期限管理 / 保质期管理 -->
            <div class="o-field-row">
              <label class="o-field-label">賞味期限管理</label>
              <div class="o-field-value">
                <select class="o-inline-input" :value="String(formData.expiryTrackingEnabled)" @change="(e: Event) => formData.expiryTrackingEnabled = (e.target as HTMLSelectElement).value === 'true'">
                  <option value="false">しない</option>
                  <option value="true">する</option>
                </select>
              </div>
            </div>
            <!-- 安全在庫数 / 安全库存 -->
            <div class="o-field-row">
              <label class="o-field-label">安全在庫数</label>
              <div class="o-field-value">
                <input class="o-inline-input" type="number" :value="formData.safetyStock" @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; formData.safetyStock = v === '' ? undefined : Number(v) }" placeholder="最小在庫数" min="0" />
              </div>
            </div>
          </div>
        </div>

        <!-- Notebook tabs -->
        <div class="o-notebook">
          <div class="o-notebook-tabs">
            <button :class="{ active: activeTab === 'barcode' }" @click="activeTab = 'barcode'">{{ t('wms.product.tabBarcode', '検品コード') }}</button>
            <button :class="{ active: activeTab === 'handling' }" @click="activeTab = 'handling'">{{ t('wms.product.tabHandling', '荷扱い') }}</button>
            <button :class="{ active: activeTab === 'image' }" @click="activeTab = 'image'">{{ t('wms.product.tabImage', '商品画像') }}</button>
            <button :class="{ active: activeTab === 'subsku' }" @click="activeTab = 'subsku'">
              {{ t('wms.product.tabSubSku', '子SKU') }}
              <span v-if="editDialogSubSkus.length > 0" class="o-tab-count-badge">{{ editDialogSubSkus.length }}</span>
            </button>
            <button :class="{ active: activeTab === 'dimensions' }" @click="activeTab = 'dimensions'">{{ t('wms.product.tabDimensions', '物流情報') }}</button>
            <button :class="{ active: activeTab === 'custom' }" @click="activeTab = 'custom'">{{ t('wms.product.tabCustomFields', '独自フィールド') }}</button>
            <button :class="{ active: activeTab === 'advanced' }" @click="activeTab = 'advanced'">{{ t('wms.product.tabAdvanced', '詳細設定') }}</button>
          </div>

          <div class="o-notebook-page">
            <!-- 検品コード tab -->
            <template v-if="activeTab === 'barcode'">
              <table class="o-lines-table">
                <thead>
                  <tr>
                    <th>{{ t('wms.product.barcode', 'バーコード') }}</th>
                    <th style="width:50px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in barcodeArray" :key="index">
                    <td>
                      <input class="o-inline-input" :value="item" @input="(e: Event) => updateBarcode(index, (e.target as HTMLInputElement).value)" :placeholder="t('wms.product.barcodePlaceholder', 'バーコードを入力')" />
                    </td>
                    <td style="text-align:center;">
                      <OButton variant="icon-danger" @click="removeBarcode(index)" :title="t('wms.common.delete', '削除')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </OButton>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2">
                      <button class="o-add-line-btn" @click="addBarcode">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/></svg>
                        {{ t('wms.product.addBarcode', 'バーコードを追加') }}
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </template>

            <!-- 荷扱い tab -->
            <template v-if="activeTab === 'handling'">
              <table class="o-lines-table">
                <thead>
                  <tr>
                    <th>{{ t('wms.product.handlingType', '荷扱い区分') }}</th>
                    <th style="width:50px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in handlingTypesArray" :key="index">
                    <td>
                      <input class="o-inline-input" :value="item" @input="(e: Event) => updateHandlingType(index, (e.target as HTMLInputElement).value)" :placeholder="t('wms.product.handlingTypePlaceholder', '荷扱い区分を入力')" />
                    </td>
                    <td style="text-align:center;">
                      <OButton variant="icon-danger" @click="removeHandlingType(index)" :title="t('wms.common.delete', '削除')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </OButton>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2">
                      <button class="o-add-line-btn" @click="addHandlingType">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/></svg>
                        {{ t('wms.product.addHandling', '荷扱いを追加') }}
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </template>

            <!-- 商品画像 tab -->
            <template v-if="activeTab === 'image'">
              <ProductImageUpload
                ref="imageUploadRef"
                :image-url="editImageUrl"
                @update:image-url="editImageUrl = $event"
              />
            </template>

            <!-- 子SKU tab -->
            <template v-if="activeTab === 'subsku'">
              <SubSkuInlineEditor
                :sub-skus="editDialogSubSkus"
                :validation-errors="editDialogSubSkuValidationErrors"
                @add="$emit('add-sub-sku')"
                @remove="(i) => $emit('remove-sub-sku', i)"
                @validate="(i) => $emit('validate-sub-sku', i)"
              />
            </template>

            <!-- 寸法・重量 tab -->
            <template v-if="activeTab === 'dimensions'">
              <div class="o-tab-fields">
                <div class="o-field-row">
                  <label class="o-field-label">{{ t('wms.product.width', '幅') }} (mm)</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" type="number" :value="formData.width" @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; formData.width = v === '' ? undefined : Number(v) }" :placeholder="t('wms.product.width', '幅')" min="0" step="0.1" />
                  </div>
                </div>
                <div class="o-field-row">
                  <label class="o-field-label">{{ t('wms.product.depth', '奥行') }} (mm)</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" type="number" :value="formData.depth" @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; formData.depth = v === '' ? undefined : Number(v) }" :placeholder="t('wms.product.depth', '奥行')" min="0" step="0.1" />
                  </div>
                </div>
                <div class="o-field-row">
                  <label class="o-field-label">{{ t('wms.product.height', '高さ') }} (mm)</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" type="number" :value="formData.height" @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; formData.height = v === '' ? undefined : Number(v) }" :placeholder="t('wms.product.height', '高さ')" min="0" step="0.1" />
                  </div>
                </div>
                <div class="o-field-row">
                  <label class="o-field-label">{{ t('wms.product.weight', '重量') }} (g)</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" type="number" :value="formData.weight" @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; formData.weight = v === '' ? undefined : Number(v) }" :placeholder="t('wms.product.weight', '重量')" min="0" step="0.1" />
                  </div>
                </div>
                <div class="o-field-row">
                  <label class="o-field-label">箱入数 (ケース)</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" type="number" :value="formData.caseQuantity" @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; formData.caseQuantity = v === '' ? undefined : Number(v) }" placeholder="1ケースあたりの個数" min="1" />
                  </div>
                </div>
                <!-- デフォルト荷扱い / 默认荷扱い -->
                <div class="o-field-row">
                  <label class="o-field-label">デフォルト荷扱い</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" :value="(formData.defaultHandlingTags || []).join(', ')" @input="(e: Event) => formData.defaultHandlingTags = (e.target as HTMLInputElement).value.split(',').map((s: string) => s.trim()).filter(Boolean)" placeholder="ワレモノ, 天地無用" />
                    <div style="font-size:11px;color:#909399;margin-top:2px;">カンマ区切りで入力</div>
                  </div>
                </div>
                <!-- 賞味期限アラート日数 / 保质期预警天数 -->
                <div class="o-field-row" v-if="formData.expiryTrackingEnabled">
                  <label class="o-field-label">期限アラート日数</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" type="number" :value="formData.alertDaysBeforeExpiry" @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; formData.alertDaysBeforeExpiry = v === '' ? undefined : Number(v) }" placeholder="期限切れの何日前に警告" min="1" />
                  </div>
                </div>
                <!-- FBA設定 / FBA设置 -->
                <div class="o-field-row">
                  <label class="o-field-label">FBA対応</label>
                  <div class="o-field-value">
                    <select class="o-inline-input" :value="String(formData.fbaEnabled)" @change="(e: Event) => formData.fbaEnabled = (e.target as HTMLSelectElement).value === 'true'">
                      <option value="false">しない</option>
                      <option value="true">する</option>
                    </select>
                  </div>
                </div>
                <template v-if="formData.fbaEnabled">
                  <div class="o-field-row">
                    <label class="o-field-label">FNSKU</label>
                    <div class="o-field-value">
                      <input class="o-inline-input" :value="formData.fnsku" @input="(e: Event) => formData.fnsku = (e.target as HTMLInputElement).value" placeholder="X00XXXXXXX" />
                    </div>
                  </div>
                  <div class="o-field-row">
                    <label class="o-field-label">ASIN</label>
                    <div class="o-field-value">
                      <input class="o-inline-input" :value="formData.asin" @input="(e: Event) => formData.asin = (e.target as HTMLInputElement).value" placeholder="B0XXXXXXXX" />
                    </div>
                  </div>
                  <div class="o-field-row">
                    <label class="o-field-label">Amazon出品者SKU</label>
                    <div class="o-field-value">
                      <input class="o-inline-input" :value="formData.amazonSku" @input="(e: Event) => formData.amazonSku = (e.target as HTMLInputElement).value" />
                    </div>
                  </div>
                </template>
              </div>
            </template>

            <!-- 独自フィールド tab -->
            <template v-if="activeTab === 'custom'">
              <div class="o-tab-fields">
                <div class="o-field-row">
                  <label class="o-field-label">{{ t('wms.product.customField1', '独自フィールド1') }}</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" :value="formData.customField1" @input="(e: Event) => formData.customField1 = (e.target as HTMLInputElement).value" :placeholder="t('wms.product.customField1', '独自フィールド1')" />
                  </div>
                </div>
                <div class="o-field-row">
                  <label class="o-field-label">{{ t('wms.product.customField2', '独自フィールド2') }}</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" :value="formData.customField2" @input="(e: Event) => formData.customField2 = (e.target as HTMLInputElement).value" :placeholder="t('wms.product.customField2', '独自フィールド2')" />
                  </div>
                </div>
                <div class="o-field-row">
                  <label class="o-field-label">{{ t('wms.product.customField3', '独自フィールド3') }}</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" :value="formData.customField3" @input="(e: Event) => formData.customField3 = (e.target as HTMLInputElement).value" :placeholder="t('wms.product.customField3', '独自フィールド3')" />
                  </div>
                </div>
                <div class="o-field-row">
                  <label class="o-field-label">{{ t('wms.product.customField4', '独自フィールド4') }}</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" :value="formData.customField4" @input="(e: Event) => formData.customField4 = (e.target as HTMLInputElement).value" :placeholder="t('wms.product.customField4', '独自フィールド4')" />
                  </div>
                </div>
              </div>
              <!-- 動的カスタムフィールド / 动态自定义字段 -->
              <OCustomFields
                entity-type="product"
                :model-value="formData.customFields ?? {}"
                @update:model-value="(v: Record<string, unknown>) => formData.customFields = v"
              />
            </template>

            <!-- 詳細設定 tab -->
            <template v-if="activeTab === 'advanced'">
              <div class="o-tab-fields">
                <div class="o-field-row">
                  <label class="o-field-label">{{ t('wms.product.nameEn', '英語商品名') }}</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" :value="formData.nameEn" @input="(e: Event) => formData.nameEn = (e.target as HTMLInputElement).value" :placeholder="t('wms.product.nameEnPlaceholder', 'English product name')" />
                  </div>
                </div>
                <div class="o-field-row">
                  <label class="o-field-label">{{ t('wms.product.countryOfOrigin', '原産国') }}</label>
                  <div class="o-field-value">
                    <input class="o-inline-input" :value="formData.countryOfOrigin" @input="(e: Event) => formData.countryOfOrigin = (e.target as HTMLInputElement).value" :placeholder="t('wms.product.countryOfOriginPlaceholder', '例: 日本、中国、アメリカ')" />
                  </div>
                </div>
                <div class="o-field-row">
                  <label class="o-field-label">{{ t('wms.product.allocationRule', '引当規則') }}</label>
                  <div class="o-field-value">
                    <select class="o-inline-input" :value="formData.allocationRule" @change="(e: Event) => formData.allocationRule = (e.target as HTMLSelectElement).value">
                      <option v-for="opt in ALLOCATION_RULE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                </div>
                <div class="o-field-row">
                  <label class="o-field-label">{{ t('wms.product.inboundExpiryDays', '入庫期限日数') }}</label>
                  <div class="o-field-value">
                    <input
                      class="o-inline-input"
                      type="number"
                      :value="formData.inboundExpiryDays"
                      @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; formData.inboundExpiryDays = v === '' ? undefined : Number(v) }"
                      :placeholder="t('wms.product.inboundExpiryDaysPlaceholder', '残り日数がこの値未満なら警告')"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="o-form-footer">
        <OButton type="button" variant="secondary" @click="handleClose">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
        <OButton
          type="button"
          variant="primary"
          @click="handleSubmit"
          :disabled="submitting"
        >
          <span v-if="submitting" class="spinner"></span>
          {{ isEditing ? t('wms.common.update', '更新') : t('wms.product.register', '登録') }}
        </OButton>
      </div>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import ProductImageUpload from './ProductImageUpload.vue'
import SubSkuInlineEditor from './SubSkuInlineEditor.vue'
import OCustomFields from '@/components/odoo/OCustomFields.vue'
import type { SubSku } from '@/types/product'

const COOL_TYPE_OPTIONS = computed(() => [
  { label: t('wms.product.coolTypeNormal', '通常'), value: '0' },
  { label: t('wms.product.coolTypeFrozen', 'クール冷凍'), value: '1' },
  { label: t('wms.product.coolTypeChilled', 'クール冷蔵'), value: '2' },
])

const CATEGORY_OPTIONS = computed(() => [
  { label: t('wms.product.categoryProduct', '商品'), value: '0' },
  { label: t('wms.product.categoryConsumable', '消耗品'), value: '1' },
  { label: t('wms.product.categoryWork', '作業'), value: '2' },
  { label: t('wms.product.categoryBonus', 'おまけ'), value: '3' },
  { label: t('wms.product.categoryMaterial', '部材'), value: '4' },
])

const ALLOCATION_RULE_OPTIONS = computed(() => [
  { label: t('wms.product.allocationFIFO', 'FIFO (先入先出)'), value: 'FIFO' },
  { label: t('wms.product.allocationFEFO', 'FEFO (先期限先出)'), value: 'FEFO' },
  { label: t('wms.product.allocationLIFO', 'LIFO (後入先出)'), value: 'LIFO' },
])

interface Props {
  modelValue: boolean
  title?: string
  isEditing?: boolean
  initialData?: Record<string, any>
  editDialogSubSkus: SubSku[]
  editDialogSubSkuValidationErrors: Record<number, string>
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  isEditing: false,
  initialData: () => ({}),
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: Record<string, any>, imageUrl: string): void
  (e: 'add-sub-sku'): void
  (e: 'remove-sub-sku', index: number): void
  (e: 'validate-sub-sku', index: number): void
}>()

const { show: showToast } = useToast()
const { t } = useI18n()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const submitting = ref(false)
const activeTab = ref('barcode')
const editImageUrl = ref('')
const imageUploadRef = ref<InstanceType<typeof ProductImageUpload> | null>(null)

const formData = ref<Record<string, any>>({})

// Barcode array management
const barcodeArray = computed(() => {
  const val = formData.value.barcode
  return Array.isArray(val) ? val : []
})

const updateBarcode = (index: number, value: string) => {
  const arr = [...barcodeArray.value]
  arr[index] = value
  formData.value.barcode = arr
}

const removeBarcode = (index: number) => {
  const arr = [...barcodeArray.value]
  arr.splice(index, 1)
  formData.value.barcode = arr
}

const addBarcode = () => {
  formData.value.barcode = [...barcodeArray.value, '']
}

// HandlingTypes array management
const handlingTypesArray = computed(() => {
  const val = formData.value.handlingTypes
  return Array.isArray(val) ? val : []
})

const updateHandlingType = (index: number, value: string) => {
  const arr = [...handlingTypesArray.value]
  arr[index] = value
  formData.value.handlingTypes = arr
}

const removeHandlingType = (index: number) => {
  const arr = [...handlingTypesArray.value]
  arr.splice(index, 1)
  formData.value.handlingTypes = arr
}

const addHandlingType = () => {
  formData.value.handlingTypes = [...handlingTypesArray.value, '']
}

// Init form when dialog opens
watch(
  [() => props.modelValue, () => props.initialData],
  ([isOpen]) => {
    if (isOpen) {
      const d = props.initialData || {}
      formData.value = {
        sku: d.sku || '',
        name: d.name || '',
        nameFull: d.nameFull || '',
        coolType: d.coolType || '',
        category: d.category || '',
        mailCalcEnabled: d.mailCalcEnabled ?? false,
        mailCalcMaxQuantity: d.mailCalcMaxQuantity ?? undefined,
        price: d.price ?? undefined,
        costPrice: d.costPrice ?? undefined,
        memo: d.memo || '',
        barcode: Array.isArray(d.barcode) ? [...d.barcode] : [],
        handlingTypes: Array.isArray(d.handlingTypes) ? [...d.handlingTypes] : [],
        inventoryEnabled: d.inventoryEnabled ?? false,
        customField1: d.customField1 || '',
        customField2: d.customField2 || '',
        customField3: d.customField3 || '',
        customField4: d.customField4 || '',
        customFields: d.customFields && typeof d.customFields === 'object' ? { ...d.customFields } : {},
        width: d.width ?? undefined,
        depth: d.depth ?? undefined,
        height: d.height ?? undefined,
        weight: d.weight ?? undefined,
        nameEn: d.nameEn || '',
        countryOfOrigin: d.countryOfOrigin || '',
        allocationRule: d.allocationRule || 'FIFO',
        serialTrackingEnabled: d.serialTrackingEnabled ?? false,
        inboundExpiryDays: d.inboundExpiryDays ?? undefined,
        janCode: d.janCode || '',
        supplierCode: d.supplierCode || '',
        caseQuantity: d.caseQuantity ?? undefined,
        defaultHandlingTags: Array.isArray(d.defaultHandlingTags) ? [...d.defaultHandlingTags] : [],
        lotTrackingEnabled: d.lotTrackingEnabled ?? false,
        expiryTrackingEnabled: d.expiryTrackingEnabled ?? false,
        safetyStock: d.safetyStock ?? undefined,
        alertDaysBeforeExpiry: d.alertDaysBeforeExpiry ?? undefined,
        fbaEnabled: d.fbaEnabled ?? false,
        fnsku: d.fnsku || '',
        asin: d.asin || '',
        amazonSku: d.amazonSku || '',
      }
      editImageUrl.value = d.imageUrl || ''
      activeTab.value = 'barcode'
    }
  },
  { immediate: true, deep: true },
)

const handleClose = () => {
  dialogVisible.value = false
}

const handleSubmit = () => {
  // Basic validation
  const errors: string[] = []
  if (!formData.value.sku?.trim()) errors.push(t('wms.product.validationSkuRequired', 'SKU管理番号は必須です'))
  if (!formData.value.name?.trim()) errors.push(t('wms.product.validationNameRequired', '印刷用商品名は必須です'))
  if (formData.value.mailCalcEnabled && !formData.value.mailCalcMaxQuantity) {
    errors.push(t('wms.product.validationMailCalcMaxQty', 'メール便計算が有効の場合、最大数量は必須です'))
  }

  if (errors.length > 0) {
    showToast(errors.join('\n'), 'danger')
    return
  }

  emit('submit', { ...formData.value }, editImageUrl.value)
}

const resetImageUpload = () => {
  imageUploadRef.value?.resetUrlInput()
}

defineExpose({ resetImageUpload, submitting })
</script>

<style scoped>
.o-sheet-scroll {
  height: 70vh;
  overflow-y: auto;
}

.o-sheet {
  padding: 1.5rem 0;
}

/* Top fields 2-column */
.o-top-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 3rem;
  margin-bottom: 1.5rem;
}

.o-top-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.o-field-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.o-field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-600, #606266);
  width: 140px;
  min-width: 140px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.o-field-value {
  flex: 1;
  min-width: 0;
}

.o-inline-input {
  width: 100%;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 13px;
  color: var(--o-gray-900, #212529);
  background: var(--o-view-background, #fff);
  outline: none;
}

.o-inline-input:focus {
  border-color: var(--o-brand-primary, #0052A3);
  box-shadow: 0 0 0 2px rgba(113, 75, 103, 0.12);
}

.o-inline-input:disabled {
  background: var(--o-gray-100, #f8f9fa);
  color: var(--o-gray-500, #909399);
}

select.o-inline-input {
  cursor: pointer;
}

.required-badge {
  display: inline-block;
  background: #dc3545;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
}

/* Notebook */
.o-notebook { margin-top: 0; }

.o-notebook-tabs {
  display: flex;
  border-bottom: 2px solid var(--o-border-color, #d6d6d6);
  margin-bottom: 0;
}

.o-notebook-tabs button {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-600, #606266);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.o-notebook-tabs button:hover { color: var(--o-gray-900, #212529); }
.o-notebook-tabs button.active {
  color: var(--o-brand-primary, #0052A3);
  border-bottom-color: var(--o-brand-primary, #0052A3);
}

.o-tab-count-badge {
  display: inline-block;
  background: var(--o-brand-primary, #0052A3);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.3;
}

.o-notebook-page { padding: 1rem 0; min-height: 220px; }

.o-tab-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 500px;
}

/* Lines table */
.o-lines-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.5rem;
}

.o-lines-table th {
  padding: 0.5rem 0.625rem;
  font-size: 12px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
  border-bottom: 2px solid var(--o-border-color, #d6d6d6);
  text-align: left;
}

.o-lines-table td {
  padding: 0.375rem 0.5rem;
  border-bottom: 1px solid var(--o-gray-200, #e5e5e5);
}

.o-lines-table tbody tr:hover {
  background: var(--o-gray-50, #f8f9fa);
}

.o-add-line-btn {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: none;
  border: 1px dashed #999;
  border-radius: var(--o-border-radius, 4px);
  color: var(--o-brand-primary, #0052A3);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.o-add-line-btn:hover {
  border-color: var(--o-brand-primary, #0052A3);
  background: rgba(113, 75, 103, 0.04);
}

/* Footer */
.o-form-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 6px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
