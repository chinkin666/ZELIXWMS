<template>
  <div class="form-template-editor">
    <ControlPanel title="帳票テンプレート編集" :show-search="false">
      <template #actions>
        <OButton variant="secondary" @click="handlePreview" :disabled="previewing">{{ previewing ? 'プレビュー中...' : 'プレビュー' }}</OButton>
        <OButton variant="primary" @click="handleSave" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</OButton>
        <OButton variant="secondary" @click="handleBack">戻る</OButton>
      </template>
    </ControlPanel>

    <div v-if="template" class="editor-content">
      <div class="editor-layout">
        <div class="editor-left">
          <div class="o-tabs">
            <div class="o-tabs-nav">
              <button
                v-for="tab in tabs"
                :key="tab.name"
                class="o-tab-btn"
                :class="{ active: activeTab === tab.name }"
                @click="activeTab = tab.name"
              >{{ tab.label }}</button>
            </div>
            <div class="o-tabs-content">

        <!-- 基本設定 -->
        <div v-show="activeTab === 'basic'" class="settings-section">
            <h3 class="section-title">基本設定</h3>
            <div class="o-form">
              <div class="o-form-group">
                <label>テンプレート名</label>
                <input v-model="template.name" class="o-input" placeholder="例：ピッキングリスト" />
              </div>
              <div class="o-form-group">
                <label>種類</label>
                <select v-model="template.targetType" class="o-input" disabled style="width: 100%">
                  <option
                    v-for="t in formTypeRegistry"
                    :key="t.type"
                    :value="t.type"
                  >{{ t.label }}</option>
                </select>
                <div class="hint">種類は作成時に設定され、変更できません</div>
              </div>
              <div class="o-form-group">
                <label>デフォルト</label>
                <div>
                  <label class="o-toggle">
                    <input type="checkbox" v-model="template.isDefault" />
                    <span class="o-toggle-slider"></span>
                  </label>
                  <div class="hint">この種類のデフォルトテンプレートとして使用</div>
                </div>
              </div>
            </div>
        </div>

        <!-- 用紙設定 -->
        <div v-show="activeTab === 'page'" class="settings-section">
            <h3 class="section-title">用紙設定</h3>
            <div class="o-form">
              <div class="o-form-group">
                <label>用紙サイズ</label>
                <div class="radio-group">
                  <label><input type="radio" v-model="template.pageSize" value="A4" /> A4</label>
                  <label><input type="radio" v-model="template.pageSize" value="A3" /> A3</label>
                  <label><input type="radio" v-model="template.pageSize" value="B4" /> B4</label>
                  <label><input type="radio" v-model="template.pageSize" value="LETTER" /> Letter</label>
                </div>
              </div>
              <div class="o-form-group">
                <label>印刷向き</label>
                <div class="radio-group">
                  <label><input type="radio" v-model="template.pageOrientation" value="portrait" /> 縦 (portrait)</label>
                  <label><input type="radio" v-model="template.pageOrientation" value="landscape" /> 横 (landscape)</label>
                </div>
              </div>
              <div class="o-form-group">
                <label>余白 (pt)</label>
                <div class="margin-inputs">
                  <div class="margin-input">
                    <span>左</span>
                    <input type="number" v-model.number="template.pageMargins[0]" min="0" max="200" class="o-input" style="width: 80px" />
                  </div>
                  <div class="margin-input">
                    <span>上</span>
                    <input type="number" v-model.number="template.pageMargins[1]" min="0" max="200" class="o-input" style="width: 80px" />
                  </div>
                  <div class="margin-input">
                    <span>右</span>
                    <input type="number" v-model.number="template.pageMargins[2]" min="0" max="200" class="o-input" style="width: 80px" />
                  </div>
                  <div class="margin-input">
                    <span>下</span>
                    <input type="number" v-model.number="template.pageMargins[3]" min="0" max="200" class="o-input" style="width: 80px" />
                  </div>
                </div>
              </div>
            </div>
        </div>

        <!-- ヘッダー・フッター -->
        <div v-show="activeTab === 'header-footer'" class="settings-section">
            <div class="section-header">
              <h3 class="section-title">ヘッダー・フッター項目</h3>
              <OButton variant="primary" @click="addHeaderFooterItem">+ 追加</OButton>
            </div>
            <p class="section-hint">
              ヘッダー、フッター、またはドキュメントタイトルを自由に追加できます。
              <br />
              <span class="hint-sub" v-pre>利用可能な変数: {{date}}, {{time}}, {{datetime}}, {{page}}, {{pages}}</span>
            </p>

            <div v-if="!template.headerFooterItems?.length" class="empty-columns">
              <p style="color: #909399; text-align: center; padding: 20px">項目が設定されていません</p>
              <div style="text-align: center">
                <OButton variant="primary" @click="addHeaderFooterItem">+ 項目を追加</OButton>
              </div>
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
                    <span class="o-badge" :class="'o-badge-' + getPositionBadgeClass(item.position)">{{ getPositionLabel(item.position) }}</span>
                    <span class="o-badge o-badge-info">{{ getTypeLabel(item.type) }}</span>
                    <span v-if="item.showOn !== 'all'" class="o-badge">{{ getShowOnLabel(item.showOn) }}</span>
                  </div>
                  <div class="hf-item-actions">
                    <button class="o-btn-text" :disabled="index === 0" @click="moveHFItem(index, -1)">&#x2191;</button>
                    <button class="o-btn-text" :disabled="index === template.headerFooterItems.length - 1" @click="moveHFItem(index, 1)">&#x2193;</button>
                    <button class="o-btn-text o-btn-text-danger" @click="removeHFItem(index)">&#x2715;</button>
                  </div>
                </div>

                <div class="o-form hf-form">
                  <!-- 基本設定 -->
                  <div class="o-form-group">
                    <label>位置</label>
                    <div class="radio-group">
                      <label><input type="radio" v-model="item.position" value="header" /> ヘッダー</label>
                      <label><input type="radio" v-model="item.position" value="footer" /> フッター</label>
                      <label><input type="radio" v-model="item.position" value="title" /> タイトル</label>
                    </div>
                  </div>

                  <div class="o-form-group">
                    <label>表示ページ</label>
                    <div class="radio-group">
                      <label><input type="radio" v-model="item.showOn" value="all" /> 全ページ</label>
                      <label><input type="radio" v-model="item.showOn" value="first" /> 最初のページのみ</label>
                      <label><input type="radio" v-model="item.showOn" value="last" /> 最後のページのみ</label>
                    </div>
                  </div>

                  <div class="o-form-group">
                    <label>タイプ</label>
                    <div class="radio-group">
                      <label><input type="radio" v-model="item.type" value="text" @change="onHFTypeChange(item)" /> テキスト</label>
                      <label><input type="radio" v-model="item.type" value="columns" @change="onHFTypeChange(item)" /> カラム</label>
                      <label><input type="radio" v-model="item.type" value="table" @change="onHFTypeChange(item)" /> テーブル</label>
                    </div>
                  </div>

                  <div class="o-divider"></div>

                  <!-- テキストタイプ -->
                  <template v-if="item.type === 'text'">
                    <div class="o-form-group">
                      <label>テキスト</label>
                      <input v-model="item.text" class="o-input" placeholder="{{date}} - タイトル" />
                    </div>
                  </template>

                  <!-- カラムタイプ -->
                  <template v-if="item.type === 'columns'">
                    <div class="o-form-group">
                      <label>カラム</label>
                      <div class="columns-editor">
                        <div v-for="(col, colIdx) in item.columns" :key="colIdx" class="column-row">
                          <input v-model="col.text" class="o-input" placeholder="テキスト" style="flex: 1" />
                          <select v-model="col.width" class="o-input" style="width: 100px">
                            <option value="auto">自動</option>
                            <option value="*">均等</option>
                          </select>
                          <select v-model="col.alignment" class="o-input" style="width: 80px">
                            <option value="left">左</option>
                            <option value="center">中央</option>
                            <option value="right">右</option>
                          </select>
                          <button class="o-btn-text o-btn-text-danger" @click="removeHFColumn(item, colIdx)">&#x2715;</button>
                        </div>
                        <OButton variant="secondary" @click="addHFColumn(item)">+ カラム追加</OButton>
                      </div>
                    </div>
                  </template>

                  <!-- テーブルタイプ -->
                  <template v-if="item.type === 'table'">
                    <div class="o-form-group">
                      <label>テーブル</label>
                      <div class="table-editor">
                        <div class="table-controls">
                          <OButton variant="secondary" @click="addHFTableRow(item)">行追加</OButton>
                          <OButton variant="secondary" @click="addHFTableCol(item)">列追加</OButton>
                        </div>
                        <table v-if="item.table?.body?.length" class="hf-table">
                          <tbody>
                            <tr v-for="(row, rowIdx) in item.table.body" :key="rowIdx">
                              <td v-for="(cell, cellIdx) in row" :key="cellIdx">
                                <input :value="cell" class="o-input" style="width: 100%" @input="updateTableCell(item, rowIdx, cellIdx, ($event.target as HTMLInputElement).value)" />
                              </td>
                              <td class="action-cell">
                                <button class="o-btn-text o-btn-text-danger" @click="removeHFTableRow(item, rowIdx)">&#x2715;</button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div v-if="item.table?.body?.length && item.table.body[0]?.length" class="table-col-actions">
                          <button
                            v-for="(_, colIdx) in item.table.body[0]"
                            :key="colIdx"
                            class="o-btn-text o-btn-text-danger"
                            @click="removeHFTableCol(item, colIdx)"
                          >列{{ colIdx + 1 }}削除</button>
                        </div>
                      </div>
                    </div>

                    <div class="o-divider"><span>テーブルスタイル</span></div>

                    <div class="o-form-group">
                      <label>ヘッダー行数</label>
                      <div style="display: flex; align-items: center; gap: 8px">
                        <input type="number" :value="item.table?.tableStyle?.headerRows ?? 0" min="0" :max="item.table?.body?.length ?? 0" class="o-input" style="width: 80px" @input="setTableStyle(item, 'headerRows', parseInt(($event.target as HTMLInputElement).value))" />
                        <span class="hint">0の場合はヘッダーなし</span>
                      </div>
                    </div>

                    <div class="o-form-group">
                      <label>ヘッダー背景色</label>
                      <div style="display: flex; align-items: center; gap: 8px">
                        <input type="color" :value="item.table?.tableStyle?.headerBgColor || '#2a3474'" @input="setTableStyle(item, 'headerBgColor', ($event.target as HTMLInputElement).value)" />
                        <input :value="item.table?.tableStyle?.headerBgColor" class="o-input" style="width: 100px" placeholder="#2a3474" @input="setTableStyle(item, 'headerBgColor', ($event.target as HTMLInputElement).value)" />
                      </div>
                    </div>

                    <div class="o-form-group">
                      <label>ヘッダー文字色</label>
                      <div style="display: flex; align-items: center; gap: 8px">
                        <input type="color" :value="item.table?.tableStyle?.headerTextColor || '#ffffff'" @input="setTableStyle(item, 'headerTextColor', ($event.target as HTMLInputElement).value)" />
                        <input :value="item.table?.tableStyle?.headerTextColor" class="o-input" style="width: 100px" placeholder="#ffffff" @input="setTableStyle(item, 'headerTextColor', ($event.target as HTMLInputElement).value)" />
                      </div>
                    </div>

                    <div class="o-form-group">
                      <label>罫線色</label>
                      <div style="display: flex; align-items: center; gap: 8px">
                        <input type="color" :value="item.table?.tableStyle?.borderColor || '#cccccc'" @input="setTableStyle(item, 'borderColor', ($event.target as HTMLInputElement).value)" />
                        <input :value="item.table?.tableStyle?.borderColor" class="o-input" style="width: 100px" placeholder="#cccccc" @input="setTableStyle(item, 'borderColor', ($event.target as HTMLInputElement).value)" />
                      </div>
                    </div>

                    <div class="o-form-group">
                      <label>セル内余白</label>
                      <div style="display: flex; align-items: center; gap: 8px">
                        <input type="number" :value="item.table?.tableStyle?.cellPadding ?? 4" min="0" max="20" class="o-input" style="width: 80px" @input="setTableStyle(item, 'cellPadding', parseInt(($event.target as HTMLInputElement).value))" />
                        <span class="unit">pt</span>
                      </div>
                    </div>

                    <div class="o-form-group">
                      <label>水平方向</label>
                      <div class="radio-group">
                        <label><input type="radio" :checked="(item.table?.tableStyle?.horizontalAlign ?? 'left') === 'left'" @change="setTableStyle(item, 'horizontalAlign', 'left')" /> 左</label>
                        <label><input type="radio" :checked="(item.table?.tableStyle?.horizontalAlign ?? 'left') === 'center'" @change="setTableStyle(item, 'horizontalAlign', 'center')" /> 中央</label>
                        <label><input type="radio" :checked="(item.table?.tableStyle?.horizontalAlign ?? 'left') === 'right'" @change="setTableStyle(item, 'horizontalAlign', 'right')" /> 右</label>
                      </div>
                    </div>

                    <div class="o-form-group">
                      <label>垂直方向</label>
                      <div class="radio-group">
                        <label><input type="radio" :checked="(item.table?.tableStyle?.verticalAlign ?? 'middle') === 'top'" @change="setTableStyle(item, 'verticalAlign', 'top')" /> 上</label>
                        <label><input type="radio" :checked="(item.table?.tableStyle?.verticalAlign ?? 'middle') === 'middle'" @change="setTableStyle(item, 'verticalAlign', 'middle')" /> 中央</label>
                        <label><input type="radio" :checked="(item.table?.tableStyle?.verticalAlign ?? 'middle') === 'bottom'" @change="setTableStyle(item, 'verticalAlign', 'bottom')" /> 下</label>
                      </div>
                    </div>
                  </template>

                  <div class="o-divider"></div>

                  <!-- スタイル設定 -->
                  <h4 class="sub-section-title">スタイル</h4>
                  <div class="o-form-group">
                    <label>フォントサイズ</label>
                    <div style="display: flex; align-items: center; gap: 8px">
                      <input type="number" v-model.number="item.style.fontSize" min="6" max="36" class="o-input" style="width: 80px" />
                      <span class="unit">pt</span>
                    </div>
                  </div>
                  <div class="o-form-group">
                    <label>スタイル</label>
                    <div style="display: flex; gap: 12px">
                      <label><input type="checkbox" v-model="item.style.bold" /> 太字</label>
                      <label><input type="checkbox" v-model="item.style.italic" /> 斜体</label>
                    </div>
                  </div>
                  <div class="o-form-group">
                    <label>配置</label>
                    <div class="radio-group">
                      <label><input type="radio" v-model="item.style.alignment" value="left" /> 左</label>
                      <label><input type="radio" v-model="item.style.alignment" value="center" /> 中央</label>
                      <label><input type="radio" v-model="item.style.alignment" value="right" /> 右</label>
                    </div>
                  </div>
                  <div class="o-form-group">
                    <label>文字色</label>
                    <div style="display: flex; align-items: center; gap: 8px">
                      <input type="color" v-model="item.style.color" />
                      <input v-model="item.style.color" class="o-input" style="width: 100px" placeholder="#000000" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>

        <!-- 列設定 -->
        <div v-show="activeTab === 'columns'" class="settings-section">
            <div class="section-header">
              <h3 class="section-title">出力する列</h3>
              <div class="dropdown-wrap" style="position: relative">
                <OButton variant="primary" @click="columnDropdownOpen = !columnDropdownOpen">
                  + 列を追加 &#x25BC;
                </OButton>
                <div v-if="columnDropdownOpen" class="o-dropdown-menu">
                  <div class="o-dropdown-item" @click="handleAddColumn('single'); columnDropdownOpen = false">単一内容の列</div>
                  <div class="o-dropdown-item" @click="handleAddColumn('multi'); columnDropdownOpen = false">複数内容の列（縦並び）</div>
                </div>
              </div>
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
              <p style="color: #909399; text-align: center; padding: 20px">列が設定されていません</p>
              <div style="text-align: center">
                <div class="dropdown-wrap" style="position: relative; display: inline-block">
                  <OButton variant="primary" @click="emptyColumnDropdownOpen = !emptyColumnDropdownOpen">+ 列を追加 &#x25BC;</OButton>
                  <div v-if="emptyColumnDropdownOpen" class="o-dropdown-menu">
                    <div class="o-dropdown-item" @click="handleAddColumn('single'); emptyColumnDropdownOpen = false">単一内容の列</div>
                    <div class="o-dropdown-item" @click="handleAddColumn('multi'); emptyColumnDropdownOpen = false">複数内容の列</div>
                  </div>
                </div>
              </div>
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
                    <span class="o-badge" :class="col.type === 'single' ? 'o-badge-info' : 'o-badge-warning'">
                      {{ col.type === 'single' ? '単一' : '複数' }}
                    </span>
                  </div>
                  <div class="column-card-actions">
                    <button class="o-btn-text" title="一番上へ" :disabled="index === 0" @click="moveColumnToTop(index)">&#x21C8;</button>
                    <button class="o-btn-text" title="上へ" :disabled="index === 0" @click="moveColumn(index, -1)">&#x2191;</button>
                    <button class="o-btn-text" title="下へ" :disabled="index === template.columns.length - 1" @click="moveColumn(index, 1)">&#x2193;</button>
                    <button class="o-btn-text" title="一番下へ" :disabled="index === template.columns.length - 1" @click="moveColumnToBottom(index)">&#x21CA;</button>
                    <button class="o-btn-text o-btn-text-danger" title="削除" @click="removeColumn(index)">&#x2715;</button>
                  </div>
                </div>

                <!-- 共通設定: ラベルと幅 -->
                <div class="o-form column-form">
                  <div class="o-form-group">
                    <label>ヘッダー</label>
                    <div style="flex: 1">
                      <textarea v-if="col.type === 'multi'" v-model="col.label" class="o-input" rows="2" :placeholder="'複数行の場合は改行で区切る'" style="width: 100%"></textarea>
                      <input v-else v-model="col.label" class="o-input" placeholder="列の表示名" style="width: 100%" />
                      <div v-if="col.type === 'multi'" class="hint">複数行ヘッダーは改行で区切ってください</div>
                    </div>
                  </div>

                  <div class="o-form-group">
                    <label>列幅</label>
                    <div class="width-input">
                      <div class="radio-group">
                        <label><input type="radio" :checked="isAutoWidth(col.width)" @change="setWidthMode(col, 'auto')" /> 自動</label>
                        <label><input type="radio" :checked="!isAutoWidth(col.width)" @change="setWidthMode(col, 'fixed')" /> 固定</label>
                      </div>
                      <template v-if="!isAutoWidth(col.width)">
                        <input type="number" v-model.number="col.width" min="20" max="500" class="o-input" style="width: 80px; margin-left: 12px" />
                        <span class="unit">pt</span>
                      </template>
                    </div>
                  </div>
                </div>

                <!-- 単一内容の場合 -->
                <template v-if="col.type === 'single'">
                  <div class="o-divider content-divider"></div>
                  <div class="content-section">
                    <h4 class="content-title">内容設定</h4>
                    <div class="o-form column-form">
                      <div class="o-form-group">
                        <label>フィールド</label>
                        <select v-model="col.field" class="o-input" style="width: 100%" @change="onSingleFieldChange(col)">
                          <option v-for="field in availableFields" :key="field.key" :value="field.key">
                            {{ field.label }} ({{ field.key }})
                          </option>
                        </select>
                      </div>

                      <div class="o-form-group">
                        <label>表示形式</label>
                        <select v-model="col.renderType" class="o-input" style="width: 100%" @change="onRenderTypeChange(col)">
                          <option value="text">テキスト</option>
                          <option v-if="getFieldType(col.field) === 'date'" value="date">日付</option>
                          <option v-if="fieldSupportBarcode(col.field)" value="qrcode">QRコード</option>
                          <option v-if="fieldSupportBarcode(col.field)" value="barcode">バーコード</option>
                        </select>
                      </div>

                      <!-- バーコード/QRコード設定 -->
                      <template v-if="col.renderType === 'barcode' || col.renderType === 'qrcode'">
                        <div class="o-form-group">
                          <label>{{ col.renderType === 'barcode' ? 'バーコード種類' : 'QRコード種類' }}</label>
                          <select :value="col.barcodeConfig?.format || (col.renderType === 'barcode' ? 'code128' : 'qrcode')" class="o-input" style="width: 100%" @change="setBarcodeFormat(col, ($event.target as HTMLSelectElement).value)">
                            <template v-if="col.renderType === 'barcode'">
                              <option value="code128">Code 128</option>
                              <option value="code39">Code 39</option>
                              <option value="codabar">Codabar (NW-7)</option>
                              <option value="ean13">EAN-13 (JAN)</option>
                              <option value="ean8">EAN-8</option>
                            </template>
                            <template v-else>
                              <option value="qrcode">QRコード</option>
                              <option value="datamatrix">DataMatrix</option>
                            </template>
                          </select>
                        </div>

                        <div class="o-form-group">
                          <label>サイズ</label>
                          <div class="barcode-size-inputs">
                            <input type="number" :value="col.barcodeConfig?.width || (col.renderType === 'barcode' ? 120 : 60)" min="20" max="200" class="o-input" style="width: 80px" @input="setBarcodeSize(col, 'width', parseInt(($event.target as HTMLInputElement).value))" />
                            <span class="size-separator">x</span>
                            <input type="number" :value="col.barcodeConfig?.height || (col.renderType === 'barcode' ? 40 : 60)" min="20" max="200" class="o-input" style="width: 80px" @input="setBarcodeSize(col, 'height', parseInt(($event.target as HTMLInputElement).value))" />
                            <span class="unit">px</span>
                          </div>
                        </div>
                      </template>

                      <!-- 日付フォーマット -->
                      <div class="o-form-group" v-if="col.renderType === 'date'">
                        <label>日付形式</label>
                        <select v-model="col.dateFormat" class="o-input" style="width: 100%">
                          <option value="YYYY/MM/DD">2026/01/04</option>
                          <option value="YYYY-MM-DD">2026-01-04</option>
                          <option value="YYYY年MM月DD日">2026年01月04日</option>
                          <option value="MM/DD">01/04</option>
                          <option value="YYYY/MM/DD HH:mm">2026/01/04 12:30</option>
                          <option value="YYYY-MM-DD HH:mm:ss">2026-01-04 12:30:00</option>
                        </select>
                      </div>

                      <div class="o-divider"></div>
                      <div class="o-form-group">
                        <label>プレビュー用一時データ</label>
                        <div style="flex: 1">
                          <textarea v-model="col.previewData" rows="3" class="o-input" style="width: 100%" placeholder="例: サンプル値（省略可）" @blur="updatePreview"></textarea>
                          <div class="hint">プレビュー時にこのフィールドで使用する一時データ（JSON文字列）。空白の場合はデフォルトデータが使用されます。</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- 複数内容の場合 -->
                <template v-if="col.type === 'multi'">
                  <div class="o-divider content-divider"></div>
                  <div class="content-section">
                    <div class="content-header">
                      <h4 class="content-title">内容設定（{{ col.children?.length || 0 }}件）</h4>
                      <OButton variant="secondary" @click="addChildContent(col)">+ 内容を追加</OButton>
                    </div>

                    <div v-if="!col.children?.length" class="empty-children">
                      <p>内容が設定されていません</p>
                      <OButton variant="primary" @click="addChildContent(col)">内容を追加</OButton>
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
                            <button class="o-btn-text" :disabled="childIndex === 0" @click="moveChildContent(col, childIndex, -1)">&#x2191;</button>
                            <button class="o-btn-text" :disabled="childIndex === (col.children?.length || 0) - 1" @click="moveChildContent(col, childIndex, 1)">&#x2193;</button>
                            <button class="o-btn-text o-btn-text-danger" @click="removeChildContent(col, childIndex)">&#x2715;</button>
                          </div>
                        </div>

                        <div class="o-form child-form">
                          <div class="o-form-group">
                            <label>ラベル</label>
                            <input v-model="child.label" class="o-input" placeholder="省略可（セル内ラベル）" />
                          </div>

                          <div class="o-form-group">
                            <label>フィールド</label>
                            <select v-model="child.field" class="o-input" style="width: 100%" @change="onChildFieldChange(child)">
                              <option v-for="field in availableFields" :key="field.key" :value="field.key">
                                {{ field.label }} ({{ field.key }})
                              </option>
                            </select>
                          </div>

                          <div class="o-form-group">
                            <label>表示形式</label>
                            <select v-model="child.renderType" class="o-input" style="width: 100%" @change="onChildRenderTypeChange(child)">
                              <option value="text">テキスト</option>
                              <option v-if="getFieldType(child.field) === 'date'" value="date">日付</option>
                              <option v-if="fieldSupportBarcode(child.field)" value="qrcode">QRコード</option>
                              <option v-if="fieldSupportBarcode(child.field)" value="barcode">バーコード</option>
                            </select>
                          </div>

                          <!-- 子項目のバーコード設定 -->
                          <template v-if="child.renderType === 'barcode' || child.renderType === 'qrcode'">
                            <div class="o-form-group">
                              <label>{{ child.renderType === 'barcode' ? 'バーコード' : 'QR種類' }}</label>
                              <select :value="child.barcodeConfig?.format || (child.renderType === 'barcode' ? 'code128' : 'qrcode')" class="o-input" style="width: 100%" @change="setChildBarcodeFormat(child, ($event.target as HTMLSelectElement).value)">
                                <template v-if="child.renderType === 'barcode'">
                                  <option value="code128">Code 128</option>
                                  <option value="code39">Code 39</option>
                                  <option value="codabar">Codabar</option>
                                  <option value="ean13">EAN-13</option>
                                  <option value="ean8">EAN-8</option>
                                </template>
                                <template v-else>
                                  <option value="qrcode">QRコード</option>
                                  <option value="datamatrix">DataMatrix</option>
                                </template>
                              </select>
                            </div>

                            <div class="o-form-group">
                              <label>サイズ</label>
                              <div class="barcode-size-inputs small">
                                <input type="number" :value="child.barcodeConfig?.width || (child.renderType === 'barcode' ? 120 : 60)" min="20" max="400" class="o-input" style="width: 80px" @input="setChildBarcodeSize(child, 'width', parseInt(($event.target as HTMLInputElement).value))" />
                                <span class="size-separator">x</span>
                                <input type="number" :value="child.barcodeConfig?.height || (child.renderType === 'barcode' ? 40 : 60)" min="20" max="400" class="o-input" style="width: 80px" @input="setChildBarcodeSize(child, 'height', parseInt(($event.target as HTMLInputElement).value))" />
                                <span class="unit">px</span>
                              </div>
                            </div>
                          </template>

                          <!-- 子項目の日付フォーマット -->
                          <div class="o-form-group" v-if="child.renderType === 'date'">
                            <label>日付形式</label>
                            <select v-model="child.dateFormat" class="o-input" style="width: 100%">
                              <option value="YYYY/MM/DD">2026/01/04</option>
                              <option value="YYYY-MM-DD">2026-01-04</option>
                              <option value="MM/DD">01/04</option>
                            </select>
                          </div>

                          <div class="o-divider"></div>
                          <div class="o-form-group">
                            <label>プレビュー用一時データ</label>
                            <div style="flex: 1">
                              <textarea v-model="child.previewData" rows="3" class="o-input" style="width: 100%" placeholder="例: サンプル値（省略可）" @blur="updatePreview"></textarea>
                              <div class="hint">プレビュー時にこのフィールドで使用する一時データ（JSON文字列）。空白の場合はデフォルトデータが使用されます。</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
        </div>

        <!-- スタイル設定 -->
        <div v-show="activeTab === 'styles'" class="settings-section">
            <h3 class="section-title">スタイル設定</h3>
            <div class="o-form">
              <div class="o-form-group">
                <label>フォントサイズ</label>
                <div style="display: flex; align-items: center; gap: 8px">
                  <input type="number" v-model.number="template.styles.fontSize" min="6" max="24" class="o-input" style="width: 80px" />
                  <span class="unit">pt</span>
                </div>
              </div>
              <div class="o-form-group">
                <label>ヘッダー背景色</label>
                <div style="display: flex; align-items: center; gap: 8px">
                  <input type="color" v-model="template.styles.headerBgColor" />
                  <input v-model="template.styles.headerBgColor" class="o-input" style="width: 120px" placeholder="#2a3474" />
                </div>
              </div>
              <div class="o-form-group">
                <label>ヘッダー文字色</label>
                <div style="display: flex; align-items: center; gap: 8px">
                  <input type="color" v-model="template.styles.headerTextColor" />
                  <input v-model="template.styles.headerTextColor" class="o-input" style="width: 120px" placeholder="#ffffff" />
                </div>
              </div>
              <div class="o-form-group">
                <label>罫線色</label>
                <div style="display: flex; align-items: center; gap: 8px">
                  <input type="color" v-model="template.styles.borderColor" />
                  <input v-model="template.styles.borderColor" class="o-input" style="width: 120px" placeholder="#cccccc" />
                </div>
              </div>
              <div class="o-form-group">
                <label>セル内余白</label>
                <div style="display: flex; align-items: center; gap: 8px">
                  <input type="number" v-model.number="template.styles.cellPadding" min="0" max="20" class="o-input" style="width: 80px" />
                  <span class="unit">pt</span>
                </div>
              </div>

              <div class="o-divider"></div>

              <h4 class="sub-section-title">セル配置</h4>

              <div class="o-form-group">
                <label>水平方向</label>
                <div class="o-segmented">
                  <button :class="{ active: template.styles.horizontalAlign === 'left' }" @click="template.styles.horizontalAlign = 'left'">&#x21E4; 左</button>
                  <button :class="{ active: template.styles.horizontalAlign === 'center' }" @click="template.styles.horizontalAlign = 'center'">&#x2014; 中央</button>
                  <button :class="{ active: template.styles.horizontalAlign === 'right' }" @click="template.styles.horizontalAlign = 'right'">&#x21E5; 右</button>
                </div>
              </div>
            </div>
        </div>

            </div>
          </div>
        </div>
        <div class="editor-right">
          <div class="preview-header">
            <div class="preview-controls">
              <span class="preview-label">プレビュー行数:</span>
              <input type="number" v-model.number="previewRowCount" min="1" max="100" class="o-input" style="width: 100px" />
            </div>
          </div>
          <div class="preview-container">
            <div v-if="previewError" class="preview-error">
              <span class="error-icon" style="font-size: 48px">&#x26A0;</span>
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
      <span class="spinner"></span>
      読み込み中...
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormTemplate, FormTemplateColumn, FormTemplateColumnChild, BarcodeConfig, HeaderFooterItem } from '@/types/formTemplate'
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

// Dropdown state
const columnDropdownOpen = ref(false)
const emptyColumnDropdownOpen = ref(false)

const tabs = [
  { name: 'basic', label: '基本設定' },
  { name: 'page', label: '用紙設定' },
  { name: 'header-footer', label: 'ヘッダー・フッター' },
  { name: 'columns', label: '列設定' },
  { name: 'styles', label: 'スタイル設定' },
]

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
    alert('テンプレートIDが指定されていません')
    return
  }

  try {
    template.value = await fetchFormTemplate(id)
  } catch (e: any) {
    alert(e?.message || 'テンプレートの読み込みに失敗しました')
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

function removeColumn(index: number) {
  if (!template.value) return
  template.value.columns.splice(index, 1)
  template.value.columns.forEach((col, i) => {
    col.order = i
  })
}

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

function onRenderTypeChange(col: FormTemplateColumn) {
  if (col.renderType === 'barcode') {
    col.barcodeConfig = { format: 'code128', width: 120, height: 40 }
  } else if (col.renderType === 'qrcode') {
    col.barcodeConfig = { format: 'qrcode', width: 60, height: 60 }
  } else {
    col.barcodeConfig = undefined
  }
}

function onChildRenderTypeChange(child: FormTemplateColumnChild) {
  if (child.renderType === 'barcode') {
    child.barcodeConfig = { format: 'code128', width: 120, height: 40 }
  } else if (child.renderType === 'qrcode') {
    child.barcodeConfig = { format: 'qrcode', width: 60, height: 60 }
  } else {
    child.barcodeConfig = undefined
  }
}

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

function isAutoWidth(width: number | 'auto' | string | undefined): boolean {
  return width === 'auto' || width === '*' || width === undefined
}

function setWidthMode(col: FormTemplateColumn, mode: string) {
  col.width = mode === 'auto' ? 'auto' : 100
}

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

function removeChildContent(col: FormTemplateColumn, index: number) {
  if (!col.children) return
  col.children.splice(index, 1)
}

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

function getPositionLabel(position: string): string {
  switch (position) {
    case 'header': return 'ヘッダー'
    case 'footer': return 'フッター'
    case 'title': return 'タイトル'
    default: return position
  }
}

function getPositionBadgeClass(position: string): string {
  switch (position) {
    case 'header': return 'success'
    case 'footer': return 'warning'
    case 'title': return 'primary'
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

function removeHFItem(index: number) {
  if (!template.value?.headerFooterItems) return
  template.value.headerFooterItems.splice(index, 1)
}

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

function addHFColumn(item: HeaderFooterItem) {
  if (!item.columns) {
    item.columns = []
  }
  item.columns.push({ text: '', width: '*', alignment: 'left' })
}

function removeHFColumn(item: HeaderFooterItem, index: number) {
  if (!item.columns) return
  item.columns.splice(index, 1)
}

function addHFTableRow(item: HeaderFooterItem) {
  if (!item.table) {
    item.table = { widths: ['*'], body: [['']] }
    return
  }
  const colCount = item.table.body[0]?.length || 1
  item.table.body.push(Array(colCount).fill(''))
}

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

function removeHFTableRow(item: HeaderFooterItem, rowIndex: number) {
  if (!item.table?.body) return
  item.table.body.splice(rowIndex, 1)
}

function removeHFTableCol(item: HeaderFooterItem, colIndex: number) {
  if (!item.table?.body) return
  item.table.widths?.splice(colIndex, 1)
  for (const row of item.table.body) {
    row.splice(colIndex, 1)
  }
}

function updateTableCell(item: HeaderFooterItem, rowIdx: number, cellIdx: number, value: string) {
  if (!item.table?.body?.[rowIdx]) return
  item.table.body[rowIdx][cellIdx] = value
}

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
    alert('保存しました')
  } catch (e: any) {
    alert(e?.message || '保存に失敗しました')
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
    alert(e?.message || 'プレビューの生成に失敗しました')
  } finally {
    previewing.value = false
  }
}

function generateSampleData(type: string): Record<string, any>[] {
  if (type === 'shipment-list-picking') {
    return [
      { sku: 'SKU-001', name: 'サンプル商品A', nameFull: 'サンプル商品A フルネーム', barcode: '4901234567890', coolType: '通常', invoiceType: '発払い宅急便', delivery_size_index: 10, totalQuantity: 5 },
      { sku: 'SKU-002', name: 'サンプル商品B', nameFull: 'サンプル商品B フルネーム', barcode: '4901234567891', coolType: 'クール冷蔵', invoiceType: '宅急便コンパクト', delivery_size_index: 5, totalQuantity: 10 },
    ]
  }

  return [
    { orderNumber: 'ORD-2026-0001', customerManagementNumber: 'CUST-123', ecCompanyName: 'Amazon', carrierName: 'Yamato', invoiceTypeName: 'Takkyubin', shipPlanDate: '2026/01/04', deliveryDatePreference: '2026/01/06', deliveryTimeSlot: '14-16', coolTypeName: 'Normal', products: 'Product A x2, Product B x1', productTotalQuantity: 3, recipientPostalCode: '100-0001', recipientAddress: 'Tokyo Chiyoda-ku', recipientName: 'Tanaka Taro', recipientPhone: '090-1234-5678' },
    { orderNumber: 'ORD-2026-0002', customerManagementNumber: 'CUST-456', ecCompanyName: 'Rakuten', carrierName: 'Sagawa', invoiceTypeName: 'Express', shipPlanDate: '2026/01/04', deliveryDatePreference: '-', deliveryTimeSlot: '-', coolTypeName: 'Frozen', products: 'Product C x5', productTotalQuantity: 5, recipientPostalCode: '150-0002', recipientAddress: 'Tokyo Shibuya-ku', recipientName: 'Suzuki Hanako', recipientPhone: '080-8765-4321' },
  ]
}

function handleBack() {
  router.push('/settings/form-templates')
}

function getPreviewData(): Record<string, any>[] {
  if (!template.value) return []
  const defaultData = generateSampleData(template.value.targetType)
  const rows: Record<string, any>[] = []
  const rowCount = Math.min(previewRowCount.value, 100)

  for (let i = 0; i < rowCount; i++) {
    const rowData: Record<string, any> = {}
    const baseData = defaultData[i % defaultData.length] || {}

    for (const col of template.value.columns) {
      if (col.type === 'single' && col.field) {
        if (col.previewData && col.previewData.trim()) {
          try {
            const parsed = JSON.parse(col.previewData)
            if (Array.isArray(parsed)) {
              rowData[col.field] = parsed[i % parsed.length]
            } else {
              rowData[col.field] = parsed
            }
          } catch (_e) {
            rowData[col.field] = col.previewData
          }
        } else {
          rowData[col.field] = baseData[col.field] ?? ''
        }
      } else if (col.type === 'multi' && col.children) {
        for (const child of col.children) {
          if (child.previewData && child.previewData.trim()) {
            try {
              const parsed = JSON.parse(child.previewData)
              if (Array.isArray(parsed)) {
                rowData[child.field] = parsed[i % parsed.length]
              } else {
                rowData[child.field] = parsed
              }
            } catch (_e) {
              rowData[child.field] = child.previewData
            }
          } else {
            rowData[child.field] = baseData[child.field] ?? ''
          }
        }
      }
    }

    rows.push(rowData)
  }

  return rows
}

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

function debouncedUpdatePreview() {
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer)
  }
  previewDebounceTimer = setTimeout(() => {
    updatePreview()
  }, 500)
}

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
.form-template-editor { display: flex; flex-direction: column; height: 100%; }
.editor-content { flex: 1; min-height: 0; }
.editor-layout { display: flex; gap: 16px; height: 100%; min-height: 600px; }
.editor-left { flex: 0 0 50%; min-width: 0; overflow-y: auto; }
.editor-right { flex: 0 0 50%; min-width: 0; display: flex; flex-direction: column; border: 1px solid #dcdfe6; border-radius: 4px; background: #fff; }
.preview-header { padding: 12px 16px; border-bottom: 1px solid #dcdfe6; background: #f5f7fa; }
.preview-controls { display: flex; align-items: center; gap: 8px; }
.preview-label { font-size: 14px; color: #606266; }
.preview-container { flex: 1; min-height: 0; position: relative; overflow: hidden; }
.preview-iframe { width: 100%; height: 100%; border: none; }
.preview-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: #909399; font-size: 14px; }
.preview-error { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; color: #f56c6c; }
.preview-error p { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
.preview-error .error-message { max-width: 100%; padding: 12px; background: #fef0f0; border: 1px solid #fbc4c4; border-radius: 4px; font-size: 12px; color: #c45656; white-space: pre-wrap; word-break: break-all; overflow: auto; max-height: 200px; }
.settings-section { margin-bottom: 24px; }
.section-title { margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #303133; border-bottom: 1px solid #ebeef5; padding-bottom: 8px; }
.sub-section-title { margin: 0 0 12px; font-size: 14px; font-weight: 500; color: #606266; }
.section-hint { margin: -8px 0 16px; font-size: 12px; color: #909399; line-height: 1.6; }
.hint-sub { margin-left: 8px; color: #a8abb2; }
.hint { margin-top: 4px; font-size: 12px; color: #909399; }
.unit { margin-left: 8px; color: #909399; }
.margin-inputs { display: flex; gap: 16px; flex-wrap: wrap; }
.margin-input { display: flex; align-items: center; gap: 8px; }
.margin-input span { font-size: 12px; color: #606266; width: 20px; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.section-header .section-title { margin: 0; border: none; padding: 0; }
.empty-columns { padding: 40px 0; }
.column-list { display: flex; flex-direction: column; gap: 16px; }
.column-card { background: #fafafa; border: 1px solid #ebeef5; border-radius: 8px; padding: 16px; }
.column-card.is-multi { background: #fef9f0; border-color: #f5dbb3; }
.column-card:hover { border-color: #dcdfe6; }
.column-card.is-multi:hover { border-color: #e6c78c; }
.column-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #ebeef5; }
.column-header-left { display: flex; align-items: center; gap: 8px; }
.column-number { font-weight: 600; color: #2a3474; }
.column-card-actions { display: flex; gap: 4px; }
.column-form { margin: 0; }
.barcode-size-inputs { display: flex; align-items: center; gap: 8px; }
.barcode-size-inputs.small { gap: 4px; }
.size-separator { color: #909399; }
.width-input { display: flex; align-items: center; }
.content-divider { margin: 16px 0; }
.content-section { background: rgba(255, 255, 255, 0.6); border-radius: 6px; padding: 12px; }
.content-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.content-title { margin: 0; font-size: 13px; font-weight: 600; color: #606266; }
.empty-children { text-align: center; padding: 20px; color: #909399; }
.empty-children p { margin: 0 0 12px; }
.children-list { display: flex; flex-direction: column; gap: 12px; }
.child-card { background: #fff; border: 1px solid #e4e7ed; border-radius: 6px; padding: 12px; }
.child-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #e4e7ed; }
.child-number { font-size: 12px; font-weight: 500; color: #909399; }
.child-actions { display: flex; gap: 2px; }
.child-form { margin: 0; }
.loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 48px; color: #909399; }
.spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid #e4e7ed; border-top-color: var(--o-primary, #714B67); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* HF items */
.hf-item-list { display: flex; flex-direction: column; gap: 16px; }
.hf-item-card { background: #fafafa; border: 1px solid #ebeef5; border-radius: 8px; padding: 16px; }
.hf-item-card:hover { border-color: #dcdfe6; }
.hf-item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #ebeef5; }
.hf-header-left { display: flex; align-items: center; gap: 8px; }
.hf-number { font-weight: 600; color: #2a3474; }
.hf-item-actions { display: flex; gap: 4px; }
.hf-form { margin: 0; }
.columns-editor { display: flex; flex-direction: column; gap: 8px; }
.column-row { display: flex; gap: 8px; align-items: center; }
.table-editor { display: flex; flex-direction: column; gap: 8px; }
.table-controls { display: flex; gap: 8px; }
.hf-table { width: 100%; border-collapse: collapse; }
.hf-table td { padding: 4px; border: 1px solid #ebeef5; }
.hf-table .action-cell { width: 40px; border: none; text-align: center; }
.table-col-actions { display: flex; gap: 8px; margin-top: 4px; }

/* o-tabs */
.o-tabs { border: 1px solid #dcdfe6; border-radius: 4px; }
.o-tabs-nav { display: flex; background: #f5f7fa; border-bottom: 1px solid #dcdfe6; }
.o-tab-btn { padding: 10px 16px; border: none; background: none; cursor: pointer; font-size: 13px; color: #606266; border-bottom: 2px solid transparent; transition: all 0.15s; }
.o-tab-btn:hover { color: var(--o-primary, #714B67); }
.o-tab-btn.active { color: var(--o-primary, #714B67); border-bottom-color: var(--o-primary, #714B67); background: #fff; }
.o-tabs-content { padding: 16px; }

/* o-form */
.o-form-group { display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-start; }
.o-form-group > label { width: 140px; flex-shrink: 0; font-size: 13px; color: #606266; padding-top: 6px; }
.o-form-group > input, .o-form-group > select, .o-form-group > textarea { flex: 1; min-width: 0; }

/* Radio group */
.radio-group { display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; }
.radio-group label { display: flex; align-items: center; gap: 4px; cursor: pointer; }

/* o-btn */
.o-btn { display: inline-flex; align-items: center; justify-content: center; padding: 6px 14px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 13px; cursor: pointer; background: #fff; color: #606266; transition: all 0.15s; white-space: nowrap; }
.o-btn:hover { background: #f5f7fa; border-color: #c0c4cc; }
.o-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.o-btn-primary { background: var(--o-primary, #714B67); color: #fff; border-color: var(--o-primary, #714B67); }
.o-btn-primary:hover { opacity: 0.85; }
.o-btn-secondary { background: #fff; color: #606266; border-color: #dcdfe6; }
.o-btn-text { background: none; border: none; padding: 2px 6px; font-size: 12px; cursor: pointer; color: var(--o-primary, #714B67); }
.o-btn-text:hover { text-decoration: underline; }
.o-btn-text:disabled { opacity: 0.4; cursor: not-allowed; text-decoration: none; }
.o-btn-text-danger { color: #f56c6c; }

/* o-input */
.o-input { padding: 6px 10px; border: 1px solid var(--o-border-color, #dee2e6); border-radius: 4px; font-size: 13px; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
.o-input:focus { border-color: var(--o-primary, #714B67); }

/* o-badge */
.o-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; line-height: 1.4; }
.o-badge-info { background: #f4f4f5; color: #909399; }
.o-badge-warning { background: #fdf6ec; color: #e6a23c; }
.o-badge-success { background: #f0f9eb; color: #67c23a; }
.o-badge-primary { background: #ecf5ff; color: #409eff; }
.o-badge-danger { background: #fef0f0; color: #f56c6c; }

/* o-divider */
.o-divider { border: none; border-top: 1px solid #ebeef5; margin: 16px 0; }
.o-divider span { background: #fafafa; padding: 0 8px; position: relative; top: -9px; font-size: 12px; color: #909399; }

/* o-toggle */
.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { display: none; }
.o-toggle-slider { width: 36px; height: 20px; background: #ccc; border-radius: 10px; position: relative; transition: background 0.2s; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 2px; left: 2px; transition: transform 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-primary, #714B67); }
.o-toggle input:checked + .o-toggle-slider::after { transform: translateX(16px); }

/* o-segmented */
.o-segmented { display: inline-flex; border: 1px solid #dcdfe6; border-radius: 4px; overflow: hidden; }
.o-segmented button { padding: 6px 14px; border: none; background: #fff; cursor: pointer; font-size: 13px; color: #606266; border-right: 1px solid #dcdfe6; }
.o-segmented button:last-child { border-right: none; }
.o-segmented button.active { background: var(--o-primary, #714B67); color: #fff; }
.o-segmented button:hover:not(.active) { background: #f5f7fa; }

/* Dropdown */
.o-dropdown-menu { position: absolute; top: 100%; left: 0; z-index: 100; min-width: 180px; background: #fff; border: 1px solid #dcdfe6; border-radius: 4px; box-shadow: 0 2px 12px rgba(0,0,0,0.12); margin-top: 4px; }
.o-dropdown-item { padding: 8px 16px; font-size: 13px; cursor: pointer; color: #606266; }
.o-dropdown-item:hover { background: #f5f7fa; color: var(--o-primary, #714B67); }
</style>
