<template>
  <div class="form-template-editor">
    <div class="page-header">
      <div>
        <h1 class="page-title">帳票テンプレート編集</h1>
        <p class="page-subtitle">{{ template?.name || '読み込み中...' }}</p>
      </div>
      <div class="header-actions">
        <el-button @click="handlePreview" :loading="previewing">プレビュー</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
        <el-button @click="handleBack">戻る</el-button>
      </div>
    </div>

    <div v-if="template" class="editor-content">
      <div class="editor-layout">
        <div class="editor-left">
          <el-tabs v-model="activeTab" type="border-card">
        <!-- 基本設定 -->
        <el-tab-pane label="基本設定" name="basic">
          <div class="settings-section">
            <h3 class="section-title">基本設定</h3>
            <el-form :model="template" label-width="140px" label-position="left">
              <el-form-item label="テンプレート名">
                <el-input v-model="template.name" placeholder="例：ピッキングリスト" />
              </el-form-item>
              <el-form-item label="種類">
                <el-select v-model="template.targetType" disabled style="width: 100%">
                  <el-option
                    v-for="t in formTypeRegistry"
                    :key="t.type"
                    :label="t.label"
                    :value="t.type"
                  />
                </el-select>
                <div class="hint">種類は作成時に設定され、変更できません</div>
              </el-form-item>
              <el-form-item label="デフォルト">
                <el-switch v-model="template.isDefault" />
                <div class="hint">この種類のデフォルトテンプレートとして使用</div>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 用紙設定 -->
        <el-tab-pane label="用紙設定" name="page">
          <div class="settings-section">
            <h3 class="section-title">用紙設定</h3>
            <el-form :model="template" label-width="140px" label-position="left">
              <el-form-item label="用紙サイズ">
                <el-radio-group v-model="template.pageSize">
                  <el-radio value="A4">A4</el-radio>
                  <el-radio value="A3">A3</el-radio>
                  <el-radio value="B4">B4</el-radio>
                  <el-radio value="LETTER">Letter</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="印刷向き">
                <el-radio-group v-model="template.pageOrientation">
                  <el-radio value="portrait">縦 (portrait)</el-radio>
                  <el-radio value="landscape">横 (landscape)</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="余白 (pt)">
                <div class="margin-inputs">
                  <div class="margin-input">
                    <span>左</span>
                    <el-input-number v-model="template.pageMargins[0]" :min="0" :max="200" size="small" />
                  </div>
                  <div class="margin-input">
                    <span>上</span>
                    <el-input-number v-model="template.pageMargins[1]" :min="0" :max="200" size="small" />
                  </div>
                  <div class="margin-input">
                    <span>右</span>
                    <el-input-number v-model="template.pageMargins[2]" :min="0" :max="200" size="small" />
                  </div>
                  <div class="margin-input">
                    <span>下</span>
                    <el-input-number v-model="template.pageMargins[3]" :min="0" :max="200" size="small" />
                  </div>
                </div>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- ヘッダー・フッター -->
        <el-tab-pane label="ヘッダー・フッター" name="header-footer">
          <div class="settings-section">
            <div class="section-header">
              <h3 class="section-title">ヘッダー・フッター項目</h3>
              <el-button type="primary" size="small" @click="addHeaderFooterItem">
                <el-icon><Plus /></el-icon>
                追加
              </el-button>
            </div>
            <p class="section-hint">
              ヘッダー、フッター、またはドキュメントタイトルを自由に追加できます。
              <br />
              <span class="hint-sub" v-pre>利用可能な変数: {{date}}, {{time}}, {{datetime}}, {{page}}, {{pages}}</span>
            </p>

            <div v-if="!template.headerFooterItems?.length" class="empty-columns">
              <el-empty description="項目が設定されていません">
                <el-button type="primary" @click="addHeaderFooterItem">
                  <el-icon><Plus /></el-icon>
                  項目を追加
                </el-button>
              </el-empty>
            </div>

            <div v-else class="hf-item-list">
              <div
                v-for="(item, index) in template.headerFooterItems"
                :key="item.id"
                class="hf-item-card"
              >
                <div class="hf-item-header">
                  <div class="hf-header-left">
                    <span class="hf-number">#{{ index + 1 }}</span>
                    <el-tag :type="getPositionTagType(item.position)" size="small">
                      {{ getPositionLabel(item.position) }}
                    </el-tag>
                    <el-tag type="info" size="small">{{ getTypeLabel(item.type) }}</el-tag>
                    <el-tag v-if="item.showOn !== 'all'" size="small">{{ getShowOnLabel(item.showOn) }}</el-tag>
                  </div>
                  <div class="hf-item-actions">
                    <el-button text size="small" :disabled="index === 0" @click="moveHFItem(index, -1)">
                      <el-icon><ArrowUp /></el-icon>
                    </el-button>
                    <el-button text size="small" :disabled="index === template.headerFooterItems.length - 1" @click="moveHFItem(index, 1)">
                      <el-icon><ArrowDown /></el-icon>
                    </el-button>
                    <el-button text size="small" type="danger" @click="removeHFItem(index)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>

                <el-form label-width="120px" label-position="left" class="hf-form">
                  <!-- 基本設定 -->
                  <el-form-item label="位置">
                    <el-radio-group v-model="item.position">
                      <el-radio value="header">ヘッダー</el-radio>
                      <el-radio value="footer">フッター</el-radio>
                      <el-radio value="title">タイトル</el-radio>
                    </el-radio-group>
                  </el-form-item>

                  <el-form-item label="表示ページ">
                    <el-radio-group v-model="item.showOn">
                      <el-radio value="all">全ページ</el-radio>
                      <el-radio value="first">最初のページのみ</el-radio>
                      <el-radio value="last">最後のページのみ</el-radio>
                    </el-radio-group>
                  </el-form-item>

                  <el-form-item label="タイプ">
                    <el-radio-group v-model="item.type" @change="onHFTypeChange(item)">
                      <el-radio value="text">テキスト</el-radio>
                      <el-radio value="columns">カラム</el-radio>
                      <el-radio value="table">テーブル</el-radio>
                    </el-radio-group>
                  </el-form-item>

                  <el-divider />

                  <!-- テキストタイプ -->
                  <template v-if="item.type === 'text'">
                    <el-form-item label="テキスト">
                      <el-input v-model="item.text" placeholder="{{date}} - タイトル" />
                    </el-form-item>
                  </template>

                  <!-- カラムタイプ -->
                  <template v-if="item.type === 'columns'">
                    <el-form-item label="カラム">
                      <div class="columns-editor">
                        <div v-for="(col, colIdx) in item.columns" :key="colIdx" class="column-row">
                          <el-input v-model="col.text" placeholder="テキスト" style="flex: 1" />
                          <el-select v-model="col.width" style="width: 100px" placeholder="幅">
                            <el-option label="自動" value="auto" />
                            <el-option label="均等" value="*" />
                          </el-select>
                          <el-select v-model="col.alignment" style="width: 80px" placeholder="配置">
                            <el-option label="左" value="left" />
                            <el-option label="中央" value="center" />
                            <el-option label="右" value="right" />
                          </el-select>
                          <el-button text type="danger" @click="removeHFColumn(item, colIdx)">
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </div>
                        <el-button size="small" @click="addHFColumn(item)">
                          <el-icon><Plus /></el-icon>
                          カラム追加
                        </el-button>
                      </div>
                    </el-form-item>
                  </template>

                  <!-- テーブルタイプ -->
                  <template v-if="item.type === 'table'">
                    <el-form-item label="テーブル">
                      <div class="table-editor">
                        <div class="table-controls">
                          <el-button size="small" @click="addHFTableRow(item)">行追加</el-button>
                          <el-button size="small" @click="addHFTableCol(item)">列追加</el-button>
                        </div>
                        <table v-if="item.table?.body?.length" class="hf-table">
                          <tbody>
                            <tr v-for="(row, rowIdx) in item.table.body" :key="rowIdx">
                              <td v-for="(cell, cellIdx) in row" :key="cellIdx">
                                <el-input :model-value="cell" size="small" @update:model-value="updateTableCell(item, rowIdx, cellIdx, $event)" />
                              </td>
                              <td class="action-cell">
                                <el-button text type="danger" size="small" @click="removeHFTableRow(item, rowIdx)">
                                  <el-icon><Delete /></el-icon>
                                </el-button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div v-if="item.table?.body?.length && item.table.body[0]?.length" class="table-col-actions">
                          <el-button
                            v-for="(_, colIdx) in item.table.body[0]"
                            :key="colIdx"
                            text
                            type="danger"
                            size="small"
                            @click="removeHFTableCol(item, colIdx)"
                          >
                            列{{ colIdx + 1 }}削除
                          </el-button>
                        </div>
                      </div>
                    </el-form-item>

                    <el-divider content-position="left">テーブルスタイル</el-divider>

                    <el-form-item label="ヘッダー行数">
                      <el-input-number
                        :model-value="item.table?.tableStyle?.headerRows ?? 0"
                        :min="0"
                        :max="item.table?.body?.length ?? 0"
                        size="small"
                        @update:model-value="setTableStyle(item, 'headerRows', $event)"
                      />
                      <span class="hint" style="margin-left: 8px">0の場合はヘッダーなし</span>
                    </el-form-item>

                    <el-form-item label="ヘッダー背景色">
                      <el-color-picker
                        :model-value="item.table?.tableStyle?.headerBgColor"
                        @update:model-value="setTableStyle(item, 'headerBgColor', $event)"
                      />
                      <el-input
                        :model-value="item.table?.tableStyle?.headerBgColor"
                        style="width: 100px; margin-left: 8px"
                        placeholder="#2a3474"
                        @update:model-value="setTableStyle(item, 'headerBgColor', $event)"
                      />
                    </el-form-item>

                    <el-form-item label="ヘッダー文字色">
                      <el-color-picker
                        :model-value="item.table?.tableStyle?.headerTextColor"
                        @update:model-value="setTableStyle(item, 'headerTextColor', $event)"
                      />
                      <el-input
                        :model-value="item.table?.tableStyle?.headerTextColor"
                        style="width: 100px; margin-left: 8px"
                        placeholder="#ffffff"
                        @update:model-value="setTableStyle(item, 'headerTextColor', $event)"
                      />
                    </el-form-item>

                    <el-form-item label="罫線色">
                      <el-color-picker
                        :model-value="item.table?.tableStyle?.borderColor"
                        @update:model-value="setTableStyle(item, 'borderColor', $event)"
                      />
                      <el-input
                        :model-value="item.table?.tableStyle?.borderColor"
                        style="width: 100px; margin-left: 8px"
                        placeholder="#cccccc"
                        @update:model-value="setTableStyle(item, 'borderColor', $event)"
                      />
                    </el-form-item>

                    <el-form-item label="セル内余白">
                      <el-input-number
                        :model-value="item.table?.tableStyle?.cellPadding ?? 4"
                        :min="0"
                        :max="20"
                        size="small"
                        @update:model-value="setTableStyle(item, 'cellPadding', $event)"
                      />
                      <span class="unit">pt</span>
                    </el-form-item>

                    <el-form-item label="水平方向">
                      <el-radio-group
                        :model-value="item.table?.tableStyle?.horizontalAlign ?? 'left'"
                        @update:model-value="setTableStyle(item, 'horizontalAlign', $event)"
                      >
                        <el-radio value="left">左</el-radio>
                        <el-radio value="center">中央</el-radio>
                        <el-radio value="right">右</el-radio>
                      </el-radio-group>
                    </el-form-item>

                    <el-form-item label="垂直方向">
                      <el-radio-group
                        :model-value="item.table?.tableStyle?.verticalAlign ?? 'middle'"
                        @update:model-value="setTableStyle(item, 'verticalAlign', $event)"
                      >
                        <el-radio value="top">上</el-radio>
                        <el-radio value="middle">中央</el-radio>
                        <el-radio value="bottom">下</el-radio>
                      </el-radio-group>
                    </el-form-item>
                  </template>

                  <el-divider />

                  <!-- スタイル設定 -->
                  <h4 class="sub-section-title">スタイル</h4>
                  <el-form-item label="フォントサイズ">
                    <el-input-number v-model="item.style.fontSize" :min="6" :max="36" />
                    <span class="unit">pt</span>
                  </el-form-item>
                  <el-form-item label="スタイル">
                    <el-checkbox v-model="item.style.bold">太字</el-checkbox>
                    <el-checkbox v-model="item.style.italic">斜体</el-checkbox>
                  </el-form-item>
                  <el-form-item label="配置">
                    <el-radio-group v-model="item.style.alignment">
                      <el-radio value="left">左</el-radio>
                      <el-radio value="center">中央</el-radio>
                      <el-radio value="right">右</el-radio>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item label="文字色">
                    <el-color-picker v-model="item.style.color" />
                    <el-input v-model="item.style.color" style="width: 100px; margin-left: 8px" placeholder="#000000" />
                  </el-form-item>
                </el-form>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 列設定 -->
        <el-tab-pane label="列設定" name="columns">
          <div class="settings-section">
            <div class="section-header">
              <h3 class="section-title">出力する列</h3>
              <el-dropdown @command="handleAddColumn">
                <el-button type="primary" size="small">
                  <el-icon><Plus /></el-icon>
                  列を追加
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="single">単一内容の列</el-dropdown-item>
                    <el-dropdown-item command="multi">複数内容の列（縦並び）</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <p class="section-hint">
              帳票に出力する列を設定します。
              <br />
              <span class="hint-sub">• 「単一内容」: 1つのフィールドを表示（複数内容列がある場合、行をまたいで結合）</span>
              <br />
              <span class="hint-sub">• 「複数内容」: 複数のフィールドを縦に並べて表示（各フィールドは別々のセルに分割）</span>
              <br />
              <span class="hint-sub">※ 複数内容列のヘッダーは改行で区切って複数行にできます</span>
            </p>

            <div v-if="template.columns.length === 0" class="empty-columns">
              <el-empty description="列が設定されていません">
                <el-dropdown @command="handleAddColumn">
                  <el-button type="primary">
                    <el-icon><Plus /></el-icon>
                    列を追加
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="single">単一内容の列</el-dropdown-item>
                      <el-dropdown-item command="multi">複数内容の列</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </el-empty>
            </div>

            <div v-else class="column-list">
              <div
                v-for="(col, index) in template.columns"
                :key="col.id"
                class="column-card"
                :class="{ 'is-multi': col.type === 'multi' }"
              >
                <div class="column-card-header">
                  <div class="column-header-left">
                    <span class="column-number">#{{ index + 1 }}</span>
                    <el-tag :type="col.type === 'single' ? 'info' : 'warning'" size="small">
                      {{ col.type === 'single' ? '単一' : '複数' }}
                    </el-tag>
                  </div>
                  <div class="column-card-actions">
                    <el-tooltip content="一番上へ" placement="top">
                      <el-button
                        text
                        size="small"
                        :disabled="index === 0"
                        @click="moveColumnToTop(index)"
                      >
                        <el-icon><Top /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="上へ" placement="top">
                      <el-button
                        text
                        size="small"
                        :disabled="index === 0"
                        @click="moveColumn(index, -1)"
                      >
                        <el-icon><ArrowUp /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="下へ" placement="top">
                      <el-button
                        text
                        size="small"
                        :disabled="index === template.columns.length - 1"
                        @click="moveColumn(index, 1)"
                      >
                        <el-icon><ArrowDown /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="一番下へ" placement="top">
                      <el-button
                        text
                        size="small"
                        :disabled="index === template.columns.length - 1"
                        @click="moveColumnToBottom(index)"
                      >
                        <el-icon><Bottom /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="削除" placement="top">
                      <el-button
                        text
                        size="small"
                        type="danger"
                        @click="removeColumn(index)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </el-tooltip>
                  </div>
                </div>

                <!-- 共通設定: ラベルと幅 -->
                <el-form label-width="100px" label-position="left" class="column-form">
                  <el-form-item label="ヘッダー">
                    <el-input
                      v-model="col.label"
                      :placeholder="col.type === 'multi' ? '複数行の場合は改行で区切る' : '列の表示名'"
                      :type="col.type === 'multi' ? 'textarea' : 'text'"
                      :rows="col.type === 'multi' ? 2 : 1"
                    />
                    <div v-if="col.type === 'multi'" class="hint">
                      複数行ヘッダーは改行で区切ってください
                    </div>
                  </el-form-item>

                  <el-form-item label="列幅">
                    <div class="width-input">
                      <el-radio-group
                        :model-value="isAutoWidth(col.width) ? 'auto' : 'fixed'"
                        @update:model-value="setWidthMode(col, $event)"
                      >
                        <el-radio value="auto">自動</el-radio>
                        <el-radio value="fixed">固定</el-radio>
                      </el-radio-group>
                      <el-input-number
                        v-if="!isAutoWidth(col.width)"
                        v-model="col.width"
                        :min="20"
                        :max="500"
                        size="small"
                        style="margin-left: 12px"
                      />
                      <span v-if="!isAutoWidth(col.width)" class="unit">pt</span>
                    </div>
                  </el-form-item>
                </el-form>

                <!-- 単一内容の場合 -->
                <template v-if="col.type === 'single'">
                  <el-divider class="content-divider" />
                  <div class="content-section">
                    <h4 class="content-title">内容設定</h4>
                    <el-form label-width="100px" label-position="left" class="column-form">
                      <el-form-item label="フィールド">
                        <el-select
                          v-model="col.field"
                          style="width: 100%"
                          filterable
                          @change="onSingleFieldChange(col)"
                        >
                          <el-option
                            v-for="field in availableFields"
                            :key="field.key"
                            :label="field.label"
                            :value="field.key"
                          >
                            <span>{{ field.label }}</span>
                            <span class="field-key-hint">{{ field.key }}</span>
                          </el-option>
                        </el-select>
                      </el-form-item>

                      <el-form-item label="表示形式">
                        <el-select
                          v-model="col.renderType"
                          style="width: 100%"
                          @change="onRenderTypeChange(col)"
                        >
                          <el-option value="text" label="テキスト" />
                          <el-option
                            v-if="getFieldType(col.field) === 'date'"
                            value="date"
                            label="日付"
                          />
                          <el-option
                            v-if="fieldSupportBarcode(col.field)"
                            value="qrcode"
                            label="QRコード"
                          />
                          <el-option
                            v-if="fieldSupportBarcode(col.field)"
                            value="barcode"
                            label="バーコード"
                          />
                        </el-select>
                      </el-form-item>

                      <!-- バーコード/QRコード設定 -->
                      <template v-if="col.renderType === 'barcode' || col.renderType === 'qrcode'">
                        <el-form-item :label="col.renderType === 'barcode' ? 'バーコード種類' : 'QRコード種類'">
                          <el-select
                            :model-value="col.barcodeConfig?.format || (col.renderType === 'barcode' ? 'code128' : 'qrcode')"
                            style="width: 100%"
                            @update:model-value="setBarcodeFormat(col, $event)"
                          >
                            <template v-if="col.renderType === 'barcode'">
                              <el-option value="code128" label="Code 128" />
                              <el-option value="code39" label="Code 39" />
                              <el-option value="codabar" label="Codabar (NW-7)" />
                              <el-option value="ean13" label="EAN-13 (JAN)" />
                              <el-option value="ean8" label="EAN-8" />
                            </template>
                            <template v-else>
                              <el-option value="qrcode" label="QRコード" />
                              <el-option value="datamatrix" label="DataMatrix" />
                            </template>
                          </el-select>
                        </el-form-item>

                        <el-form-item label="サイズ">
                          <div class="barcode-size-inputs">
                            <el-input-number
                              :model-value="col.barcodeConfig?.width || (col.renderType === 'barcode' ? 120 : 60)"
                              :min="20"
                              :max="200"
                              size="small"
                              @update:model-value="setBarcodeSize(col, 'width', $event)"
                            />
                            <span class="size-separator">×</span>
                            <el-input-number
                              :model-value="col.barcodeConfig?.height || (col.renderType === 'barcode' ? 40 : 60)"
                              :min="20"
                              :max="200"
                              size="small"
                              @update:model-value="setBarcodeSize(col, 'height', $event)"
                            />
                            <span class="unit">px</span>
                          </div>
                        </el-form-item>
                      </template>

                      <!-- 日付フォーマット -->
                      <el-form-item v-if="col.renderType === 'date'" label="日付形式">
                        <el-select v-model="col.dateFormat" style="width: 100%">
                          <el-option value="YYYY/MM/DD" label="2026/01/04" />
                          <el-option value="YYYY-MM-DD" label="2026-01-04" />
                          <el-option value="YYYY年MM月DD日" label="2026年01月04日" />
                          <el-option value="MM/DD" label="01/04" />
                          <el-option value="YYYY/MM/DD HH:mm" label="2026/01/04 12:30" />
                          <el-option value="YYYY-MM-DD HH:mm:ss" label="2026-01-04 12:30:00" />
                        </el-select>
                      </el-form-item>

                      <!-- 単一列のプレビュー用一時データ -->
                      <el-divider />
                      <el-form-item label="プレビュー用一時データ">
                        <el-input
                          v-model="col.previewData"
                          type="textarea"
                          :rows="3"
                          placeholder="例: サンプル値（省略可）"
                          size="small"
                          @blur="updatePreview"
                        />
                        <div class="hint">プレビュー時にこのフィールドで使用する一時データ（JSON文字列）。空白の場合はデフォルトデータが使用されます。</div>
                      </el-form-item>
                    </el-form>
                  </div>
                </template>

                <!-- 複数内容の場合 -->
                <template v-if="col.type === 'multi'">
                  <el-divider class="content-divider" />
                  <div class="content-section">
                    <div class="content-header">
                      <h4 class="content-title">内容設定（{{ col.children?.length || 0 }}件）</h4>
                      <el-button size="small" @click="addChildContent(col)">
                        <el-icon><Plus /></el-icon>
                        内容を追加
                      </el-button>
                    </div>

                    <div v-if="!col.children?.length" class="empty-children">
                      <p>内容が設定されていません</p>
                      <el-button size="small" type="primary" @click="addChildContent(col)">
                        内容を追加
                      </el-button>
                    </div>

                    <div v-else class="children-list">
                      <div
                        v-for="(child, childIndex) in col.children"
                        :key="child.id"
                        class="child-card"
                      >
                        <div class="child-header">
                          <span class="child-number">{{ childIndex + 1 }}行目</span>
                          <div class="child-actions">
                            <el-button
                              text
                              size="small"
                              :disabled="childIndex === 0"
                              @click="moveChildContent(col, childIndex, -1)"
                            >
                              <el-icon><ArrowUp /></el-icon>
                            </el-button>
                            <el-button
                              text
                              size="small"
                              :disabled="childIndex === (col.children?.length || 0) - 1"
                              @click="moveChildContent(col, childIndex, 1)"
                            >
                              <el-icon><ArrowDown /></el-icon>
                            </el-button>
                            <el-button
                              text
                              size="small"
                              type="danger"
                              @click="removeChildContent(col, childIndex)"
                            >
                              <el-icon><Delete /></el-icon>
                            </el-button>
                          </div>
                        </div>

                        <el-form label-width="80px" label-position="left" class="child-form">
                          <el-form-item label="ラベル">
                            <el-input
                              v-model="child.label"
                              placeholder="省略可（セル内ラベル）"
                              size="small"
                            />
                          </el-form-item>

                          <el-form-item label="フィールド">
                            <el-select
                              v-model="child.field"
                              style="width: 100%"
                              size="small"
                              filterable
                              @change="onChildFieldChange(child)"
                            >
                              <el-option
                                v-for="field in availableFields"
                                :key="field.key"
                                :label="field.label"
                                :value="field.key"
                              >
                                <span>{{ field.label }}</span>
                                <span class="field-key-hint">{{ field.key }}</span>
                              </el-option>
                            </el-select>
                          </el-form-item>

                          <el-form-item label="表示形式">
                            <el-select
                              v-model="child.renderType"
                              style="width: 100%"
                              size="small"
                              @change="onChildRenderTypeChange(child)"
                            >
                              <el-option value="text" label="テキスト" />
                              <el-option
                                v-if="getFieldType(child.field) === 'date'"
                                value="date"
                                label="日付"
                              />
                              <el-option
                                v-if="fieldSupportBarcode(child.field)"
                                value="qrcode"
                                label="QRコード"
                              />
                              <el-option
                                v-if="fieldSupportBarcode(child.field)"
                                value="barcode"
                                label="バーコード"
                              />
                            </el-select>
                          </el-form-item>

                          <!-- 子項目のバーコード設定 -->
                          <template v-if="child.renderType === 'barcode' || child.renderType === 'qrcode'">
                            <el-form-item :label="child.renderType === 'barcode' ? 'バーコード' : 'QR種類'">
                              <el-select
                                :model-value="child.barcodeConfig?.format || (child.renderType === 'barcode' ? 'code128' : 'qrcode')"
                                style="width: 100%"
                                size="small"
                                @update:model-value="setChildBarcodeFormat(child, $event)"
                              >
                                <template v-if="child.renderType === 'barcode'">
                                  <el-option value="code128" label="Code 128" />
                                  <el-option value="code39" label="Code 39" />
                                  <el-option value="codabar" label="Codabar" />
                                  <el-option value="ean13" label="EAN-13" />
                                  <el-option value="ean8" label="EAN-8" />
                                </template>
                                <template v-else>
                                  <el-option value="qrcode" label="QRコード" />
                                  <el-option value="datamatrix" label="DataMatrix" />
                                </template>
                              </el-select>
                            </el-form-item>

                            <el-form-item label="サイズ">
                              <div class="barcode-size-inputs small">
                                <el-input-number
                                  :model-value="child.barcodeConfig?.width || (child.renderType === 'barcode' ? 120 : 60)"
                                  :min="20"
                                  :max="400"
                                  size="small"
                                  @update:model-value="setChildBarcodeSize(child, 'width', $event)"
                                />
                                <span class="size-separator">×</span>
                                <el-input-number
                                  :model-value="child.barcodeConfig?.height || (child.renderType === 'barcode' ? 40 : 60)"
                                  :min="20"
                                  :max="400"
                                  size="small"
                                  @update:model-value="setChildBarcodeSize(child, 'height', $event)"
                                />
                                <span class="unit">px</span>
                              </div>
                            </el-form-item>
                          </template>

                          <!-- 子項目の日付フォーマット -->
                          <el-form-item v-if="child.renderType === 'date'" label="日付形式">
                            <el-select v-model="child.dateFormat" style="width: 100%" size="small">
                              <el-option value="YYYY/MM/DD" label="2026/01/04" />
                              <el-option value="YYYY-MM-DD" label="2026-01-04" />
                              <el-option value="MM/DD" label="01/04" />
                            </el-select>
                          </el-form-item>

                          <!-- 子項目のプレビュー用一時データ -->
                          <el-divider />
                          <el-form-item label="プレビュー用一時データ">
                            <el-input
                              v-model="child.previewData"
                              type="textarea"
                              :rows="3"
                              placeholder="例: サンプル値（省略可）"
                              size="small"
                              @blur="updatePreview"
                            />
                            <div class="hint">プレビュー時にこのフィールドで使用する一時データ（JSON文字列）。空白の場合はデフォルトデータが使用されます。</div>
                          </el-form-item>
                        </el-form>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- スタイル設定 -->
        <el-tab-pane label="スタイル設定" name="styles">
          <div class="settings-section">
            <h3 class="section-title">スタイル設定</h3>
            <el-form :model="template.styles" label-width="160px" label-position="left">
              <el-form-item label="フォントサイズ">
                <el-input-number v-model="template.styles.fontSize" :min="6" :max="24" />
                <span class="unit">pt</span>
              </el-form-item>
              <el-form-item label="ヘッダー背景色">
                <el-color-picker v-model="template.styles.headerBgColor" />
                <el-input
                  v-model="template.styles.headerBgColor"
                  style="width: 120px; margin-left: 8px"
                  placeholder="#2a3474"
                />
              </el-form-item>
              <el-form-item label="ヘッダー文字色">
                <el-color-picker v-model="template.styles.headerTextColor" />
                <el-input
                  v-model="template.styles.headerTextColor"
                  style="width: 120px; margin-left: 8px"
                  placeholder="#ffffff"
                />
              </el-form-item>
              <el-form-item label="罫線色">
                <el-color-picker v-model="template.styles.borderColor" />
                <el-input
                  v-model="template.styles.borderColor"
                  style="width: 120px; margin-left: 8px"
                  placeholder="#cccccc"
                />
              </el-form-item>
              <el-form-item label="セル内余白">
                <el-input-number v-model="template.styles.cellPadding" :min="0" :max="20" />
                <span class="unit">pt</span>
              </el-form-item>

              <el-divider />

              <h4 class="sub-section-title">セル配置</h4>
              
              <el-form-item label="水平方向">
                <el-radio-group v-model="template.styles.horizontalAlign">
                  <el-radio-button value="left">
                    <el-icon><DArrowLeft /></el-icon> 左
                  </el-radio-button>
                  <el-radio-button value="center">
                    <el-icon><Minus /></el-icon> 中央
                  </el-radio-button>
                  <el-radio-button value="right">
                    <el-icon><DArrowRight /></el-icon> 右
                  </el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
          </el-tabs>
        </div>
        <div class="editor-right">
          <div class="preview-header">
            <div class="preview-controls">
              <span class="preview-label">プレビュー行数:</span>
              <el-input-number
                v-model="previewRowCount"
                :min="1"
                :max="100"
                size="small"
                style="width: 100px"
              />
            </div>
          </div>
          <div class="preview-container">
            <div v-if="previewError" class="preview-error">
              <el-icon class="error-icon"><WarningFilled /></el-icon>
              <p>プレビューエラー</p>
              <pre class="error-message">{{ previewError }}</pre>
            </div>
            <iframe
              v-else-if="previewUrl"
              :src="previewUrl"
              class="preview-iframe"
              frameborder="0"
            />
            <div v-else class="preview-placeholder">
              <p>プレビューを生成中...</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      読み込み中...
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, Plus, Delete, ArrowUp, ArrowDown, Top, Bottom, DArrowLeft, DArrowRight, Minus, WarningFilled } from '@element-plus/icons-vue'
import type { FormTemplate, FormTemplateColumn, FormTemplateColumnChild, BarcodeConfig, HeaderFooterItem, HeaderFooterItemColumn } from '@/types/formTemplate'
import { fetchFormTemplate, updateFormTemplate } from '@/api/formTemplate'
import { formTypeRegistry, getFormTypeFields } from '@/utils/form-export/formFieldRegistry'
import { generateFormPdf } from '@/utils/form-export/pdfGenerator'

const route = useRoute()
const router = useRouter()

const template = ref<FormTemplate | null>(null)
const activeTab = ref('basic')
const saving = ref(false)
const previewing = ref(false)
const previewUrl = ref<string | null>(null)
const previewRowCount = ref(10)
const previewError = ref<string | null>(null)
let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null

// 利用可能なフィールド一覧
const availableFields = computed(() => {
  if (!template.value) return []
  return getFormTypeFields(template.value.targetType)
})

// ユニークID生成
function generateId(): string {
  return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

async function loadTemplate() {
  const id = route.params.id as string
  if (!id) {
    ElMessage.error('テンプレートIDが指定されていません')
    return
  }

  try {
    template.value = await fetchFormTemplate(id)
  } catch (e: any) {
    ElMessage.error(e?.message || 'テンプレートの読み込みに失敗しました')
  }
}

function fieldSupportBarcode(field?: string): boolean {
  if (!template.value || !field) return false
  const fields = getFormTypeFields(template.value.targetType)
  const f = fields.find((x) => x.key === field)
  return f?.supportBarcode || false
}

function getFieldType(field?: string): string {
  if (!template.value || !field) return 'string'
  const fields = getFormTypeFields(template.value.targetType)
  const f = fields.find((x) => x.key === field)
  return f?.fieldType || 'string'
}

// 列を追加
function handleAddColumn(type: 'single' | 'multi') {
  if (!template.value) return
  const fields = availableFields.value
  if (fields.length === 0) return
  
  const defaultField = fields[0]
  if (!defaultField) return
  
  const newColumn: FormTemplateColumn = {
    id: generateId(),
    type,
    label: defaultField.label,
    width: 'auto',
    order: template.value.columns.length,
  }

  if (type === 'single') {
    newColumn.field = defaultField.key
    newColumn.renderType = 'text'
  } else {
    newColumn.children = [
      {
        id: generateId(),
        field: defaultField.key,
        renderType: 'text',
      },
    ]
  }

  template.value.columns.push(newColumn)
}

// 列を削除
function removeColumn(index: number) {
  if (!template.value) return
  template.value.columns.splice(index, 1)
  template.value.columns.forEach((col, i) => {
    col.order = i
  })
}

// 列を移動
function moveColumn(index: number, direction: number) {
  if (!template.value) return
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= template.value.columns.length) return
  
  const columns = template.value.columns
  const temp = columns[index]
  const newIndexColumn = columns[newIndex]
  if (!temp || !newIndexColumn) return
  columns[index] = newIndexColumn
  columns[newIndex] = temp
  columns.forEach((col, i) => {
    col.order = i
  })
}

function moveColumnToTop(index: number) {
  if (!template.value || index === 0) return
  const columns = template.value.columns
  const [removed] = columns.splice(index, 1)
  if (!removed) return
  columns.unshift(removed)
  columns.forEach((col, i) => {
    col.order = i
  })
}

function moveColumnToBottom(index: number) {
  if (!template.value || index === template.value.columns.length - 1) return
  const columns = template.value.columns
  const [removed] = columns.splice(index, 1)
  if (!removed) return
  columns.push(removed)
  columns.forEach((col, i) => {
    col.order = i
  })
}

// 単一列のフィールド変更時にラベルを自動設定
function onSingleFieldChange(col: FormTemplateColumn) {
  const field = availableFields.value.find((f) => f.key === col.field)
  if (field) {
    col.label = field.label
    if (field.fieldType === 'date') {
      col.renderType = 'date'
      col.dateFormat = 'YYYY/MM/DD'
    } else {
      col.renderType = 'text'
    }
  }
}

// 複数列の子項目フィールド変更時にラベルを自動設定
function onChildFieldChange(child: FormTemplateColumnChild) {
  const field = availableFields.value.find((f) => f.key === child.field)
  if (field) {
    child.label = field.label
    if (field.fieldType === 'date') {
      child.renderType = 'date'
      child.dateFormat = 'YYYY/MM/DD'
    } else if (!child.renderType || child.renderType === 'text') {
      child.renderType = 'text'
    }
  }
}

// 表示形式変更時の処理（単一列）
function onRenderTypeChange(col: FormTemplateColumn) {
  if (col.renderType === 'barcode') {
    // 高解像度のため、生成サイズを大きく（表示サイズは120x40相当）
    col.barcodeConfig = { format: 'code128', width: 120, height: 40 }
  } else if (col.renderType === 'qrcode') {
    // 高解像度のため、生成サイズを大きく（表示サイズは60x60相当）
    col.barcodeConfig = { format: 'qrcode', width: 60, height: 60 }
  } else {
    col.barcodeConfig = undefined
  }
}

// 表示形式変更時の処理（子項目）
function onChildRenderTypeChange(child: FormTemplateColumnChild) {
  if (child.renderType === 'barcode') {
    child.barcodeConfig = { format: 'code128', width: 120, height: 40 }
  } else if (child.renderType === 'qrcode') {
    child.barcodeConfig = { format: 'qrcode', width: 60, height: 60 }
  } else {
    child.barcodeConfig = undefined
  }
}

// バーコードフォーマット設定（単一列）
function setBarcodeFormat(col: FormTemplateColumn, format: string) {
  if (!col.barcodeConfig) {
    const isBarcode = col.renderType === 'barcode'
    col.barcodeConfig = {
      format: format as BarcodeConfig['format'],
      width: isBarcode ? 120 : 60,
      height: isBarcode ? 40 : 60,
    }
  } else {
    col.barcodeConfig.format = format as BarcodeConfig['format']
  }
}

// バーコードサイズ設定（単一列）
function setBarcodeSize(col: FormTemplateColumn, prop: 'width' | 'height', value: number) {
  if (!col.barcodeConfig) {
    col.barcodeConfig = {
      format: col.renderType === 'barcode' ? 'code128' : 'qrcode',
      width: prop === 'width' ? value : (col.renderType === 'barcode' ? 120 : 60),
      height: prop === 'height' ? value : (col.renderType === 'barcode' ? 40 : 60),
    }
  } else {
    col.barcodeConfig[prop] = value
  }
}

// バーコードフォーマット設定（子項目）
function setChildBarcodeFormat(child: FormTemplateColumnChild, format: string) {
  if (!child.barcodeConfig) {
    const isBarcode = child.renderType === 'barcode'
    child.barcodeConfig = {
      format: format as BarcodeConfig['format'],
      width: isBarcode ? 120 : 60,
      height: isBarcode ? 40 : 60,
    }
  } else {
    child.barcodeConfig.format = format as BarcodeConfig['format']
  }
}

// バーコードサイズ設定（子項目）
function setChildBarcodeSize(child: FormTemplateColumnChild, prop: 'width' | 'height', value: number) {
  if (!child.barcodeConfig) {
    child.barcodeConfig = {
      format: child.renderType === 'barcode' ? 'code128' : 'qrcode',
      width: prop === 'width' ? value : (child.renderType === 'barcode' ? 120 : 60),
      height: prop === 'height' ? value : (child.renderType === 'barcode' ? 40 : 60),
    }
  } else {
    child.barcodeConfig[prop] = value
  }
}

// 自動幅かどうかを判定
function isAutoWidth(width: number | 'auto' | string | undefined): boolean {
  return width === 'auto' || width === '*' || width === undefined
}

// 幅モードを設定
function setWidthMode(col: FormTemplateColumn, mode: string) {
  col.width = mode === 'auto' ? 'auto' : 100
}

// 複数列に子コンテンツを追加
function addChildContent(col: FormTemplateColumn) {
  if (!col.children) {
    col.children = []
  }
  const defaultField = availableFields.value[0]
  col.children.push({
    id: generateId(),
    field: defaultField?.key || '',
    label: defaultField?.label || '',
    renderType: 'text',
  })
}

// 子コンテンツを削除
function removeChildContent(col: FormTemplateColumn, index: number) {
  if (!col.children) return
  col.children.splice(index, 1)
}

// 子コンテンツを移動
function moveChildContent(col: FormTemplateColumn, index: number, direction: number) {
  if (!col.children) return
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= col.children.length) return

  const temp = col.children[index]
  const newIndexChild = col.children[newIndex]
  if (!temp || !newIndexChild) return
  col.children[index] = newIndexChild
  col.children[newIndex] = temp
}

// ========== ヘッダー・フッター項目管理 ==========

// ラベル取得関数
function getPositionLabel(position: string): string {
  switch (position) {
    case 'header': return 'ヘッダー'
    case 'footer': return 'フッター'
    case 'title': return 'タイトル'
    default: return position
  }
}

function getPositionTagType(position: string): '' | 'success' | 'warning' | 'info' | 'danger' {
  switch (position) {
    case 'header': return 'success'
    case 'footer': return 'warning'
    case 'title': return ''
    default: return 'info'
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'text': return 'テキスト'
    case 'columns': return 'カラム'
    case 'table': return 'テーブル'
    default: return type
  }
}

function getShowOnLabel(showOn: string): string {
  switch (showOn) {
    case 'all': return '全ページ'
    case 'first': return '最初のみ'
    case 'last': return '最後のみ'
    default: return showOn
  }
}

// 項目を追加
function addHeaderFooterItem() {
  if (!template.value) return
  if (!template.value.headerFooterItems) {
    template.value.headerFooterItems = []
  }

  const newItem: HeaderFooterItem = {
    id: generateId(),
    position: 'header',
    showOn: 'all',
    type: 'text',
    style: {
      fontSize: 10,
      alignment: 'center',
    },
    text: '',
  }

  template.value.headerFooterItems.push(newItem)
}

// 項目を削除
function removeHFItem(index: number) {
  if (!template.value?.headerFooterItems) return
  template.value.headerFooterItems.splice(index, 1)
}

// 項目を移動
function moveHFItem(index: number, direction: number) {
  if (!template.value?.headerFooterItems) return
  const items = template.value.headerFooterItems
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= items.length) return

  const temp = items[index]
  const other = items[newIndex]
  if (!temp || !other) return
  items[index] = other
  items[newIndex] = temp
}

// タイプ変更時の処理
function onHFTypeChange(item: HeaderFooterItem) {
  if (item.type === 'text') {
    item.text = item.text || ''
    item.columns = undefined
    item.table = undefined
  } else if (item.type === 'columns') {
    item.columns = item.columns || [{ text: '', width: '*', alignment: 'left' }]
    item.text = undefined
    item.table = undefined
  } else if (item.type === 'table') {
    item.table = item.table || { widths: ['*', '*'], body: [['', '']] }
    item.text = undefined
    item.columns = undefined
  }
}

// カラム追加
function addHFColumn(item: HeaderFooterItem) {
  if (!item.columns) {
    item.columns = []
  }
  item.columns.push({ text: '', width: '*', alignment: 'left' })
}

// カラム削除
function removeHFColumn(item: HeaderFooterItem, index: number) {
  if (!item.columns) return
  item.columns.splice(index, 1)
}

// テーブル行追加
function addHFTableRow(item: HeaderFooterItem) {
  if (!item.table) {
    item.table = { widths: ['*'], body: [['']] }
    return
  }
  const colCount = item.table.body[0]?.length || 1
  item.table.body.push(Array(colCount).fill(''))
}

// テーブル列追加
function addHFTableCol(item: HeaderFooterItem) {
  if (!item.table) {
    item.table = { widths: ['*'], body: [['']] }
    return
  }
  item.table.widths = item.table.widths || []
  item.table.widths.push('*')
  for (const row of item.table.body) {
    row.push('')
  }
}

// テーブル行削除
function removeHFTableRow(item: HeaderFooterItem, rowIndex: number) {
  if (!item.table?.body) return
  item.table.body.splice(rowIndex, 1)
}

// テーブル列削除
function removeHFTableCol(item: HeaderFooterItem, colIndex: number) {
  if (!item.table?.body) return
  item.table.widths?.splice(colIndex, 1)
  for (const row of item.table.body) {
    row.splice(colIndex, 1)
  }
}

// テーブルセル更新
function updateTableCell(item: HeaderFooterItem, rowIdx: number, cellIdx: number, value: string) {
  if (!item.table?.body?.[rowIdx]) return
  item.table.body[rowIdx][cellIdx] = value
}

// テーブルスタイル設定
function setTableStyle(item: HeaderFooterItem, key: string, value: any) {
  if (!item.table) {
    item.table = { widths: ['*'], body: [['']], tableStyle: {} }
  }
  if (!item.table.tableStyle) {
    item.table.tableStyle = {}
  }
  ;(item.table.tableStyle as any)[key] = value
}

async function handleSave() {
  if (!template.value) return

  saving.value = true
  try {
    await updateFormTemplate(template.value._id, template.value)
    ElMessage.success('保存しました')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存に失敗しました')
  } finally {
    saving.value = false
  }
}

async function handlePreview() {
  if (!template.value) return

  previewing.value = true
  try {
    const sampleData = generateSampleData(template.value.targetType)
    await generateFormPdf(template.value, sampleData, { preview: true })
  } catch (e: any) {
    ElMessage.error(e?.message || 'プレビューの生成に失敗しました')
  } finally {
    previewing.value = false
  }
}

function generateSampleData(type: string): Record<string, any>[] {
  if (type === 'shipment-list-picking') {
    return [
      {
        sku: 'SKU-001',
        name: 'サンプル商品A',
        nameFull: 'サンプル商品A フルネーム',
        barcode: '4901234567890',
        coolType: '常温',
        invoiceType: '発払い宅急便',
        delivery_size_index: 10,
        totalQuantity: 5,
      },
      {
        sku: 'SKU-002',
        name: 'サンプル商品B',
        nameFull: 'サンプル商品B フルネーム',
        barcode: '4901234567891',
        coolType: 'クール冷蔵',
        invoiceType: '宅急便コンパクト',
        delivery_size_index: 5,
        totalQuantity: 10,
      },
    ]
  }

  return [
    {
      orderNumber: 'ORD-2026-0001',
      customerManagementNumber: 'CUST-123',
      ecCompanyName: 'Amazon',
      carrierName: 'Yamato',
      invoiceTypeName: 'Takkyubin',
      shipPlanDate: '2026/01/04',
      deliveryDatePreference: '2026/01/06',
      deliveryTimeSlot: '14-16',
      coolTypeName: 'Normal',
      products: 'Product A x2, Product B x1',
      productTotalQuantity: 3,
      recipientPostalCode: '100-0001',
      recipientAddress: 'Tokyo Chiyoda-ku',
      recipientName: 'Tanaka Taro',
      recipientPhone: '090-1234-5678',
    },
    {
      orderNumber: 'ORD-2026-0002',
      customerManagementNumber: 'CUST-456',
      ecCompanyName: 'Rakuten',
      carrierName: 'Sagawa',
      invoiceTypeName: 'Express',
      shipPlanDate: '2026/01/04',
      deliveryDatePreference: '-',
      deliveryTimeSlot: '-',
      coolTypeName: 'Frozen',
      products: 'Product C x5',
      productTotalQuantity: 5,
      recipientPostalCode: '150-0002',
      recipientAddress: 'Tokyo Shibuya-ku',
      recipientName: 'Suzuki Hanako',
      recipientPhone: '080-8765-4321',
    },
  ]
}

function handleBack() {
  router.push('/settings/form-templates')
}

// プレビュー用のデータを取得
function getPreviewData(): Record<string, any>[] {
  if (!template.value) return []
  
  // デフォルトのサンプルデータを取得
  const defaultData = generateSampleData(template.value.targetType)
  
  // 各行のデータを構築
  const rows: Record<string, any>[] = []
  const rowCount = Math.min(previewRowCount.value, 100) // 最大100行
  
  for (let i = 0; i < rowCount; i++) {
    const rowData: Record<string, any> = {}
    const baseData = defaultData[i % defaultData.length] || {}
    
    // 各列のデータを処理
    for (const col of template.value.columns) {
      if (col.type === 'single' && col.field) {
        // single列の場合、一時データがあれば使用
        if (col.previewData && col.previewData.trim()) {
          try {
            // previewDataはJSON文字列として保存されているので、パースして使用
            const parsed = JSON.parse(col.previewData)
            // 配列の場合は循環使用、それ以外はそのまま使用
            if (Array.isArray(parsed)) {
              rowData[col.field] = parsed[i % parsed.length]
            } else {
              rowData[col.field] = parsed
            }
          } catch (e) {
            // JSONパースに失敗した場合は文字列として使用
            rowData[col.field] = col.previewData
          }
        } else {
          // 一時データがない場合はデフォルトデータを使用
          rowData[col.field] = baseData[col.field] ?? ''
        }
      } else if (col.type === 'multi' && col.children) {
        // multi列の場合、各childの一時データを使用
        for (const child of col.children) {
          if (child.previewData && child.previewData.trim()) {
            try {
              // previewDataはJSON文字列として保存されているので、パースして使用
              const parsed = JSON.parse(child.previewData)
              // 配列の場合は循環使用、それ以外はそのまま使用
              if (Array.isArray(parsed)) {
                rowData[child.field] = parsed[i % parsed.length]
              } else {
                rowData[child.field] = parsed
              }
            } catch (e) {
              // JSONパースに失敗した場合は文字列として使用
              rowData[child.field] = child.previewData
            }
          } else {
            // 一時データがない場合はデフォルトデータを使用
            rowData[child.field] = baseData[child.field] ?? ''
          }
        }
      }
    }
    
    rows.push(rowData)
  }
  
  return rows
}

// プレビューを生成
async function updatePreview() {
  if (!template.value) return

  previewing.value = true
  previewError.value = null
  try {
    const data = getPreviewData()
    const blob = await generateFormPdf(template.value, data, { returnBlob: true }) as Blob

    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }

    if (blob) {
      previewUrl.value = URL.createObjectURL(blob)
    }
  } catch (e: any) {
    console.error('プレビューの生成に失敗しました', e)
    previewError.value = e?.message || 'プレビューの生成に失敗しました'
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
  } finally {
    previewing.value = false
  }
}

// デバウンス付きプレビュー更新
function debouncedUpdatePreview() {
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer)
  }
  previewDebounceTimer = setTimeout(() => {
    updatePreview()
  }, 500) // 500ms debounce
}

// templateまたはpreviewRowCountの変更を監視
watch(
  () => [template.value?.columns, template.value?.styles, template.value?.pageSize, template.value?.pageOrientation, template.value?.pageMargins, template.value?.headerFooterItems, previewRowCount.value],
  () => {
    if (template.value) {
      debouncedUpdatePreview()
    }
  },
  { deep: true },
)

onMounted(() => {
  loadTemplate().then(() => {
    if (template.value) {
      nextTick(() => {
        updatePreview()
      })
    }
  })
})
</script>

<style scoped>
.form-template-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #2a3474;
}

.page-subtitle {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.editor-content {
  flex: 1;
  min-height: 0;
}

.editor-layout {
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 600px;
}

.editor-left {
  flex: 0 0 50%;
  min-width: 0;
  overflow-y: auto;
}

.editor-right {
  flex: 0 0 50%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
}

.preview-header {
  padding: 12px 16px;
  border-bottom: 1px solid #dcdfe6;
  background: #f5f7fa;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-label {
  font-size: 14px;
  color: #606266;
}

.preview-container {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  font-size: 14px;
}

.preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  color: #f56c6c;
}

.preview-error .error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.preview-error p {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.preview-error .error-message {
  max-width: 100%;
  padding: 12px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 4px;
  font-size: 12px;
  color: #c45656;
  white-space: pre-wrap;
  word-break: break-all;
  overflow: auto;
  max-height: 200px;
}

.settings-section {
  margin-bottom: 24px;
}

.section-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}

.sub-section-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.section-hint {
  margin: -8px 0 16px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.hint-sub {
  margin-left: 8px;
  color: #a8abb2;
}

.hint {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.unit {
  margin-left: 8px;
  color: #909399;
}

.margin-inputs {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.margin-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.margin-input span {
  font-size: 12px;
  color: #606266;
  width: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-header .section-title {
  margin: 0;
  border: none;
  padding: 0;
}

.empty-columns {
  padding: 40px 0;
}

.column-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.column-card {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
}

.column-card.is-multi {
  background: #fef9f0;
  border-color: #f5dbb3;
}

.column-card:hover {
  border-color: #dcdfe6;
}

.column-card.is-multi:hover {
  border-color: #e6c78c;
}

.column-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.column-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-number {
  font-weight: 600;
  color: #2a3474;
}

.column-card-actions {
  display: flex;
  gap: 4px;
}

.column-form {
  margin: 0;
}

.column-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.column-form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.field-key-hint {
  float: right;
  color: #909399;
  font-size: 11px;
  font-family: monospace;
}

.barcode-size-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.barcode-size-inputs.small {
  gap: 4px;
}

.size-separator {
  color: #909399;
}

.width-input {
  display: flex;
  align-items: center;
}

.content-divider {
  margin: 16px 0;
}

.content-section {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  padding: 12px;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.content-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.empty-children {
  text-align: center;
  padding: 20px;
  color: #909399;
}

.empty-children p {
  margin: 0 0 12px;
}

.children-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.child-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
}

.child-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e4e7ed;
}

.child-number {
  font-size: 12px;
  font-weight: 500;
  color: #909399;
}

.child-actions {
  display: flex;
  gap: 2px;
}

.child-form {
  margin: 0;
}

.child-form :deep(.el-form-item) {
  margin-bottom: 8px;
}

.child-form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px;
  color: #909399;
}

/* ヘッダー・フッター項目スタイル */
.hf-item-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hf-item-card {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
}

.hf-item-card:hover {
  border-color: #dcdfe6;
}

.hf-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.hf-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hf-number {
  font-weight: 600;
  color: #2a3474;
}

.hf-item-actions {
  display: flex;
  gap: 4px;
}

.hf-form {
  margin: 0;
}

.hf-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.hf-form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.columns-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.table-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-controls {
  display: flex;
  gap: 8px;
}

.hf-table {
  width: 100%;
  border-collapse: collapse;
}

.hf-table td {
  padding: 4px;
  border: 1px solid #ebeef5;
}

.hf-table .action-cell {
  width: 40px;
  border: none;
  text-align: center;
}

.table-col-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
</style>
