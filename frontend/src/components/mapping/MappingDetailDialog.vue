<template>
  <ODialog
    :open="visibleProxy"
    :title="title"
    @close="visibleProxy = false"
    width="1000px"
  >
    <div class="layout">
      <div class="left">
        <div class="mapping-form">
          <div class="o-form-group">
            <label class="o-form-label">対象フィールド（出力先）</label>
            <span>{{ target ? getTargetDisplayName(target.field) : '未選択' }}</span>
          </div>

          <div class="o-form-group">
            <label class="o-form-label">必須</label>
            <span>{{ target?.required ? 'はい' : 'いいえ' }}</span>
          </div>

          <div v-if="targetDescription" class="o-form-group">
            <label class="o-form-label">説明</label>
            <div class="field-description">{{ targetDescription }}</div>
          </div>

          <div class="o-form-group">
            <label class="o-form-label">デフォルト値</label>
            <input class="o-input" v-model="form.defaultValue" placeholder="空の場合のデフォルト値（任意）" style="width: 100%" />
          </div>

          <div class="o-form-group">
            <label class="o-form-label">入力</label>
            <div class="inputs-list">
              <div v-for="(input, idx) in form.inputs" :key="input.id" class="input-item">
                <div class="input-header">
                  <div class="input-drag-handle">
                    <OButton
                      variant="secondary"
                      size="sm"
                      :disabled="idx === 0"
                      @click="moveInputUp(idx)"
                      title="上へ移動"
                      style="padding: 0 4px; line-height: 1"
                    >&#9650;</OButton>
                    <OButton
                      variant="secondary"
                      size="sm"
                      :disabled="idx === form.inputs.length - 1"
                      @click="moveInputDown(idx)"
                      title="下へ移動"
                      style="padding: 0 4px; line-height: 1"
                    >&#9660;</OButton>
                  </div>
                  <span class="input-number">{{ idx + 1 }}</span>
                  <select
                    class="o-input o-input-sm"
                    v-model="input.type"
                    style="width: 120px"
                    @change="onInputTypeChange(idx)"
                  >
                    <option value="column">列</option>
                    <option value="literal">固定値</option>
                  </select>

                  <select
                    v-if="input.type === 'column'"
                    class="o-input o-input-sm"
                    v-model="input.column"
                    style="width: 200px; margin-left: 8px"
                  >
                    <option value="" disabled>列を選択</option>
                    <option
                      v-for="col in availableColumns"
                      :key="col"
                      :value="col"
                    >{{ col }}</option>
                  </select>

                  <input
                    v-if="input.type === 'literal'"
                    class="o-input o-input-sm"
                    v-model="input.value"
                    placeholder="固定値"
                    style="width: 200px; margin-left: 8px"
                  />

                  <OButton
                    variant="danger"
                    size="sm"
                    @click="removeInput(idx)"
                    style="margin-left: 8px"
                  >削除</OButton>
                </div>

                <div v-if="input.type === 'column'" class="input-pipeline">
                  <div class="pipeline-label">入力パイプライン:</div>
                  <div
                    v-for="(step, stepIdx) in input.pipelineSteps"
                    :key="step.id"
                    class="step-item"
                  >
                    <div class="step-header">
                      <span class="step-number">{{ stepIdx + 1 }}</span>
                      <select
                        class="o-input o-input-sm"
                        v-model="step.plugin"
                        style="width: 180px"
                        @change="onInputStepPluginChange(idx, stepIdx)"
                      >
                        <option value="" disabled>プラグイン</option>
                        <option
                          v-for="p in transformPlugins"
                          :key="p.name"
                          :value="p.name"
                        >{{ p.nameJa || p.name }}</option>
                      </select>
                      <span
                        v-if="step.plugin && getPluginDescription(step.plugin)"
                        class="plugin-help-icon"
                        :title="getPluginDescription(step.plugin)?.replace(/<br>/g, '\n') || ''"
                      >&#63;</span>
                      <OButton
                        variant="danger"
                        size="sm"
                        @click="removeInputStep(idx, stepIdx)"
                        style="margin-left: 8px"
                      >削除</OButton>
                    </div>
                    <div
                      v-if="step.plugin && inputStepFields[idx]?.[stepIdx]"
                      class="step-params"
                    >
                      <!-- lookup.map 特殊处理：键値対編集器 -->
                      <template v-if="step.plugin === 'lookup.map'">
                        <div class="o-form-group" style="margin-bottom: 8px">
                          <label class="o-form-label">レイアウトテーブル</label>
                          <div class="key-value-editor">
                            <div
                              v-for="entry in getLookupMapEntries(step.params)"
                              :key="entry.id"
                              class="key-value-row"
                              style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                            >
                              <input
                                class="o-input o-input-sm"
                                :value="entry.key"
                                placeholder="キー（入力値）"
                                style="width: 130px"
                                @change="(e: Event) => updateLookupMapEntryKey(step.params, entry.key, (e.target as HTMLInputElement).value)"
                              />
                              <span style="color: #909399">→</span>
                              <input
                                class="o-input o-input-sm"
                                :value="entry.value"
                                placeholder="値（出力値）"
                                style="flex: 1"
                                @input="(e: Event) => updateLookupMapEntryValue(step.params, entry.key, (e.target as HTMLInputElement).value)"
                              />
                              <OButton
                                variant="danger"
                                size="sm"
                                @click="removeLookupMapEntry(step.params, entry.key)"
                              >削除</OButton>
                            </div>
                            <OButton
                              variant="primary"
                              size="sm"
                              @click="addLookupMapEntry(step.params)"
                              style="margin-top: 4px"
                            >+ レイアウト追加</OButton>
                          </div>
                        </div>
                        <div
                          v-for="field in inputStepFields[idx][stepIdx].filter((f) => f.key !== 'cases')"
                          :key="field.key"
                          class="o-form-group"
                          style="margin-bottom: 4px"
                        >
                          <label class="o-form-label">{{ field.label }}</label>
                          <input
                            v-if="field.type === 'string'"
                            class="o-input o-input-sm"
                            v-model="step.params[field.key]"
                            :placeholder="field.placeholder"
                            style="width: 100%"
                          />
                          <label v-else-if="field.type === 'boolean'" class="o-toggle">
                            <input type="checkbox" v-model="step.params[field.key]" />
                            <span class="o-toggle-slider"></span>
                          </label>
                        </div>
                      </template>
                      <!-- lookup.contains 特殊処理：部分一致ルール編集器 -->
                      <template v-else-if="step.plugin === 'lookup.contains'">
                        <div class="o-form-group" style="margin-bottom: 8px">
                          <label class="o-form-label">部分一致ルール</label>
                          <div class="key-value-editor">
                            <div
                              v-for="(rule, ruleIdx) in (step.params.rules || [])"
                              :key="ruleIdx"
                              class="key-value-row"
                              style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                            >
                              <input
                                class="o-input o-input-sm"
                                v-model="rule.search"
                                placeholder="検索文字列（含む）"
                                style="width: 150px"
                              />
                              <span style="color: #909399">→</span>
                              <input
                                class="o-input o-input-sm"
                                v-model="rule.value"
                                placeholder="出力値"
                                style="flex: 1"
                              />
                              <OButton
                                variant="danger"
                                size="sm"
                                @click="removeLookupContainsRule(step.params, Number(ruleIdx))"
                              >削除</OButton>
                            </div>
                            <OButton
                              variant="primary"
                              size="sm"
                              @click="addLookupContainsRule(step.params)"
                              style="margin-top: 4px"
                            >+ ルール追加</OButton>
                          </div>
                        </div>
                        <div
                          v-for="field in inputStepFields[idx][stepIdx].filter((f) => f.key !== 'rules')"
                          :key="field.key"
                          class="o-form-group"
                          style="margin-bottom: 4px"
                        >
                          <label class="o-form-label">{{ field.label }}</label>
                          <input
                            v-if="field.type === 'string'"
                            class="o-input o-input-sm"
                            v-model="step.params[field.key]"
                            :placeholder="field.placeholder"
                            style="width: 100%"
                          />
                          <label v-else-if="field.type === 'boolean'" class="o-toggle">
                            <input type="checkbox" v-model="step.params[field.key]" />
                            <span class="o-toggle-slider"></span>
                          </label>
                        </div>
                      </template>
                      <!-- string.replace 特殊処理：置換ルール編集器 -->
                      <template v-else-if="step.plugin === 'string.replace'">
                        <div class="o-form-group" style="margin-bottom: 8px">
                          <label class="o-form-label">置換ルール</label>
                          <div class="key-value-editor">
                            <div
                              v-for="(rule, ruleIdx) in (step.params.rules || [])"
                              :key="ruleIdx"
                              class="key-value-row"
                              style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                            >
                              <input
                                class="o-input o-input-sm"
                                v-model="rule.search"
                                placeholder="検索文字列"
                                style="width: 120px"
                              />
                              <span style="color: #909399">→</span>
                              <input
                                class="o-input o-input-sm"
                                v-model="rule.replace"
                                placeholder="置換後"
                                style="width: 120px"
                              />
                              <input
                                type="number"
                                class="o-input o-input-sm"
                                v-model.number="rule.count"
                                :min="0"
                                placeholder="回数"
                                style="width: 80px"
                              />
                              <span style="color: #909399; font-size: 11px">回(0=全部)</span>
                              <OButton
                                variant="danger"
                                size="sm"
                                @click="removeStringReplaceRule(step.params, Number(ruleIdx))"
                              >削除</OButton>
                            </div>
                            <OButton
                              variant="primary"
                              size="sm"
                              @click="addStringReplaceRule(step.params)"
                              style="margin-top: 4px"
                            >+ ルール追加</OButton>
                          </div>
                        </div>
                      </template>
                      <!-- date.parse / date.format 特殊処理 -->
                      <template v-else-if="step.plugin === 'date.parse' || step.plugin === 'date.format'">
                        <div
                          v-for="field in inputStepFields[idx][stepIdx]"
                          :key="field.key"
                          class="o-form-group"
                          style="margin-bottom: 4px"
                        >
                          <label class="o-form-label">{{ field.label }}</label>
                          <!-- formats 配列（date.parse） -->
                          <template v-if="field.key === 'formats' && step.plugin === 'date.parse'">
                            <div class="date-formats-editor">
                              <div
                                v-for="(fmt, fmtIdx) in (step.params.formats || [])"
                                :key="fmtIdx"
                                class="date-format-row"
                                style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                              >
                                <select
                                  class="o-input o-input-sm"
                                  v-model="step.params.formats[fmtIdx]"
                                  style="flex: 1; min-width: 280px"
                                  @change="onDateParseFormatsChanged(step)"
                                >
                                  <option value="" disabled>日付形式を選択</option>
                                  <option
                                    v-for="opt in field.options"
                                    :key="opt.value"
                                    :value="opt.value"
                                  >{{ opt.label }}</option>
                                </select>
                                <OButton
                                  variant="danger"
                                  size="sm"
                                  @click="step.params.formats.splice(fmtIdx, 1)"
                                >削除</OButton>
                              </div>
                              <OButton
                                variant="primary"
                                size="sm"
                                @click="addDateFormat(step.params)"
                                style="margin-top: 4px"
                              >+ 形式を追加</OButton>
                            </div>
                          </template>
                          <!-- precision 選択 -->
                          <select
                            v-else-if="field.key === 'precision'"
                            class="o-input o-input-sm"
                            v-model="step.params[field.key]"
                            style="width: 100%"
                          >
                            <option value="date">日精度（YYYY-MM-DD）</option>
                            <option value="datetime">秒精度（ISO形式）</option>
                          </select>
                          <!-- format/dateFormat/timeFormat ドロップダウン -->
                          <select
                            v-else-if="field.type === 'select' && (field.key === 'format' || field.key === 'dateFormat' || field.key === 'timeFormat')"
                            class="o-input o-input-sm"
                            v-model="step.params[field.key]"
                            style="width: 100%; min-width: 280px"
                          >
                            <option value="" disabled>{{ field.placeholder || '選択' }}</option>
                            <option
                              v-for="opt in field.options"
                              :key="opt.value"
                              :value="opt.value"
                            >{{ opt.label }}</option>
                          </select>
                          <!-- その他のフィールド -->
                          <input
                            v-else-if="field.type === 'string'"
                            class="o-input o-input-sm"
                            v-model="step.params[field.key]"
                            :placeholder="field.placeholder"
                            style="width: 100%"
                          />
                          <input
                            v-else-if="field.type === 'number'"
                            type="number"
                            class="o-input o-input-sm"
                            v-model.number="step.params[field.key]"
                            :min="field.min"
                            :max="field.max"
                            style="width: 100%"
                          />
                          <select
                            v-else-if="field.type === 'select'"
                            class="o-input o-input-sm"
                            v-model="step.params[field.key]"
                            style="width: 100%"
                          >
                            <option
                              v-for="opt in field.options"
                              :key="opt.value"
                              :value="opt.value"
                            >{{ opt.label }}</option>
                          </select>
                          <label v-else-if="field.type === 'boolean'" class="o-toggle">
                            <input type="checkbox" v-model="step.params[field.key]" />
                            <span class="o-toggle-slider"></span>
                          </label>
                        </div>
                      </template>
                      <!-- http.fetchJson 特殊処理：bodyParams 編集器 -->
                      <template v-else-if="step.plugin === 'http.fetchJson'">
                        <div
                          v-for="field in inputStepFields[idx][stepIdx].filter((f) => f.key !== 'bodyParams')"
                          :key="field.key"
                          class="o-form-group"
                          style="margin-bottom: 4px"
                        >
                          <label class="o-form-label">{{ field.label }}</label>
                          <input
                            v-if="field.type === 'string'"
                            class="o-input o-input-sm"
                            v-model="step.params[field.key]"
                            :placeholder="field.placeholder"
                            style="width: 100%"
                          />
                          <input
                            v-else-if="field.type === 'number'"
                            type="number"
                            class="o-input o-input-sm"
                            v-model.number="step.params[field.key]"
                            :min="field.min"
                            :max="field.max"
                            style="width: 100%"
                          />
                          <select
                            v-else-if="field.type === 'select'"
                            class="o-input o-input-sm"
                            v-model="step.params[field.key]"
                            style="width: 100%"
                          >
                            <option
                              v-for="opt in field.options"
                              :key="opt.value"
                              :value="opt.value"
                            >{{ opt.label }}</option>
                          </select>
                        </div>
                        <div
                          v-if="['POST', 'PUT', 'PATCH'].includes(step.params.method || 'GET')"
                          class="o-form-group"
                          style="margin-bottom: 8px"
                        >
                          <label class="o-form-label">Body パラメータ</label>
                          <div class="body-params-editor">
                            <div
                              v-for="(param, paramIdx) in (step.params.bodyParams || [])"
                              :key="paramIdx"
                              class="body-param-row"
                              style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                            >
                              <input
                                class="o-input o-input-sm"
                                v-model="param.key"
                                placeholder="パラメータ名"
                                style="width: 150px"
                              />
                              <select
                                class="o-input o-input-sm"
                                v-model="param.source"
                                style="width: 120px"
                                @change="onBodyParamSourceChange(param)"
                              >
                                <option value="literal">固定値</option>
                                <option value="column">列から取得</option>
                              </select>
                              <input
                                v-if="param.source === 'literal'"
                                class="o-input o-input-sm"
                                v-model="param.value"
                                placeholder="固定値"
                                style="flex: 1"
                              />
                              <select
                                v-else-if="param.source === 'column'"
                                class="o-input o-input-sm"
                                v-model="param.column"
                                style="flex: 1"
                              >
                                <option value="" disabled>列を選択</option>
                                <option
                                  v-for="col in availableColumns"
                                  :key="col"
                                  :value="col"
                                >{{ col }}</option>
                              </select>
                              <OButton
                                variant="danger"
                                size="sm"
                                @click="removeBodyParam(step.params, Number(paramIdx))"
                              >削除</OButton>
                            </div>
                            <OButton
                              variant="primary"
                              size="sm"
                              @click="addBodyParam(step.params)"
                              style="margin-top: 4px"
                            >+ パラメータ追加</OButton>
                          </div>
                        </div>
                      </template>
                      <!-- string.insertSymbol 特殊処理：positions 編集器 -->
                      <template v-else-if="step.plugin === 'string.insertSymbol'">
                        <div class="o-form-group" style="margin-bottom: 8px">
                          <label class="o-form-label">挿入位置</label>
                          <div class="positions-editor">
                            <div
                              v-for="(pos, posIdx) in (step.params.positions || [])"
                              :key="posIdx"
                              class="position-row"
                              style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                            >
                              <input
                                type="number"
                                class="o-input o-input-sm"
                                v-model.number="step.params.positions[posIdx]"
                                :min="0"
                                placeholder="位置（0から始まる）"
                                style="flex: 1"
                              />
                              <OButton
                                variant="danger"
                                size="sm"
                                :disabled="(step.params.positions || []).length <= 1"
                                @click="removeInsertSymbolPosition(step.params, Number(posIdx))"
                              >削除</OButton>
                            </div>
                            <OButton
                              variant="primary"
                              size="sm"
                              @click="addInsertSymbolPosition(step.params)"
                              style="margin-top: 4px"
                            >+ 位置追加</OButton>
                          </div>
                        </div>
                        <div
                          v-for="field in inputStepFields[idx][stepIdx].filter((f) => f.key !== 'positions')"
                          :key="field.key"
                          class="o-form-group"
                          style="margin-bottom: 4px"
                        >
                          <label class="o-form-label">{{ field.label }}</label>
                          <input
                            v-if="field.type === 'string'"
                            class="o-input o-input-sm"
                            v-model="step.params[field.key]"
                            :placeholder="field.placeholder"
                            style="width: 100%"
                          />
                        </div>
                      </template>
                      <!-- その他プラグインのデフォルト処理 -->
                      <template v-else>
                        <div
                          v-for="field in inputStepFields[idx][stepIdx]"
                          :key="field.key"
                          class="o-form-group"
                          style="margin-bottom: 4px"
                        >
                          <label class="o-form-label">{{ field.label }}</label>
                          <input
                            v-if="field.type === 'string'"
                            class="o-input o-input-sm"
                            v-model="step.params[field.key]"
                            :placeholder="field.placeholder"
                            style="width: 100%"
                          />
                          <input
                            v-else-if="field.type === 'number'"
                            type="number"
                            class="o-input o-input-sm"
                            v-model.number="step.params[field.key]"
                            :min="field.min"
                            :max="field.max"
                            style="width: 100%"
                          />
                          <select
                            v-else-if="field.type === 'select'"
                            class="o-input o-input-sm"
                            v-model="step.params[field.key]"
                            style="width: 100%"
                          >
                            <option
                              v-for="opt in field.options"
                              :key="opt.value"
                              :value="opt.value"
                            >{{ opt.label }}</option>
                          </select>
                          <label v-else-if="field.type === 'boolean'" class="o-toggle">
                            <input type="checkbox" v-model="step.params[field.key]" />
                            <span class="o-toggle-slider"></span>
                          </label>
                        </div>
                      </template>
                    </div>
                  </div>
                  <OButton
                    variant="primary"
                    size="sm"
                    @click="addInputStep(idx)"
                    style="margin-top: 4px"
                  >+ 入力変換を追加</OButton>
                </div>
              </div>
              <OButton variant="primary" size="sm" @click="addInput" style="margin-top: 8px">
                + 入力変換を追加
              </OButton>
            </div>
          </div>


          <div class="o-form-group">
            <label class="o-form-label">出力パイプライン</label>
            <div class="pipeline-steps">
              <div
                v-for="(step, stepIdx) in form.outputPipelineSteps"
                :key="step.id"
                class="step-item"
              >
                <div class="step-header">
                  <span class="step-number">{{ stepIdx + 1 }}</span>
                  <select
                    class="o-input o-input-sm"
                    v-model="step.plugin"
                    style="width: 180px"
                    @change="onOutputStepPluginChange(stepIdx)"
                  >
                    <option value="" disabled>プラグイン</option>
                    <option
                      v-for="p in transformPlugins"
                      :key="p.name"
                      :value="p.name"
                    >{{ p.nameJa || p.name }}</option>
                  </select>
                  <span
                    v-if="step.plugin && getPluginDescription(step.plugin)"
                    class="plugin-help-icon"
                    :title="getPluginDescription(step.plugin)?.replace(/<br>/g, '\n') || ''"
                  >&#63;</span>
                  <OButton
                    variant="danger"
                    size="sm"
                    @click="removeOutputStep(stepIdx)"
                    style="margin-left: 8px"
                  >削除</OButton>
                </div>
                <div v-if="step.plugin && outputStepFields[stepIdx]" class="step-params">
                  <!-- lookup.map 特殊処理：キー値対編集器 -->
                  <template v-if="step.plugin === 'lookup.map'">
                    <div class="o-form-group" style="margin-bottom: 8px">
                      <label class="o-form-label">レイアウトテーブル</label>
                      <div class="key-value-editor">
                        <div
                          v-for="entry in getLookupMapEntries(step.params)"
                          :key="entry.id"
                          class="key-value-row"
                          style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                        >
                          <input
                            class="o-input o-input-sm"
                            :value="entry.key"
                            placeholder="キー（入力値）"
                            style="width: 200px"
                            @change="(e: Event) => updateLookupMapEntryKey(step.params, entry.key, (e.target as HTMLInputElement).value)"
                          />
                          <span style="color: #909399">→</span>
                          <input
                            class="o-input o-input-sm"
                            :value="entry.value"
                            placeholder="値（出力値）"
                            style="flex: 1"
                            @input="(e: Event) => updateLookupMapEntryValue(step.params, entry.key, (e.target as HTMLInputElement).value)"
                          />
                          <OButton
                            variant="danger"
                            size="sm"
                            @click="removeLookupMapEntry(step.params, entry.key)"
                          >削除</OButton>
                        </div>
                        <OButton
                          variant="primary"
                          size="sm"
                          @click="addLookupMapEntry(step.params)"
                          style="margin-top: 4px"
                        >+ レイアウト追加</OButton>
                      </div>
                    </div>
                    <div
                      v-for="field in outputStepFields[stepIdx].filter((f) => f.key !== 'cases')"
                      :key="field.key"
                      class="o-form-group"
                      style="margin-bottom: 4px"
                    >
                      <label class="o-form-label">{{ field.label }}</label>
                      <input
                        v-if="field.type === 'string'"
                        class="o-input o-input-sm"
                        v-model="step.params[field.key]"
                        :placeholder="field.placeholder"
                        style="width: 100%"
                      />
                      <label v-else-if="field.type === 'boolean'" class="o-toggle">
                        <input type="checkbox" v-model="step.params[field.key]" />
                        <span class="o-toggle-slider"></span>
                      </label>
                    </div>
                  </template>
                  <!-- lookup.contains 特殊処理：部分一致ルール編集器 -->
                  <template v-else-if="step.plugin === 'lookup.contains'">
                    <div class="o-form-group" style="margin-bottom: 8px">
                      <label class="o-form-label">部分一致ルール</label>
                      <div class="key-value-editor">
                        <div
                          v-for="(rule, ruleIdx) in (step.params.rules || [])"
                          :key="ruleIdx"
                          class="key-value-row"
                          style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                        >
                          <input
                            class="o-input o-input-sm"
                            v-model="rule.search"
                            placeholder="検索文字列（含む）"
                            style="width: 150px"
                          />
                          <span style="color: #909399">→</span>
                          <input
                            class="o-input o-input-sm"
                            v-model="rule.value"
                            placeholder="出力値"
                            style="flex: 1"
                          />
                          <OButton
                            variant="danger"
                            size="sm"
                            @click="removeLookupContainsRule(step.params, Number(ruleIdx))"
                          >削除</OButton>
                        </div>
                        <OButton
                          variant="primary"
                          size="sm"
                          @click="addLookupContainsRule(step.params)"
                          style="margin-top: 4px"
                        >+ ルール追加</OButton>
                      </div>
                    </div>
                    <div
                      v-for="field in outputStepFields[stepIdx].filter((f) => f.key !== 'rules')"
                      :key="field.key"
                      class="o-form-group"
                      style="margin-bottom: 4px"
                    >
                      <label class="o-form-label">{{ field.label }}</label>
                      <input
                        v-if="field.type === 'string'"
                        class="o-input o-input-sm"
                        v-model="step.params[field.key]"
                        :placeholder="field.placeholder"
                        style="width: 100%"
                      />
                      <label v-else-if="field.type === 'boolean'" class="o-toggle">
                        <input type="checkbox" v-model="step.params[field.key]" />
                        <span class="o-toggle-slider"></span>
                      </label>
                    </div>
                  </template>
                  <!-- string.replace 特殊処理：置換ルール編集器 -->
                  <template v-else-if="step.plugin === 'string.replace'">
                    <div class="o-form-group" style="margin-bottom: 8px">
                      <label class="o-form-label">置換ルール</label>
                      <div class="key-value-editor">
                        <div
                          v-for="(rule, ruleIdx) in (step.params.rules || [])"
                          :key="ruleIdx"
                          class="key-value-row"
                          style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                        >
                          <input
                            class="o-input o-input-sm"
                            v-model="rule.search"
                            placeholder="検索文字列"
                            style="width: 120px"
                          />
                          <span style="color: #909399">→</span>
                          <input
                            class="o-input o-input-sm"
                            v-model="rule.replace"
                            placeholder="置換後"
                            style="width: 120px"
                          />
                          <input
                            type="number"
                            class="o-input o-input-sm"
                            v-model.number="rule.count"
                            :min="0"
                            placeholder="回数"
                            style="width: 80px"
                          />
                          <span style="color: #909399; font-size: 11px">回(0=全部)</span>
                          <OButton
                            variant="danger"
                            size="sm"
                            @click="removeStringReplaceRule(step.params, Number(ruleIdx))"
                          >削除</OButton>
                        </div>
                        <OButton
                          variant="primary"
                          size="sm"
                          @click="addStringReplaceRule(step.params)"
                          style="margin-top: 4px"
                        >+ ルール追加</OButton>
                      </div>
                    </div>
                  </template>
                  <!-- http.fetchJson 特殊処理：bodyParams 編集器 -->
                  <template v-else-if="step.plugin === 'http.fetchJson'">
                    <div
                      v-for="field in outputStepFields[stepIdx].filter((f) => f.key !== 'bodyParams')"
                      :key="field.key"
                      class="o-form-group"
                      style="margin-bottom: 4px"
                    >
                      <label class="o-form-label">{{ field.label }}</label>
                      <input
                        v-if="field.type === 'string'"
                        class="o-input o-input-sm"
                        v-model="step.params[field.key]"
                        :placeholder="field.placeholder"
                        style="width: 100%"
                      />
                      <input
                        v-else-if="field.type === 'number'"
                        type="number"
                        class="o-input o-input-sm"
                        v-model.number="step.params[field.key]"
                        :min="field.min"
                        :max="field.max"
                        style="width: 100%"
                      />
                      <select
                        v-else-if="field.type === 'select'"
                        class="o-input o-input-sm"
                        v-model="step.params[field.key]"
                        style="width: 100%"
                      >
                        <option
                          v-for="opt in field.options"
                          :key="opt.value"
                          :value="opt.value"
                        >{{ opt.label }}</option>
                      </select>
                    </div>
                    <div
                      v-if="['POST', 'PUT', 'PATCH'].includes(step.params.method || 'GET')"
                      class="o-form-group"
                      style="margin-bottom: 8px"
                    >
                      <label class="o-form-label">Body パラメータ</label>
                      <div class="body-params-editor">
                        <div
                          v-for="(param, paramIdx) in (step.params.bodyParams || [])"
                          :key="paramIdx"
                          class="body-param-row"
                          style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                        >
                          <input
                            class="o-input o-input-sm"
                            v-model="param.key"
                            placeholder="パラメータ名"
                            style="width: 150px"
                          />
                          <select
                            class="o-input o-input-sm"
                            v-model="param.source"
                            style="width: 120px"
                            @change="onBodyParamSourceChange(param)"
                          >
                            <option value="literal">固定値</option>
                            <option value="column">列から取得</option>
                          </select>
                          <input
                            v-if="param.source === 'literal'"
                            class="o-input o-input-sm"
                            v-model="param.value"
                            placeholder="固定値"
                            style="flex: 1"
                          />
                          <select
                            v-else-if="param.source === 'column'"
                            class="o-input o-input-sm"
                            v-model="param.column"
                            style="flex: 1"
                          >
                            <option value="" disabled>列を選択</option>
                            <option
                              v-for="col in availableColumns"
                              :key="col"
                              :value="col"
                            >{{ col }}</option>
                          </select>
                          <OButton
                            variant="danger"
                            size="sm"
                            @click="removeBodyParam(step.params, Number(paramIdx))"
                          >削除</OButton>
                        </div>
                        <OButton
                          variant="primary"
                          size="sm"
                          @click="addBodyParam(step.params)"
                          style="margin-top: 4px"
                        >+ パラメータ追加</OButton>
                      </div>
                    </div>
                  </template>
                  <!-- date.parse / date.format 特殊処理 -->
                  <template v-else-if="step.plugin === 'date.parse' || step.plugin === 'date.format'">
                    <div
                      v-for="field in outputStepFields[stepIdx]"
                      :key="field.key"
                      class="o-form-group"
                      style="margin-bottom: 4px"
                    >
                      <label class="o-form-label">{{ field.label }}</label>
                      <!-- formats 配列（date.parse） -->
                      <template v-if="field.key === 'formats' && step.plugin === 'date.parse'">
                        <div class="date-formats-editor">
                          <div
                            v-for="(fmt, fmtIdx) in (step.params.formats || [])"
                            :key="fmtIdx"
                            class="date-format-row"
                            style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                          >
                            <select
                              class="o-input o-input-sm"
                              v-model="step.params.formats[fmtIdx]"
                              style="flex: 1; min-width: 280px"
                              @change="onDateParseFormatsChanged(step)"
                            >
                              <option value="" disabled>日付形式を選択</option>
                              <option
                                v-for="opt in field.options"
                                :key="opt.value"
                                :value="opt.value"
                              >{{ opt.label }}</option>
                            </select>
                            <OButton
                              variant="danger"
                              size="sm"
                              @click="step.params.formats.splice(fmtIdx, 1)"
                            >削除</OButton>
                          </div>
                          <OButton
                            variant="primary"
                            size="sm"
                            @click="addDateFormat(step.params)"
                            style="margin-top: 4px"
                          >+ 形式を追加</OButton>
                        </div>
                      </template>
                      <!-- precision 選択 -->
                      <select
                        v-else-if="field.key === 'precision'"
                        class="o-input o-input-sm"
                        v-model="step.params[field.key]"
                        style="width: 100%"
                      >
                        <option value="date">日精度（YYYY-MM-DD）</option>
                        <option value="datetime">秒精度（ISO形式）</option>
                      </select>
                      <!-- format/dateFormat/timeFormat ドロップダウン -->
                      <select
                        v-else-if="field.type === 'select' && (field.key === 'format' || field.key === 'dateFormat' || field.key === 'timeFormat')"
                        class="o-input o-input-sm"
                        v-model="step.params[field.key]"
                        style="width: 100%; min-width: 280px"
                      >
                        <option value="" disabled>{{ field.placeholder || '選択' }}</option>
                        <option
                          v-for="opt in field.options"
                          :key="opt.value"
                          :value="opt.value"
                        >{{ opt.label }}</option>
                      </select>
                      <!-- その他のフィールド -->
                      <input
                        v-else-if="field.type === 'string'"
                        class="o-input o-input-sm"
                        v-model="step.params[field.key]"
                        :placeholder="field.placeholder"
                        style="width: 100%"
                      />
                      <input
                        v-else-if="field.type === 'number'"
                        type="number"
                        class="o-input o-input-sm"
                        v-model.number="step.params[field.key]"
                        :min="field.min"
                        :max="field.max"
                        style="width: 100%"
                      />
                      <select
                        v-else-if="field.type === 'select'"
                        class="o-input o-input-sm"
                        v-model="step.params[field.key]"
                        style="width: 100%"
                      >
                        <option
                          v-for="opt in field.options"
                          :key="opt.value"
                          :value="opt.value"
                        >{{ opt.label }}</option>
                      </select>
                      <label v-else-if="field.type === 'boolean'" class="o-toggle">
                        <input type="checkbox" v-model="step.params[field.key]" />
                        <span class="o-toggle-slider"></span>
                      </label>
                    </div>
                  </template>
                  <!-- string.insertSymbol 特殊処理：positions 編集器 -->
                  <template v-else-if="step.plugin === 'string.insertSymbol'">
                    <div class="o-form-group" style="margin-bottom: 8px">
                      <label class="o-form-label">挿入位置</label>
                      <div class="positions-editor">
                        <div
                          v-for="(pos, posIdx) in (step.params.positions || [])"
                          :key="posIdx"
                          class="position-row"
                          style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                        >
                          <input
                            type="number"
                            class="o-input o-input-sm"
                            v-model.number="step.params.positions[posIdx]"
                            :min="0"
                            placeholder="位置（0から始まる）"
                            style="flex: 1"
                          />
                          <OButton
                            variant="danger"
                            size="sm"
                            :disabled="(step.params.positions || []).length <= 1"
                            @click="removeInsertSymbolPosition(step.params, Number(posIdx))"
                          >削除</OButton>
                        </div>
                        <OButton
                          variant="primary"
                          size="sm"
                          @click="addInsertSymbolPosition(step.params)"
                          style="margin-top: 4px"
                        >+ 位置追加</OButton>
                      </div>
                    </div>
                    <div
                      v-for="field in outputStepFields[stepIdx].filter((f) => f.key !== 'positions')"
                      :key="field.key"
                      class="o-form-group"
                      style="margin-bottom: 4px"
                    >
                      <label class="o-form-label">{{ field.label }}</label>
                      <input
                        v-if="field.type === 'string'"
                        class="o-input o-input-sm"
                        v-model="step.params[field.key]"
                        :placeholder="field.placeholder"
                        style="width: 100%"
                      />
                    </div>
                  </template>
                  <!-- その他プラグインのデフォルト処理 -->
                  <template v-else>
                    <div
                      v-for="field in outputStepFields[stepIdx]"
                      :key="field.key"
                      class="o-form-group"
                      style="margin-bottom: 4px"
                    >
                      <label class="o-form-label">{{ field.label }}</label>
                      <input
                        v-if="field.type === 'string'"
                        class="o-input o-input-sm"
                        v-model="step.params[field.key]"
                        :placeholder="field.placeholder"
                        style="width: 100%"
                      />
                      <input
                        v-else-if="field.type === 'number'"
                        type="number"
                        class="o-input o-input-sm"
                        v-model.number="step.params[field.key]"
                        :min="field.min"
                        :max="field.max"
                        style="width: 100%"
                      />
                      <select
                        v-else-if="field.type === 'select'"
                        class="o-input o-input-sm"
                        v-model="step.params[field.key]"
                        style="width: 100%"
                      >
                        <option
                          v-for="opt in field.options"
                          :key="opt.value"
                          :value="opt.value"
                        >{{ opt.label }}</option>
                      </select>
                      <label v-else-if="field.type === 'boolean'" class="o-toggle">
                        <input type="checkbox" v-model="step.params[field.key]" />
                        <span class="o-toggle-slider"></span>
                      </label>
                    </div>
                  </template>
                </div>
              </div>
              <OButton
                variant="primary"
                size="sm"
                @click="addOutputStep"
                style="margin-top: 4px"
              >+ 出力変換を追加</OButton>
            </div>
          </div>
        </div>
      </div>
      <div class="right">
        <div class="preview-title">プレビュー</div>
        <div class="preview-block">
          <div class="preview-label">引用 入力元（Source）列</div>
          <ul class="list">
            <li v-for="col in referencedSources" :key="col">{{ getSourceDisplayName(col) }}</li>
            <li v-if="!referencedSources.length" class="empty">なし</li>
          </ul>
        </div>
        <div class="preview-block">
          <div class="preview-label">出力先（Target）プレビュー</div>
          <div class="preview-value">{{ previewValue }}</div>
        </div>
      </div>
    </div>
    <template #footer>
      <OButton variant="secondary" @click="visibleProxy = false">キャンセル</OButton>
      <OButton variant="primary" @click="handleSubmit">保存</OButton>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { computed, reactive, watch, ref, onMounted } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import { getTransformPlugins, type TransformPluginInfo, type TransformPipeline, type TransformStep, type TransformMapping, type InputSource } from '@/api/mappingConfig'
import { jsonSchemaToFormFields, buildParamsFromForm, type FormField } from '@/utils/transformForm'
import { runTransformMapping } from '@/utils/transformRunner'
import { getOrderFieldDefinitions } from '@/types/order'

interface TargetRow {
  field: string
  required: boolean
}

interface SourceRow {
  name: string
  label?: string
}

const props = defineProps<{
  modelValue: boolean
  target: TargetRow | null
  mapping: TransformMapping | null
  preSelectedSources?: SourceRow[]
  sampleRow?: Record<string, any> | null
  configType?: string
  carrierId?: string | null
  carrierOptions?: any[]
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'submit', mapping: TransformMapping): void
}>()

const visibleProxy = computed({
  get: () => props.modelValue,
  set: (v) => emits('update:modelValue', v),
})

const transformPlugins = ref<TransformPluginInfo[]>([])

// 获取 order 字段定义
const orderFieldDefinitions = getOrderFieldDefinitions()

// 获取 target 字段的详细说明
const targetDescription = computed<string | null>(() => {
  if (!props.target?.field) return null

  // 如果是 order-to-carrier，从 carrier 的 formatDefinition 获取
  if (props.configType === 'order-to-carrier' && props.carrierId && props.carrierOptions) {
    const carrier = props.carrierOptions.find((c) => c._id === props.carrierId)
    if (carrier?.formatDefinition?.columns) {
      const col = carrier.formatDefinition.columns.find((c: any) => c.name === props.target?.field)
      return col?.description || null
    }
  }

  // 如果是 ec-company-to-order，从 order 字段定义获取
  if (props.configType === 'ec-company-to-order') {
    const def = orderFieldDefinitions.find((d) => d.dataKey === props.target?.field)
    return def?.description || null
  }

  return null
})

interface FormInput {
  id: string
  type: 'column' | 'literal'
  column?: string
  value?: any
  pipelineSteps: Array<{ id: string; plugin: string; params: Record<string, any> }>
}

const form = reactive<{
  defaultValue: any
  inputs: FormInput[]
  outputPipelineSteps: Array<{ id: string; plugin: string; params: Record<string, any> }>
}>({
  defaultValue: undefined,
  inputs: [],
  outputPipelineSteps: [],
})

const inputStepFields = ref<FormField[][][]>([]) // [inputIdx][stepIdx][fields]
const outputStepFields = ref<FormField[][]>([]) // [stepIdx][fields]

const availableColumns = computed(() => {
  if (!props.sampleRow) return []
  return Object.keys(props.sampleRow)
})

onMounted(async () => {
  try {
    const plugins = await getTransformPlugins()
    transformPlugins.value = plugins.transforms
  } catch (e) {
    console.error('Failed to load plugins:', e)
  }
})

// 获取插件描述（用于 hover 提示）
const getPluginDescription = (pluginName: string): string | null => {
  const plugin = transformPlugins.value.find((p) => p.name === pluginName)
  if (!plugin?.descriptionJa) return null
  // 将换行符转换为 HTML <br> 标签
  return plugin.descriptionJa.replace(/\n/g, '<br>')
}

watch(
  () => [props.mapping, props.modelValue, props.preSelectedSources] as const,
  ([m, visible, preSelected]) => {
    if (visible) {
      if (m) {
        // 已有 mapping，加载它
        form.defaultValue = m.defaultValue
        form.inputs = m.inputs
          .filter((inp) => inp.type === 'column' || inp.type === 'literal')
          .map((inp) => ({
            id: inp.id,
            type: inp.type as 'column' | 'literal',
            column: inp.type === 'column' ? inp.column : undefined,
            value: inp.type === 'literal' ? inp.value : undefined,
            pipelineSteps: inp.pipeline?.steps?.map((s) => ({
              id: s.id,
              plugin: s.plugin,
              params: s.params || {},
            })) || [],
          }))
        form.outputPipelineSteps = m.outputPipeline?.steps?.map((s) => ({
          id: s.id,
          plugin: s.plugin,
          params: s.params || {},
        })) || []

        // 初始化字段配置
        inputStepFields.value = form.inputs.map((inp) =>
          inp.pipelineSteps.map(() => [] as FormField[]),
        )
        outputStepFields.value = form.outputPipelineSteps.map(() => [] as FormField[])

        // 加载每个步骤的字段配置
        form.inputs.forEach((inp, inpIdx) => {
          inp.pipelineSteps.forEach((step, stepIdx) => {
            if (step.plugin) {
              onInputStepPluginChange(inpIdx, stepIdx)
            }
          })
        })
        form.outputPipelineSteps.forEach((step, stepIdx) => {
          if (step.plugin) {
            onOutputStepPluginChange(stepIdx)
          }
        })
      } else if (preSelected && preSelected.length > 0) {
        // 没有 mapping 但有预选的 sources，自动添加它们
        form.defaultValue = undefined
        form.inputs = preSelected.map((src, idx) => ({
          id: `input-${Date.now()}-${idx}`,
          type: 'column' as const,
          column: src.name,
          pipelineSteps: [], // 不添加 step
        }))
        form.outputPipelineSteps = []
        inputStepFields.value = form.inputs.map(() => [])
        outputStepFields.value = []
      } else {
        // 全新开始
        form.defaultValue = undefined
        form.inputs = []
        form.outputPipelineSteps = []
        inputStepFields.value = []
        outputStepFields.value = []
      }
    }
  },
  { immediate: true },
)

// 获取字段显示名称
const getFieldDisplayName = (fieldKey: string): string => {
  if (!fieldKey) return ''

  // 从 orderFieldDefinitions 中查找
  const fieldDef = orderFieldDefinitions.find((f) => f.key === fieldKey || f.dataKey === fieldKey)
  if (fieldDef?.title) return fieldDef.title

  // 尝试匹配基础字段名（处理嵌套路径）
  const baseField = fieldKey.split('.')[0]
  if (baseField) {
    const baseDef = orderFieldDefinitions.find((f) => f.key === baseField || f.dataKey === baseField)
    if (baseDef?.title) return baseDef.title
  }

  return fieldKey
}

// 获取 Source 显示名称
const getSourceDisplayName = (sourceKey: string): string => {
  if (!sourceKey) return ''

  // 如果 preSelectedSources 中有对应的 source，使用其 label
  if (props.preSelectedSources) {
    const source = props.preSelectedSources.find((s) => s.name === sourceKey)
    if (source?.label) return source.label
  }

  // 否则从 orderFieldDefinitions 中查找
  return getFieldDisplayName(sourceKey)
}

// 获取 Target 显示名称
const getTargetDisplayName = (targetKey: string): string => {
  if (!targetKey) return ''

  // 如果 target 有 label，使用它
  if (props.target && 'label' in props.target && (props.target as any).label) {
    return (props.target as any).label
  }

  // 否则从 orderFieldDefinitions 中查找
  return getFieldDisplayName(targetKey)
}

const title = computed(() => {
  const targetName = props.target ? getTargetDisplayName(props.target.field) : ''
  if (props.preSelectedSources && props.preSelectedSources.length > 0) {
    return `変換付き紐付け: ${targetName}`
  }
  return `紐付け項目の詳細設定: ${targetName}`
})

const referencedSources = computed(() => {
  return form.inputs.filter((i) => i.type === 'column').map((i) => i.column || '')
})

// 预览值（使用 transformRunner 确保与实際導入一致）
const previewValue = ref<string>('（計算中...）')

// 构建当前的 TransformMapping 对象（用于预览）
const buildCurrentMapping = (): TransformMapping | null => {
  if (form.inputs.length === 0) return null

  const inputs: InputSource[] = form.inputs.map((inp): InputSource | null => {
    const pipelineSteps: TransformStep[] = inp.pipelineSteps
      .filter((s) => s.plugin) // 只包含已选择插件的步骤
      .map((s) => ({
        id: s.id,
        plugin: s.plugin,
        params: s.params || {},
        enabled: true,
      }))

    const pipeline: TransformPipeline | undefined =
      pipelineSteps.length > 0 ? { steps: pipelineSteps } : undefined

    if (inp.type === 'column') {
      return {
        id: inp.id,
        type: 'column' as const,
        column: inp.column || '',
        pipeline,
      }
    } else if (inp.type === 'literal') {
      return {
        id: inp.id,
        type: 'literal' as const,
        value: inp.value,
        pipeline,
      }
    }
    // generated 类型已移除
    return null
  })
  .filter((inp): inp is InputSource => inp !== null)

  const outputSteps: TransformStep[] = form.outputPipelineSteps
    .filter((s) => s.plugin)
    .map((s) => ({
      id: s.id,
      plugin: s.plugin,
      params: s.params || {},
      enabled: true,
    }))

  const combinePlugin = inputs.length > 1 ? 'combine.concat' : 'combine.first'

  return {
    targetField: props.target?.field || '',
    inputs,
    combine: {
      plugin: combinePlugin,
      params: {},
    },
    outputPipeline: outputSteps.length > 0 ? { steps: outputSteps } : undefined,
    defaultValue: form.defaultValue,
  }
}

// 监听 form 变化，异步更新预览
watch(
  () => [form.inputs, form.outputPipelineSteps, form.defaultValue, props.sampleRow],
  async () => {
    if (!props.sampleRow) {
      previewValue.value = '（サンプルなし）'
      return
    }

    const mapping = buildCurrentMapping()
    if (!mapping) {
      previewValue.value = '（入力なし）'
      return
    }

    try {
      const result = await runTransformMapping(mapping, props.sampleRow)
      // 格式化显示结果
      if (result === null || result === undefined) {
        previewValue.value = '（空）'
      } else if (typeof result === 'object') {
        previewValue.value = JSON.stringify(result)
      } else {
        previewValue.value = String(result)
      }
    } catch (error) {
      console.error('Preview error:', error)
      previewValue.value = `（エラー: ${error instanceof Error ? error.message : 'Unknown error'}）`
    }
  },
  { deep: true, immediate: true }
)

const addInput = () => {
  const id = `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  form.inputs.push({
    id,
    type: 'column',
    column: '',
    pipelineSteps: [],
  })
  inputStepFields.value.push([])
}

const removeInput = (idx: number) => {
  form.inputs.splice(idx, 1)
  inputStepFields.value.splice(idx, 1)
}

const moveInputUp = (idx: number) => {
  if (idx === 0) return
  // 交换 inputs
  const temp = form.inputs[idx]
  const prev = form.inputs[idx - 1]
  if (temp && prev) {
    form.inputs[idx] = prev
    form.inputs[idx - 1] = temp
    // 交换对应的字段配置
    const tempFields = inputStepFields.value[idx]
    const prevFields = inputStepFields.value[idx - 1]
    inputStepFields.value[idx] = prevFields || []
    inputStepFields.value[idx - 1] = tempFields || []
  }
}

const moveInputDown = (idx: number) => {
  if (idx === form.inputs.length - 1) return
  // 交换 inputs
  const temp = form.inputs[idx]
  const next = form.inputs[idx + 1]
  if (temp && next) {
    form.inputs[idx] = next
    form.inputs[idx + 1] = temp
    // 交换对应的字段配置
    const tempFields = inputStepFields.value[idx]
    const nextFields = inputStepFields.value[idx + 1]
    inputStepFields.value[idx] = nextFields || []
    inputStepFields.value[idx + 1] = tempFields || []
  }
}

const addInputStep = (inputIdx: number) => {
  const input = form.inputs[inputIdx]
  if (!input) return
  const id = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  input.pipelineSteps.push({ id, plugin: '', params: {} })
  if (!inputStepFields.value[inputIdx]) inputStepFields.value[inputIdx] = []
  inputStepFields.value[inputIdx].push([])
}

const removeInputStep = (inputIdx: number, stepIdx: number) => {
  const input = form.inputs[inputIdx]
  if (!input) return
  input.pipelineSteps.splice(stepIdx, 1)
  if (inputStepFields.value[inputIdx]) {
    inputStepFields.value[inputIdx].splice(stepIdx, 1)
  }
}

const onInputTypeChange = (idx: number) => {
  const input = form.inputs[idx]
  if (!input) return
  if (input.type === 'column') {
    input.column = ''
  } else if (input.type === 'literal') {
    input.value = ''
  }
}

const onInputStepPluginChange = (inputIdx: number, stepIdx: number) => {
  const input = form.inputs[inputIdx]
  if (!input) return
  const step = input.pipelineSteps[stepIdx]
  if (!step) return

  const pluginInfo = transformPlugins.value.find((p) => p.name === step.plugin)
  if (pluginInfo?.paramsSchema) {
    if (!inputStepFields.value[inputIdx]) inputStepFields.value[inputIdx] = []
    let fields = jsonSchemaToFormFields(pluginInfo.paramsSchema)

    // 特殊处理：date.parse、date.format 和 date.addDays 的格式字段
    if (step.plugin === 'date.parse' || step.plugin === 'date.format' || step.plugin === 'date.addDays') {
      fields = fields.map((field) => {
        // 将 formats 或 format 字段改为下拉选择，并自定义标签
        if (field.key === 'formats') {
          return {
            ...field,
            label: '入力日付形式（複数指定可）',
            type: 'select' as const,
            options: getDateFormatOptions(step.plugin, field.key),
          }
        } else if (field.key === 'format' || field.key === 'dateFormat' || field.key === 'timeFormat') {
          return {
            ...field,
            type: 'select' as const,
            options: getDateFormatOptions(step.plugin, field.key),
          }
        } else if (field.key === 'precision') {
          // 自定义 precision 标签
          return {
            ...field,
            label: step.plugin === 'date.parse' ? 'データベース保存精度（日/秒）' : '出力精度（日/秒）',
          }
        }
        return field
      })
    }

    // date.format: UI should be "convert to what format" (single dropdown),
    // and must NOT depend on carrier column type/format (which may be missing).
    if (step.plugin === 'date.format') {
      fields = [
        {
          key: 'format',
          label: '出力フォーマット',
          type: 'select' as const,
          options: getDateFormatOptions('date.format', 'format'),
          default: 'YYYY/MM/DD',
        } as FormField,
      ]
    }

    inputStepFields.value[inputIdx][stepIdx] = fields
    // 保存现有的参数值（从数据库加载时保留已保存的值）
    const existingParams = { ...step.params }
    step.params = {}
    for (const field of fields) {
      // 如果字段已有值（从数据库加载），保留它；否则使用默认值
      if (existingParams[field.key] !== undefined) {
        step.params[field.key] = existingParams[field.key]
      } else if (field.default !== undefined) {
        step.params[field.key] = field.default
      }
    }
    // 特殊处理：lookup.map 恢复 cases
    if (step.plugin === 'lookup.map') {
      if (existingParams.cases && typeof existingParams.cases === 'object') {
        step.params.cases = existingParams.cases
      } else {
        step.params.cases = {}
      }
    }
    // 特殊处理：lookup.contains 初始化 rules
    if (step.plugin === 'lookup.contains') {
      if (Array.isArray(existingParams.rules)) {
        step.params.rules = existingParams.rules
      } else {
        step.params.rules = []
      }
    }
    // 特殊处理：string.replace 初始化 rules
    if (step.plugin === 'string.replace') {
      if (Array.isArray(existingParams.rules)) {
        step.params.rules = existingParams.rules
      } else {
        step.params.rules = []
      }
    }
    // 特殊处理：http.fetchJson 初始化 bodyParams
    if (step.plugin === 'http.fetchJson' && !step.params.bodyParams) {
      step.params.bodyParams = []
    }
    // 特殊处理：date.parse 初始化 formats 数组和 precision（DB保存精度）
    if (step.plugin === 'date.parse') {
      if (!step.params.formats) {
        step.params.formats = ['YYYY-MM-DD']
      }
      if (!step.params.precision) {
        step.params.precision = inferDateParsePrecision(step.params.formats)
      }
    }
    // 特殊处理：date.format 初始化 precision
    if (step.plugin === 'date.format' && !step.params.precision) {
      step.params.precision = 'datetime'
    }
    // 特殊处理：jp.sliceByWidth 初始化 boundary 默认值为 keepLeft
    if (step.plugin === 'jp.sliceByWidth' && !step.params.boundary) {
      step.params.boundary = 'keepLeft'
    }
    // 特殊处理：string.insertSymbol 初始化 positions 数组
    if (step.plugin === 'string.insertSymbol') {
      if (!Array.isArray(step.params.positions)) {
        step.params.positions = [0]
      } else {
        // 确保所有位置都是数字，过滤掉无效值
        step.params.positions = step.params.positions
          .map((p: any) => (typeof p === 'number' && p >= 0 ? p : 0))
          .filter((p: number, idx: number, arr: number[]) => arr.indexOf(p) === idx) // 去重
        if (step.params.positions.length === 0) {
          step.params.positions = [0]
        }
      }
      if (!step.params.symbol) {
        step.params.symbol = '-'
      }
    }
  } else {
    if (!inputStepFields.value[inputIdx]) inputStepFields.value[inputIdx] = []
    inputStepFields.value[inputIdx][stepIdx] = []
    // 即使没有 paramsSchema，也保留现有参数（可能插件定义已更新）
    // step.params = {} // 注释掉，保留现有参数
  }
}

const addOutputStep = () => {
  const id = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  form.outputPipelineSteps.push({ id, plugin: '', params: {} })
  outputStepFields.value.push([])
}

const removeOutputStep = (stepIdx: number) => {
  form.outputPipelineSteps.splice(stepIdx, 1)
  outputStepFields.value.splice(stepIdx, 1)
}

const onOutputStepPluginChange = (stepIdx: number) => {
  const step = form.outputPipelineSteps[stepIdx]
  if (!step) return

  const pluginInfo = transformPlugins.value.find((p) => p.name === step.plugin)
  if (pluginInfo?.paramsSchema) {
    let fields = jsonSchemaToFormFields(pluginInfo.paramsSchema)

    // 特殊处理：date.parse、date.format 和 date.addDays 的格式字段
    if (step.plugin === 'date.parse' || step.plugin === 'date.format' || step.plugin === 'date.addDays') {
      fields = fields.map((field) => {
        // 将 formats 或 format 字段改为下拉选择，并自定义标签
        if (field.key === 'formats') {
          return {
            ...field,
            label: '入力日付形式（複数指定可）',
            type: 'select' as const,
            options: getDateFormatOptions(step.plugin, field.key),
          }
        } else if (field.key === 'format' || field.key === 'dateFormat' || field.key === 'timeFormat') {
          return {
            ...field,
            type: 'select' as const,
            options: getDateFormatOptions(step.plugin, field.key),
          }
        } else if (field.key === 'precision') {
          // 自定义 precision 标签
          return {
            ...field,
            label: step.plugin === 'date.parse' ? 'データベース保存精度（日/秒）' : '出力精度（日/秒）',
          }
        }
        return field
      })
    }

    // date.format: show a single "output format" dropdown (params.format)
    if (step.plugin === 'date.format') {
      fields = [
        {
          key: 'format',
          label: '出力フォーマット',
          type: 'select' as const,
          options: getDateFormatOptions('date.format', 'format'),
          default: 'YYYY/MM/DD',
        } as FormField,
      ]
    }

    outputStepFields.value[stepIdx] = fields
    // 保存现有的参数值（从数据库加载时保留已保存的值）
    const existingParams = { ...step.params }
    step.params = {}
    for (const field of outputStepFields.value[stepIdx]) {
      // 如果字段已有值（从数据库加载），保留它；否则使用默认值
      if (existingParams[field.key] !== undefined) {
        step.params[field.key] = existingParams[field.key]
      } else if (field.default !== undefined) {
        step.params[field.key] = field.default
      }
    }
    // 特殊处理：lookup.map 恢复 cases
    if (step.plugin === 'lookup.map') {
      if (existingParams.cases && typeof existingParams.cases === 'object') {
        step.params.cases = existingParams.cases
      } else {
        step.params.cases = {}
      }
    }
    // 特殊处理：lookup.contains 初始化 rules
    if (step.plugin === 'lookup.contains') {
      if (Array.isArray(existingParams.rules)) {
        step.params.rules = existingParams.rules
      } else {
        step.params.rules = []
      }
    }
    // 特殊处理：string.replace 初始化 rules
    if (step.plugin === 'string.replace') {
      if (Array.isArray(existingParams.rules)) {
        step.params.rules = existingParams.rules
      } else {
        step.params.rules = []
      }
    }
    // 特殊处理：http.fetchJson 初始化 bodyParams
    if (step.plugin === 'http.fetchJson' && !step.params.bodyParams) {
      step.params.bodyParams = []
    }
    // 特殊处理：date.parse 初始化 formats 数组和 precision（DB保存精度）
    if (step.plugin === 'date.parse') {
      if (!step.params.formats) {
        step.params.formats = ['YYYY-MM-DD']
      }
      if (!step.params.precision) {
        step.params.precision = inferDateParsePrecision(step.params.formats)
      }
    }
    // 特殊处理：date.format 初始化 precision
    if (step.plugin === 'date.format' && !step.params.precision) {
      step.params.precision = 'datetime'
    }
    // 特殊处理：date.addDays 初始化 days（默认30）
    if (step.plugin === 'date.addDays') {
      if (step.params.days === undefined || step.params.days === null) {
        step.params.days = 30
      }
    }
    // 特殊处理：jp.sliceByWidth 初始化 boundary 默认值为 keepLeft
    if (step.plugin === 'jp.sliceByWidth' && !step.params.boundary) {
      step.params.boundary = 'keepLeft'
    }
    // 特殊处理：string.insertSymbol 初始化 positions 数组
    if (step.plugin === 'string.insertSymbol') {
      if (!Array.isArray(step.params.positions)) {
        step.params.positions = [0]
      } else {
        // 确保所有位置都是数字，过滤掉无效值
        step.params.positions = step.params.positions
          .map((p: any) => (typeof p === 'number' && p >= 0 ? p : 0))
          .filter((p: number, idx: number, arr: number[]) => arr.indexOf(p) === idx) // 去重
        if (step.params.positions.length === 0) {
          step.params.positions = [0]
        }
      }
      if (!step.params.symbol) {
        step.params.symbol = '-'
      }
    }
  } else {
    outputStepFields.value[stepIdx] = []
    // 即使没有 paramsSchema，也保留现有参数（可能插件定义已更新）
    // step.params = {} // 注释掉，保留现有参数
  }
}

// 获取日期格式选项
const getDateFormatOptions = (plugin: string, fieldKey: string): Array<{ label: string; value: any }> => {
  const dateFormats = [
    { label: 'YYYY-MM-DD (日まで)', value: 'YYYY-MM-DD', precision: 'date' },
    { label: 'YYYY/MM/DD (日まで)', value: 'YYYY/MM/DD', precision: 'date' },
    { label: 'MM/DD/YYYY (日まで)', value: 'MM/DD/YYYY', precision: 'date' },
    { label: 'DD/MM/YYYY (日まで)', value: 'DD/MM/YYYY', precision: 'date' },
    { label: 'YYYY-MM-DD HH:mm:ss (秒まで)', value: 'YYYY-MM-DD HH:mm:ss', precision: 'datetime' },
    { label: 'YYYY/MM/DD HH:mm:ss (秒まで)', value: 'YYYY/MM/DD HH:mm:ss', precision: 'datetime' },
    { label: 'YYYY-MM-DD HH:mm (分まで)', value: 'YYYY-MM-DD HH:mm', precision: 'datetime' },
    { label: 'YYYY/MM/DD HH:mm (分まで)', value: 'YYYY/MM/DD HH:mm', precision: 'datetime' },
  ]

  if (plugin === 'date.parse') {
    if (fieldKey === 'formats') {
      // formats 是数组，需要特殊处理
      return dateFormats.map((f) => ({ label: f.label, value: f.value }))
    }
  } else if (plugin === 'date.format') {
    if (fieldKey === 'format' || fieldKey === 'dateFormat') {
      // 添加新的格式选项
      const formatOptions = [
        ...dateFormats.map((f) => ({ label: f.label, value: f.value })),
        { label: 'YYYY (年のみ)', value: 'YYYY' },
        { label: 'MM (月のみ、0埋め)', value: 'MM' },
        { label: 'M (月のみ)', value: 'M' },
        { label: 'DD (日のみ、0埋め)', value: 'DD' },
        { label: 'D (日のみ)', value: 'D' },
        { label: 'YYYY年MM月DD日 (日本語、0埋め)', value: 'YYYY年MM月DD日' },
        { label: 'YYYY年M月D日 (日本語)', value: 'YYYY年M月D日' },
      ]
      return formatOptions
    } else if (fieldKey === 'timeFormat') {
      return [
        { label: 'HH:mm:ss (秒まで)', value: 'HH:mm:ss' },
        { label: 'HH:mm (分まで)', value: 'HH:mm' },
      ]
    }
  }

  return []
}

// lookup.map 辅助函数（简化版：使用 key 作为 ID）
const getLookupMapEntries = (params: Record<string, any>): Array<{ id: string; key: string; value: any }> => {
  if (!params?.cases || typeof params.cases !== 'object') {
    return []
  }
  return Object.entries(params.cases).map(([key, value]) => ({
    id: `entry-${key}`,
    key,
    value
  }))
}

const addLookupMapEntry = (params: Record<string, any>) => {
  if (!params.cases) params.cases = {}
  // 生成唯一的新键
  let newKey = ''
  let i = 1
  while (Object.prototype.hasOwnProperty.call(params.cases, newKey) || newKey === '') {
    newKey = `新規キー${i++}`
  }
  params.cases[newKey] = ''
}

const removeLookupMapEntry = (params: Record<string, any>, key: string) => {
  if (params?.cases) {
    delete params.cases[key]
  }
}

const updateLookupMapEntryKey = (params: Record<string, any>, oldKey: string, newKey: string) => {
  if (!params?.cases || oldKey === newKey) return
  const value = params.cases[oldKey]
  delete params.cases[oldKey]
  params.cases[newKey] = value
}

const updateLookupMapEntryValue = (params: Record<string, any>, key: string, newValue: any) => {
  if (params?.cases) {
    params.cases[key] = newValue
  }
}

// lookup.contains rules 辅助函数
const addLookupContainsRule = (params: Record<string, any>) => {
  if (!params.rules) params.rules = []
  params.rules.push({ search: '', value: '' })
}

const removeLookupContainsRule = (params: Record<string, any>, idx: number) => {
  if (params?.rules) {
    params.rules.splice(idx, 1)
  }
}

// string.replace rules 辅助函数
const addStringReplaceRule = (params: Record<string, any>) => {
  if (!params.rules) params.rules = []
  params.rules.push({ search: '', replace: '', count: 0 })
}

const removeStringReplaceRule = (params: Record<string, any>, idx: number) => {
  if (params?.rules) {
    params.rules.splice(idx, 1)
  }
}

// http.fetchJson bodyParams 辅助函数
const addBodyParam = (params: Record<string, any>) => {
  if (!params.bodyParams) {
    params.bodyParams = []
  }
  params.bodyParams.push({
    key: '',
    value: '',
    source: 'literal',
    column: undefined,
  })
}

const removeBodyParam = (params: Record<string, any>, idx: number) => {
  if (params.bodyParams) {
    params.bodyParams.splice(idx, 1)
  }
}

const onBodyParamSourceChange = (param: any) => {
  if (param.source === 'column') {
    param.value = undefined
  } else {
    param.column = undefined
  }
}

// string.insertSymbol positions 辅助函数
const addInsertSymbolPosition = (params: Record<string, any>) => {
  if (!Array.isArray(params.positions)) {
    params.positions = []
  }
  params.positions.push(0)
}

const removeInsertSymbolPosition = (params: Record<string, any>, idx: number) => {
  if (Array.isArray(params.positions)) {
    params.positions.splice(idx, 1)
    // 如果删除后数组为空，至少保留一个
    if (params.positions.length === 0) {
      params.positions.push(0)
    }
  }
}

const inferDateParsePrecision = (formats: any): 'date' | 'datetime' => {
  const list = Array.isArray(formats) ? formats : []
  // 如果任意输入格式包含时间，则默认秒精度；否则默认日精度
  const hasTime = list.some((f) => typeof f === 'string' && (f.includes('HH') || f.includes(':')))
  return hasTime ? 'datetime' : 'date'
}

const onDateParseFormatsChanged = (step: any) => {
  if (!step || step.plugin !== 'date.parse') return
  const inferred = inferDateParsePrecision(step.params?.formats)
  step.params = step.params || {}
  step.params.precision = inferred
}

// date.parse formats 辅助函数
const addDateFormat = (params: Record<string, any>) => {
  if (!params.formats) {
    params.formats = []
  }
  params.formats.push('YYYY-MM-DD')
  // 新增格式后也同步默认精度（避免默认落到 ISO 秒精度）
  if (!params.precision) {
    params.precision = inferDateParsePrecision(params.formats)
  }
}


const handleSubmit = () => {
  if (!props.target) return

  // 清理 lookup.map 步骤的临时数据（以 _ 开头的字段）
  const cleanupLookupMapParams = (params: Record<string, any>) => {
    for (const key of Object.keys(params)) {
      if (key.startsWith('_')) {
        delete params[key]
      }
    }
  }

  const inputs: InputSource[] = form.inputs.map((inp, inpIdx): InputSource | null => {
    const steps: TransformStep[] = inp.pipelineSteps
      .filter((s) => s.plugin)
      .map((s, stepIdx) => {
        const params = buildParamsFromForm(
          inputStepFields.value[inpIdx]?.[stepIdx] || [],
          s.params,
        )
        // 再次清理（确保 buildParamsFromForm 不会保留临时数据）
        if (s.plugin === 'lookup.map') {
          cleanupLookupMapParams(params)
        }
        return {
          id: s.id,
          plugin: s.plugin,
          params,
          enabled: true,
        }
      })

    const pipeline: TransformPipeline = { steps }

    if (inp.type === 'column') {
      return {
        id: inp.id,
        type: 'column' as const,
        column: inp.column || '',
        pipeline,
      }
    } else if (inp.type === 'literal') {
      return {
        id: inp.id,
        type: 'literal' as const,
        value: inp.value,
        pipeline,
      }
    }
    // generated 类型已移除
    return null
  })
  .filter((inp): inp is InputSource => inp !== null)

  const outputSteps: TransformStep[] = form.outputPipelineSteps
    .filter((s) => s.plugin)
    .map((s, stepIdx) => {
      const params = buildParamsFromForm(outputStepFields.value[stepIdx] || [], s.params)
      // 再次清理（确保 buildParamsFromForm 不会保留临时数据）
      if (s.plugin === 'lookup.map') {
        cleanupLookupMapParams(params)
      }
      return {
        id: s.id,
        plugin: s.plugin,
        params,
        enabled: true,
      }
    })

  // 如果有多个 inputs，自动使用 concat 连接；否则使用 first
  const combinePlugin = inputs.length > 1 ? 'combine.concat' : 'combine.first'

  // 最终清理：确保所有 lookup.map 步骤的参数都是简洁的（只包含 cases、normalize、default）
  const finalCleanup = (steps: TransformStep[]) => {
    steps.forEach((step) => {
      if (step.plugin === 'lookup.map' && step.params) {
        cleanupLookupMapParams(step.params)
      }
    })
  }
  finalCleanup(inputs.flatMap((inp) => inp.pipeline?.steps || []))
  finalCleanup(outputSteps)

  const mapping: TransformMapping = {
    targetField: props.target.field,
    inputs,
    combine: {
      plugin: combinePlugin,
      params: {},
    },
    outputPipeline: outputSteps.length > 0 ? { steps: outputSteps } : undefined,
    required: props.target?.required ?? false,
    defaultValue: form.defaultValue || undefined,
  }

  emits('submit', mapping)
}
</script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
}
.preview-title {
  font-weight: 600;
  margin-bottom: 6px;
}
.preview-block {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 10px;
  background: #fafafa;
  margin-bottom: 10px;
}
.preview-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}
.preview-value {
  min-height: 40px;
}

.field-description {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  background: white;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px;
}
.list {
  margin: 0;
  padding-left: 18px;
}
.empty {
  color: #aaa;
}
.inputs-list {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px;
  background: #fafafa;
  max-height: 400px;
  overflow-y: auto;
}
.input-item {
  margin-bottom: 12px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}
.input-drag-handle {
  display: inline-flex;
  flex-direction: column;
  margin-right: 8px;
  gap: 2px;
}
.input-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.input-number {
  font-weight: 600;
  color: #666;
  min-width: 24px;
}
.input-pipeline {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
}
.pipeline-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}
.pipeline-steps {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px;
  background: #fafafa;
  max-height: 300px;
  overflow-y: auto;
}
.step-item {
  margin-bottom: 8px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}
.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.step-number {
  font-weight: 600;
  color: #666;
  min-width: 24px;
}
.step-params {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #ebeef5;
}
.plugin-help-icon {
  color: #909399;
  cursor: help;
  font-size: 16px;
  margin-left: 4px;
  transition: color 0.2s;
}
.plugin-help-icon:hover {
  color: #409eff;
}
.o-form-group { margin-bottom: 1rem; }
.o-form-label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
.o-input-sm { font-size: 12px; padding: 2px 6px; height: 26px; }
.o-toggle { position: relative; display: inline-block; width: 40px; height: 20px; cursor: pointer; }
.o-toggle input { opacity: 0; width: 0; height: 0; }
.o-toggle-slider { position: absolute; inset: 0; background: #ccc; border-radius: 20px; transition: background .2s; }
.o-toggle-slider::before { content: ''; position: absolute; left: 2px; top: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform .2s; }
.o-toggle input:checked + .o-toggle-slider { background: #714b67; }
.o-toggle input:checked + .o-toggle-slider::before { transform: translateX(20px); }
</style>
