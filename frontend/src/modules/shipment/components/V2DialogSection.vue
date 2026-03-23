<template>
  <!-- Edit Dialog -->
  <ShipmentOrderEditDialog
    :model-value="showEditDialog"
    :title="editingRow ? '出荷指示を編集' : '出荷指示個別登録'"
    :columns="formColumns"
    :initial-data="editingRow || {}"
    allow-invalid-submit
    @update:model-value="$emit('update:showEditDialog', $event)"
    @submit="$emit('form-submit', $event)"
  />

  <!-- Import Dialog -->
  <ShipmentOrderImportDialog
    :model-value="showImportDialog"
    :order-source-companies="orderSourceCompanies"
    :carriers="carriers"
    default-file-encoding="shift_jis"
    @update:model-value="$emit('update:showImportDialog', $event)"
    @import="$emit('import', $event)"
  />

  <!-- Carrier Import Dialog -->
  <CarrierImportDialog
    :model-value="showCarrierImportDialog"
    @update:model-value="$emit('update:showCarrierImportDialog', $event)"
    @imported="$emit('carrier-imported')"
  />

  <!-- B2 Cloud validate dialog -->
  <YamatoB2ValidateResultDialog
    :model-value="b2ValidateDialogVisible"
    :result="b2ValidateResult"
    :order-map="b2ValidateOrderMap"
    confirm-button-text="出荷指示を確定"
    @update:model-value="$emit('update:b2ValidateDialogVisible', $event)"
    @cancel="$emit('b2-validate-cancel')"
    @confirm="$emit('b2-validate-confirm')"
  />

  <!-- B2 Cloud API error dialog -->
  <YamatoB2ApiErrorDialog
    :model-value="b2ApiErrorDialogVisible"
    :error-message="b2ApiErrorMessage"
    @update:model-value="$emit('update:b2ApiErrorDialogVisible', $event)"
  />

  <!-- B2 Cloud export result dialog -->
  <YamatoB2ExportResultDialog
    :model-value="b2ExportResultDialogVisible"
    :result="b2ExportResult"
    @update:model-value="$emit('update:b2ExportResultDialogVisible', $event)"
    @confirm="$emit('b2-export-result-close')"
  />

  <!-- Bundle Filter Dialog -->
  <BundleFilterDialog
    :model-value="showBundleFilterDialog"
    :fields="bundleFilterFields"
    :selected-keys="bundleFilterKeys"
    @update:model-value="$emit('update:showBundleFilterDialog', $event)"
    @update:selected-keys="$emit('bundle-filter-update', $event)"
    @save="$emit('bundle-filter-save', $event)"
  />

  <!-- Carrier Export Dialog -->
  <CarrierExportResultDialog
    :model-value="carrierExportDialogVisible"
    :carrier-label="carrierExportCarrierLabel"
    :mapping-options="carrierExportMappingOptions"
    :selected-mapping-id="carrierExportSelectedMappingId"
    :headers="carrierExportHeaders"
    :rows="carrierExportOutputRows"
    :file-name-base="carrierExportFileNameBase"
    @update:model-value="$emit('update:carrierExportDialogVisible', $event)"
    @update:selected-mapping-id="$emit('update:carrierExportSelectedMappingId', $event)"
  />

  <!-- 出荷予定日一括設定 -->
  <el-dialog :model-value="shipPlanDateDialogVisible" title="出荷予定日一括設定" width="400" @update:model-value="$emit('update:shipPlanDateDialogVisible', $event)">
    <div style="padding: 8px 0;">
      <el-tag type="info" size="small" style="margin-bottom: 12px;">対象 {{ selectedCount }} 件</el-tag>
      <el-form label-width="100px">
        <el-form-item label="出荷予定日">
          <el-date-picker
            :model-value="shipPlanDateSelected"
            type="date"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            placeholder="日付を選択"
            :disabled-date="(d: Date) => d < new Date(new Date().setHours(0,0,0,0))"
            style="width: 100%"
            @update:model-value="$emit('update:shipPlanDateSelected', $event)"
          />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="$emit('update:shipPlanDateDialogVisible', false)">キャンセル</el-button>
      <el-button type="primary" @click="$emit('apply-ship-plan-date')">適用</el-button>
    </template>
  </el-dialog>

  <!-- ご依頼主一括設定 -->
  <el-dialog :model-value="senderBulkDialogVisible" title="ご依頼主情報の一括設定" width="400" @update:model-value="$emit('update:senderBulkDialogVisible', $event)">
    <div style="padding: 8px 0;">
      <el-tag type="info" size="small" style="margin-bottom: 12px;">対象 {{ selectedCount }} 件</el-tag>
      <el-form label-width="100px">
        <el-form-item label="ご依頼主">
          <el-select :model-value="senderBulkCompanyId" placeholder="ご依頼主を選択" style="width: 100%" @update:model-value="$emit('update:senderBulkCompanyId', $event)">
            <el-option v-for="company in orderSourceCompanies" :key="company._id" :label="company.senderName" :value="company._id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox :model-value="senderBulkOverwrite" @update:model-value="$emit('update:senderBulkOverwrite', $event)">上書きする</el-checkbox>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="$emit('update:senderBulkDialogVisible', false)">キャンセル</el-button>
      <el-button type="primary" @click="$emit('apply-sender-bulk')">適用</el-button>
    </template>
  </el-dialog>

  <!-- 配送業者一括設定 -->
  <el-dialog :model-value="carrierBulkDialogVisible" title="配送業者一括設定" width="400" @update:model-value="$emit('update:carrierBulkDialogVisible', $event)">
    <div style="padding: 8px 0;">
      <el-tag type="info" size="small" style="margin-bottom: 12px;">対象 {{ selectedCount }} 件</el-tag>
      <el-form label-width="100px">
        <el-form-item label="配送業者">
          <el-select :model-value="carrierBulkId" placeholder="配送業者を選択" style="width: 100%" @update:model-value="$emit('update:carrierBulkId', $event)">
            <el-option v-for="c in carriers" :key="c._id" :label="c.name" :value="c._id" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="$emit('update:carrierBulkDialogVisible', false)">キャンセル</el-button>
      <el-button type="primary" @click="$emit('apply-carrier-bulk')">適用</el-button>
    </template>
  </el-dialog>

  <!-- Delete Confirmation -->
  <el-dialog :model-value="deleteDialogVisible" title="削除確認" width="420" :close-on-click-modal="false" @update:model-value="$emit('update:deleteDialogVisible', $event)">
    <div style="text-align: center; padding: 20px 0;">
      <el-icon :size="48" color="#f56c6c"><WarningFilled /></el-icon>
      <p style="margin-top: 12px; font-size: 15px;">{{ deleteDialogMessage }}</p>
      <p style="color: #909399; font-size: 13px;">この操作は元に戻せません。</p>
    </div>
    <template #footer>
      <el-button @click="$emit('update:deleteDialogVisible', false)">キャンセル</el-button>
      <el-button type="danger" @click="$emit('confirm-delete')">削除する</el-button>
    </template>
  </el-dialog>

  <!-- Submit Error Dialog -->
  <el-dialog :model-value="submitErrorDialogVisible" title="エラー詳細" width="600" @update:model-value="$emit('update:submitErrorDialogVisible', $event)">
    <div v-if="submitErrors.length === 0" style="color: #909399;">エラーはありません。</div>
    <div v-else>
      <p style="margin-bottom: 12px;">エラー件数: <strong>{{ submitErrors.length }}</strong></p>
      <el-table :data="submitErrors" max-height="300" border size="small">
        <el-table-column label="行" width="80">
          <template #default="{ row, $index }">{{ row.clientId?.startsWith('temp-') ? `#${$index + 1}` : (row.clientId || '-') }}</template>
        </el-table-column>
        <el-table-column prop="field" label="フィールド" width="120" />
        <el-table-column prop="message" label="エラー内容" />
      </el-table>
    </div>
    <template #footer>
      <el-button @click="$emit('update:submitErrorDialogVisible', false)">閉じる</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import ShipmentOrderEditDialog from '@/components/form/ShipmentOrderEditDialog.vue'
import ShipmentOrderImportDialog from '@/components/import/ShipmentOrderImportDialog.vue'
import CarrierImportDialog from '@/components/import/CarrierImportDialog.vue'
import YamatoB2ValidateResultDialog from '@/components/carrier-automation/YamatoB2ValidateResultDialog.vue'
import YamatoB2ExportResultDialog from '@/components/carrier-automation/YamatoB2ExportResultDialog.vue'
import YamatoB2ApiErrorDialog from '@/components/carrier-automation/YamatoB2ApiErrorDialog.vue'
import CarrierExportResultDialog from '@/components/waybill-management/CarrierExportResultDialog.vue'
import BundleFilterDialog from '@/components/bundle/BundleFilterDialog.vue'
import type { Carrier } from '@/types/carrier'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import type { YamatoB2ValidateResult, YamatoB2ExportResult } from '@/types/carrierAutomation'

defineProps<{
  showEditDialog: boolean
  editingRow: any
  formColumns: any[]
  showImportDialog: boolean
  orderSourceCompanies: OrderSourceCompany[]
  carriers: Carrier[]
  showCarrierImportDialog: boolean
  b2ValidateDialogVisible: boolean
  b2ValidateResult: YamatoB2ValidateResult | null
  b2ValidateOrderMap: Map<number, string>
  b2ApiErrorDialogVisible: boolean
  b2ApiErrorMessage: string
  b2ExportResultDialogVisible: boolean
  b2ExportResult: YamatoB2ExportResult | null
  showBundleFilterDialog: boolean
  bundleFilterFields: any[]
  bundleFilterKeys: string[]
  carrierExportDialogVisible: boolean
  carrierExportCarrierLabel: string
  carrierExportMappingOptions: Array<{ label: string; value: string }>
  carrierExportSelectedMappingId: string
  carrierExportHeaders: string[]
  carrierExportOutputRows: Array<Record<string, any>>
  carrierExportFileNameBase: string
  shipPlanDateDialogVisible: boolean
  shipPlanDateSelected: string
  senderBulkDialogVisible: boolean
  senderBulkCompanyId: string
  senderBulkOverwrite: boolean
  carrierBulkDialogVisible: boolean
  carrierBulkId: string
  deleteDialogVisible: boolean
  deleteDialogMessage: string
  submitErrorDialogVisible: boolean
  submitErrors: Array<{ clientId?: string; field?: string; message: string }>
  selectedCount: number
}>()

defineEmits<{
  'update:showEditDialog': [v: boolean]
  'form-submit': [data: Record<string, any>]
  'update:showImportDialog': [v: boolean]
  'import': [rows: any[]]
  'update:showCarrierImportDialog': [v: boolean]
  'carrier-imported': []
  'update:b2ValidateDialogVisible': [v: boolean]
  'b2-validate-cancel': []
  'b2-validate-confirm': []
  'update:b2ApiErrorDialogVisible': [v: boolean]
  'update:b2ExportResultDialogVisible': [v: boolean]
  'b2-export-result-close': []
  'update:showBundleFilterDialog': [v: boolean]
  'bundle-filter-update': [keys: string[]]
  'bundle-filter-save': [keys: string[]]
  'update:carrierExportDialogVisible': [v: boolean]
  'update:carrierExportSelectedMappingId': [id: string]
  'update:shipPlanDateDialogVisible': [v: boolean]
  'update:shipPlanDateSelected': [v: string]
  'apply-ship-plan-date': []
  'update:senderBulkDialogVisible': [v: boolean]
  'update:senderBulkCompanyId': [v: string]
  'update:senderBulkOverwrite': [v: boolean]
  'apply-sender-bulk': []
  'update:carrierBulkDialogVisible': [v: boolean]
  'update:carrierBulkId': [v: string]
  'apply-carrier-bulk': []
  'update:deleteDialogVisible': [v: boolean]
  'confirm-delete': []
  'update:submitErrorDialogVisible': [v: boolean]
}>()
</script>
