<template>
  <Dialog :open="visibleProxy" @update:open="visibleProxy = $event">
    <DialogContent class="sm:max-w-6xl">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
      </DialogHeader>
    <div class="layout">
      <div class="left">
        <div class="mapping-form">
          <div class="o-form-group">
            <label class="o-form-label">出力先フィールド</label>
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
            <Input v-model="form.defaultValue" placeholder="空の場合のデフォルト値（任意）" style="width: 100%" />
          </div>

          <div class="o-form-group">
            <label class="o-form-label">入力</label>
            <div class="inputs-list">
              <div v-for="(input, idx) in form.inputs" :key="input.id" class="input-item">
                <div class="input-header">
                  <div class="input-drag-handle">
                    <Button
                      variant="secondary"
                      size="sm"
                      :disabled="idx === 0"
                      @click="moveInputUp(idx)"
                      title="上へ移動"
                      style="padding: 0 4px; line-height: 1"
                    >&#9650;</Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      :disabled="idx === form.inputs.length - 1"
                      @click="moveInputDown(idx)"
                      title="下へ移動"
                      style="padding: 0 4px; line-height: 1"
                    >&#9660;</Button>
                  </div>
                  <span class="input-number">{{ idx + 1 }}</span>
                  <select
                    class="o-input -sm"
                    v-model="input.type"
                    style="width: 120px"
                    @change="onInputTypeChange(idx)"
                  >
                    <option value="column">列</option>
                    <option value="literal">固定値</option>
                  </select>

                  <select
                    v-if="input.type === 'column'"
                    class="o-input -sm"
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

                  <Input
                    v-if="input.type === 'literal'"
                    class="o-input -sm"
                    v-model="input.value"
                    placeholder="固定値"
                    style="width: 200px; margin-left: 8px"
                  />

                  <Button
                    variant="destructive"
                    size="sm"
                    @click="removeInput(idx)"
                    style="margin-left: 8px"
                  >削除</Button>
                </div>

                <div v-if="input.type === 'column'" class="input-pipeline">
                  <div class="pipeline-label">変換ステップ:</div>
                  <div
                    v-for="(step, stepIdx) in input.pipelineSteps"
                    :key="step.id"
                    class="step-item"
                  >
                    <div class="step-header">
                      <span class="step-number">{{ stepIdx + 1 }}</span>
                      <select
                        class="o-input -sm"
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
                      <Button
                        variant="destructive"
                        size="sm"
                        @click="removeInputStep(idx, stepIdx)"
                        style="margin-left: 8px"
                      >削除</Button>
                    </div>
                    <div
                      v-if="step.plugin && inputStepFields[idx]?.[stepIdx]"
                      class="step-params"
                    >
                      <!-- lookup.map：キー値対エディタ -->
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
                              <Input
                                class="o-input -sm"
                                :value="entry.key"
                                placeholder="キー（入力値）"
                                style="width: 130px"
                                @change="(e: Event) => updateLookupMapEntryKey(step.params, entry.key, (e.target as HTMLInputElement).value)"
                              />
                              <span style="color: #909399">→</span>
                              <Input
                                class="o-input -sm"
                                :value="entry.value"
                                placeholder="値（出力値）"
                                style="flex: 1"
                                @input="(e: Event) => updateLookupMapEntryValue(step.params, entry.key, (e.target as HTMLInputElement).value)"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                @click="removeLookupMapEntry(step.params, entry.key)"
                              >削除</Button>
                            </div>
                            <Button
                              variant="default"
                              size="sm"
                              @click="addLookupMapEntry(step.params)"
                              style="margin-top: 4px"
                            >+ レイアウト追加</Button>
                          </div>
                        </div>
                        <div
                          v-for="field in inputStepFields[idx][stepIdx].filter((f) => f.key !== 'cases')"
                          :key="field.key"
                          class="o-form-group"
                          style="margin-bottom: 4px"
                        >
                          <label class="o-form-label">{{ field.label }}</label>
                          <Input
                            v-if="field.type === 'string'"
                            class="o-input -sm"
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
                      <!-- lookup.contains：部分一致ルールエディタ -->
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
                              <Input
                                class="o-input -sm"
                                v-model="rule.search"
                                placeholder="検索文字列（含む）"
                                style="width: 150px"
                              />
                              <span style="color: #909399">→</span>
                              <Input
                                class="o-input -sm"
                                v-model="rule.value"
                                placeholder="出力値"
                                style="flex: 1"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                @click="removeLookupContainsRule(step.params, Number(ruleIdx))"
                              >削除</Button>
                            </div>
                            <Button
                              variant="default"
                              size="sm"
                              @click="addLookupContainsRule(step.params)"
                              style="margin-top: 4px"
                            >+ ルール追加</Button>
                          </div>
                        </div>
                        <div
                          v-for="field in inputStepFields[idx][stepIdx].filter((f) => f.key !== 'rules')"
                          :key="field.key"
                          class="o-form-group"
                          style="margin-bottom: 4px"
                        >
                          <label class="o-form-label">{{ field.label }}</label>
                          <Input
                            v-if="field.type === 'string'"
                            class="o-input -sm"
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
                      <!-- string.replace：置換ルールエディタ -->
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
                              <Input
                                class="o-input -sm"
                                v-model="rule.search"
                                placeholder="検索文字列"
                                style="width: 120px"
                              />
                              <span style="color: #909399">→</span>
                              <Input
                                class="o-input -sm"
                                v-model="rule.replace"
                                placeholder="置換後"
                                style="width: 120px"
                              />
                              <Input
                                type="number"
                                class="o-input -sm"
                                v-model.number="rule.count"
                                :min="0"
                                placeholder="回数"
                                style="width: 80px"
                              />
                              <span style="color: #909399; font-size: 11px">回(0=全部)</span>
                              <Button
                                variant="destructive"
                                size="sm"
                                @click="removeStringReplaceRule(step.params, Number(ruleIdx))"
                              >削除</Button>
                            </div>
                            <Button
                              variant="default"
                              size="sm"
                              @click="addStringReplaceRule(step.params)"
                              style="margin-top: 4px"
                            >+ ルール追加</Button>
                          </div>
                        </div>
                      </template>
                      <!-- date.parse / date.format -->
                      <template v-else-if="step.plugin === 'date.parse' || step.plugin === 'date.format'">
                        <div
                          v-for="field in inputStepFields[idx][stepIdx]"
                          :key="field.key"
                          class="o-form-group"
                          style="margin-bottom: 4px"
                        >
                          <label class="o-form-label">{{ field.label }}</label>
                          <!-- formats 配列 -->
                          <template v-if="field.key === 'formats' && step.plugin === 'date.parse'">
                            <div class="date-formats-editor">
                              <div
                                v-for="(fmt, fmtIdx) in (step.params.formats || [])"
                                :key="fmtIdx"
                                class="date-format-row"
                                style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                              >
                                <select
                                  class="o-input -sm"
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
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  @click="step.params.formats.splice(fmtIdx, 1)"
                                >削除</Button>
                              </div>
                              <Button
                                variant="default"
                                size="sm"
                                @click="addDateFormat(step.params)"
                                style="margin-top: 4px"
                              >+ 形式を追加</Button>
                            </div>
                          </template>
                          <!-- precision 選択 -->
                          <select
                            v-else-if="field.key === 'precision'"
                            class="o-input -sm"
                            v-model="step.params[field.key]"
                            style="width: 100%"
                          >
                            <option value="date">日精度（YYYY-MM-DD）</option>
                            <option value="datetime">秒精度（ISO形式）</option>
                          </select>
                          <!-- format/dateFormat/timeFormat ドロップダウン -->
                          <select
                            v-else-if="field.type === 'select' && (field.key === 'format' || field.key === 'dateFormat' || field.key === 'timeFormat')"
                            class="o-input -sm"
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
                          <Input
                            v-else-if="field.type === 'string'"
                            class="o-input -sm"
                            v-model="step.params[field.key]"
                            :placeholder="field.placeholder"
                            style="width: 100%"
                          />
                          <Input
                            v-else-if="field.type === 'number'"
                            type="number"
                            class="o-input -sm"
                            v-model.number="step.params[field.key]"
                            :min="field.min"
                            :max="field.max"
                            style="width: 100%"
                          />
                          <select
                            v-else-if="field.type === 'select'"
                            class="o-input -sm"
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
                      <!-- http.fetchJson：bodyParams エディタ -->
                      <template v-else-if="step.plugin === 'http.fetchJson'">
                        <div
                          v-for="field in inputStepFields[idx][stepIdx].filter((f) => f.key !== 'bodyParams')"
                          :key="field.key"
                          class="o-form-group"
                          style="margin-bottom: 4px"
                        >
                          <label class="o-form-label">{{ field.label }}</label>
                          <Input
                            v-if="field.type === 'string'"
                            class="o-input -sm"
                            v-model="step.params[field.key]"
                            :placeholder="field.placeholder"
                            style="width: 100%"
                          />
                          <Input
                            v-else-if="field.type === 'number'"
                            type="number"
                            class="o-input -sm"
                            v-model.number="step.params[field.key]"
                            :min="field.min"
                            :max="field.max"
                            style="width: 100%"
                          />
                          <select
                            v-else-if="field.type === 'select'"
                            class="o-input -sm"
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
                              <Input
                                class="o-input -sm"
                                v-model="param.key"
                                placeholder="パラメータ名"
                                style="width: 150px"
                              />
                              <select
                                class="o-input -sm"
                                v-model="param.source"
                                style="width: 120px"
                                @change="onBodyParamSourceChange(param)"
                              >
                                <option value="literal">固定値</option>
                                <option value="column">列から取得</option>
                              </select>
                              <Input
                                v-if="param.source === 'literal'"
                                class="o-input -sm"
                                v-model="param.value"
                                placeholder="固定値"
                                style="flex: 1"
                              />
                              <select
                                v-else-if="param.source === 'column'"
                                class="o-input -sm"
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
                              <Button
                                variant="destructive"
                                size="sm"
                                @click="removeBodyParam(step.params, Number(paramIdx))"
                              >削除</Button>
                            </div>
                            <Button
                              variant="default"
                              size="sm"
                              @click="addBodyParam(step.params)"
                              style="margin-top: 4px"
                            >+ パラメータ追加</Button>
                          </div>
                        </div>
                      </template>
                      <!-- string.insertSymbol：挿入位置エディタ -->
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
                              <Input
                                type="number"
                                class="o-input -sm"
                                v-model.number="step.params.positions[posIdx]"
                                :min="0"
                                placeholder="位置（0から始まる）"
                                style="flex: 1"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                :disabled="(step.params.positions || []).length <= 1"
                                @click="removeInsertSymbolPosition(step.params, Number(posIdx))"
                              >削除</Button>
                            </div>
                            <Button
                              variant="default"
                              size="sm"
                              @click="addInsertSymbolPosition(step.params)"
                              style="margin-top: 4px"
                            >+ 位置追加</Button>
                          </div>
                        </div>
                        <div
                          v-for="field in inputStepFields[idx][stepIdx].filter((f) => f.key !== 'positions')"
                          :key="field.key"
                          class="o-form-group"
                          style="margin-bottom: 4px"
                        >
                          <label class="o-form-label">{{ field.label }}</label>
                          <Input
                            v-if="field.type === 'string'"
                            class="o-input -sm"
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
                          <Input
                            v-if="field.type === 'string'"
                            class="o-input -sm"
                            v-model="step.params[field.key]"
                            :placeholder="field.placeholder"
                            style="width: 100%"
                          />
                          <Input
                            v-else-if="field.type === 'number'"
                            type="number"
                            class="o-input -sm"
                            v-model.number="step.params[field.key]"
                            :min="field.min"
                            :max="field.max"
                            style="width: 100%"
                          />
                          <select
                            v-else-if="field.type === 'select'"
                            class="o-input -sm"
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
                  <Button
                    variant="default"
                    size="sm"
                    @click="addInputStep(idx)"
                    style="margin-top: 4px"
                  >+ 入力変換を追加</Button>
                </div>
              </div>
              <Button variant="default" size="sm" @click="addInput" style="margin-top: 8px">
                + 入力変換を追加
              </Button>
            </div>
          </div>


          <div class="o-form-group">
            <label class="o-form-label">出力変換</label>
            <div class="pipeline-steps">
              <div
                v-for="(step, stepIdx) in form.outputPipelineSteps"
                :key="step.id"
                class="step-item"
              >
                <div class="step-header">
                  <span class="step-number">{{ stepIdx + 1 }}</span>
                  <select
                    class="o-input -sm"
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
                  <Button
                    variant="destructive"
                    size="sm"
                    @click="removeOutputStep(stepIdx)"
                    style="margin-left: 8px"
                  >削除</Button>
                </div>
                <div v-if="step.plugin && outputStepFields[stepIdx]" class="step-params">
                  <!-- lookup.map：キー値対エディタ -->
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
                          <Input
                            class="o-input -sm"
                            :value="entry.key"
                            placeholder="キー（入力値）"
                            style="width: 200px"
                            @change="(e: Event) => updateLookupMapEntryKey(step.params, entry.key, (e.target as HTMLInputElement).value)"
                          />
                          <span style="color: #909399">→</span>
                          <Input
                            class="o-input -sm"
                            :value="entry.value"
                            placeholder="値（出力値）"
                            style="flex: 1"
                            @input="(e: Event) => updateLookupMapEntryValue(step.params, entry.key, (e.target as HTMLInputElement).value)"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            @click="removeLookupMapEntry(step.params, entry.key)"
                          >削除</Button>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          @click="addLookupMapEntry(step.params)"
                          style="margin-top: 4px"
                        >+ レイアウト追加</Button>
                      </div>
                    </div>
                    <div
                      v-for="field in outputStepFields[stepIdx].filter((f) => f.key !== 'cases')"
                      :key="field.key"
                      class="o-form-group"
                      style="margin-bottom: 4px"
                    >
                      <label class="o-form-label">{{ field.label }}</label>
                      <Input
                        v-if="field.type === 'string'"
                        class="o-input -sm"
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
                  <!-- lookup.contains：部分一致ルールエディタ -->
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
                          <Input
                            class="o-input -sm"
                            v-model="rule.search"
                            placeholder="検索文字列（含む）"
                            style="width: 150px"
                          />
                          <span style="color: #909399">→</span>
                          <Input
                            class="o-input -sm"
                            v-model="rule.value"
                            placeholder="出力値"
                            style="flex: 1"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            @click="removeLookupContainsRule(step.params, Number(ruleIdx))"
                          >削除</Button>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          @click="addLookupContainsRule(step.params)"
                          style="margin-top: 4px"
                        >+ ルール追加</Button>
                      </div>
                    </div>
                    <div
                      v-for="field in outputStepFields[stepIdx].filter((f) => f.key !== 'rules')"
                      :key="field.key"
                      class="o-form-group"
                      style="margin-bottom: 4px"
                    >
                      <label class="o-form-label">{{ field.label }}</label>
                      <Input
                        v-if="field.type === 'string'"
                        class="o-input -sm"
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
                  <!-- string.replace：置換ルールエディタ -->
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
                          <Input
                            class="o-input -sm"
                            v-model="rule.search"
                            placeholder="検索文字列"
                            style="width: 120px"
                          />
                          <span style="color: #909399">→</span>
                          <Input
                            class="o-input -sm"
                            v-model="rule.replace"
                            placeholder="置換後"
                            style="width: 120px"
                          />
                          <Input
                            type="number"
                            class="o-input -sm"
                            v-model.number="rule.count"
                            :min="0"
                            placeholder="回数"
                            style="width: 80px"
                          />
                          <span style="color: #909399; font-size: 11px">回(0=全部)</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            @click="removeStringReplaceRule(step.params, Number(ruleIdx))"
                          >削除</Button>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          @click="addStringReplaceRule(step.params)"
                          style="margin-top: 4px"
                        >+ ルール追加</Button>
                      </div>
                    </div>
                  </template>
                  <!-- http.fetchJson：bodyParams エディタ -->
                  <template v-else-if="step.plugin === 'http.fetchJson'">
                    <div
                      v-for="field in outputStepFields[stepIdx].filter((f) => f.key !== 'bodyParams')"
                      :key="field.key"
                      class="o-form-group"
                      style="margin-bottom: 4px"
                    >
                      <label class="o-form-label">{{ field.label }}</label>
                      <Input
                        v-if="field.type === 'string'"
                        class="o-input -sm"
                        v-model="step.params[field.key]"
                        :placeholder="field.placeholder"
                        style="width: 100%"
                      />
                      <Input
                        v-else-if="field.type === 'number'"
                        type="number"
                        class="o-input -sm"
                        v-model.number="step.params[field.key]"
                        :min="field.min"
                        :max="field.max"
                        style="width: 100%"
                      />
                      <select
                        v-else-if="field.type === 'select'"
                        class="o-input -sm"
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
                          <Input
                            class="o-input -sm"
                            v-model="param.key"
                            placeholder="パラメータ名"
                            style="width: 150px"
                          />
                          <select
                            class="o-input -sm"
                            v-model="param.source"
                            style="width: 120px"
                            @change="onBodyParamSourceChange(param)"
                          >
                            <option value="literal">固定値</option>
                            <option value="column">列から取得</option>
                          </select>
                          <Input
                            v-if="param.source === 'literal'"
                            class="o-input -sm"
                            v-model="param.value"
                            placeholder="固定値"
                            style="flex: 1"
                          />
                          <select
                            v-else-if="param.source === 'column'"
                            class="o-input -sm"
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
                          <Button
                            variant="destructive"
                            size="sm"
                            @click="removeBodyParam(step.params, Number(paramIdx))"
                          >削除</Button>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          @click="addBodyParam(step.params)"
                          style="margin-top: 4px"
                        >+ パラメータ追加</Button>
                      </div>
                    </div>
                  </template>
                  <!-- date.parse / date.format -->
                  <template v-else-if="step.plugin === 'date.parse' || step.plugin === 'date.format'">
                    <div
                      v-for="field in outputStepFields[stepIdx]"
                      :key="field.key"
                      class="o-form-group"
                      style="margin-bottom: 4px"
                    >
                      <label class="o-form-label">{{ field.label }}</label>
                      <!-- formats 配列 -->
                      <template v-if="field.key === 'formats' && step.plugin === 'date.parse'">
                        <div class="date-formats-editor">
                          <div
                            v-for="(fmt, fmtIdx) in (step.params.formats || [])"
                            :key="fmtIdx"
                            class="date-format-row"
                            style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center"
                          >
                            <select
                              class="o-input -sm"
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
                            <Button
                              variant="destructive"
                              size="sm"
                              @click="step.params.formats.splice(fmtIdx, 1)"
                            >削除</Button>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            @click="addDateFormat(step.params)"
                            style="margin-top: 4px"
                          >+ 形式を追加</Button>
                        </div>
                      </template>
                      <!-- precision 選択 -->
                      <select
                        v-else-if="field.key === 'precision'"
                        class="o-input -sm"
                        v-model="step.params[field.key]"
                        style="width: 100%"
                      >
                        <option value="date">日精度（YYYY-MM-DD）</option>
                        <option value="datetime">秒精度（ISO形式）</option>
                      </select>
                      <!-- format/dateFormat/timeFormat ドロップダウン -->
                      <select
                        v-else-if="field.type === 'select' && (field.key === 'format' || field.key === 'dateFormat' || field.key === 'timeFormat')"
                        class="o-input -sm"
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
                      <Input
                        v-else-if="field.type === 'string'"
                        class="o-input -sm"
                        v-model="step.params[field.key]"
                        :placeholder="field.placeholder"
                        style="width: 100%"
                      />
                      <Input
                        v-else-if="field.type === 'number'"
                        type="number"
                        class="o-input -sm"
                        v-model.number="step.params[field.key]"
                        :min="field.min"
                        :max="field.max"
                        style="width: 100%"
                      />
                      <select
                        v-else-if="field.type === 'select'"
                        class="o-input -sm"
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
                  <!-- string.insertSymbol：挿入位置エディタ -->
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
                          <Input
                            type="number"
                            class="o-input -sm"
                            v-model.number="step.params.positions[posIdx]"
                            :min="0"
                            placeholder="位置（0から始まる）"
                            style="flex: 1"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            :disabled="(step.params.positions || []).length <= 1"
                            @click="removeInsertSymbolPosition(step.params, Number(posIdx))"
                          >削除</Button>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          @click="addInsertSymbolPosition(step.params)"
                          style="margin-top: 4px"
                        >+ 位置追加</Button>
                      </div>
                    </div>
                    <div
                      v-for="field in outputStepFields[stepIdx].filter((f) => f.key !== 'positions')"
                      :key="field.key"
                      class="o-form-group"
                      style="margin-bottom: 4px"
                    >
                      <label class="o-form-label">{{ field.label }}</label>
                      <Input
                        v-if="field.type === 'string'"
                        class="o-input -sm"
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
                      <Input
                        v-if="field.type === 'string'"
                        class="o-input -sm"
                        v-model="step.params[field.key]"
                        :placeholder="field.placeholder"
                        style="width: 100%"
                      />
                      <Input
                        v-else-if="field.type === 'number'"
                        type="number"
                        class="o-input -sm"
                        v-model.number="step.params[field.key]"
                        :min="field.min"
                        :max="field.max"
                        style="width: 100%"
                      />
                      <select
                        v-else-if="field.type === 'select'"
                        class="o-input -sm"
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
              <Button
                variant="default"
                size="sm"
                @click="addOutputStep"
                style="margin-top: 4px"
              >+ 出力変換を追加</Button>
            </div>
          </div>
        </div>
      </div>
      <div class="right">
        <div class="preview-title">プレビュー</div>
        <div class="preview-block">
          <div class="preview-label">参照中の入力元列</div>
          <ul class="list">
            <li v-for="col in referencedSources" :key="col">{{ getSourceDisplayName(col) }}</li>
            <li v-if="!referencedSources.length" class="empty">なし</li>
          </ul>
        </div>
        <div class="preview-block">
          <div class="preview-label">出力先プレビュー</div>
          <div class="preview-value">{{ previewValue }}</div>
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button variant="secondary" @click="visibleProxy = false">キャンセル</Button>
      <Button variant="default" @click="handleSubmit">保存</Button>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
/**
 * マッピング詳細ダイアログ / 映射详情对话框
 *
 * フォームロジックは useMappingForm コンポーザブルに抽出済み
 * 表单逻辑已提取到 useMappingForm 组合式函数
 */
import { computed, toRef } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TransformMapping } from '@/api/mappingConfig'
import { getOrderFieldDefinitions } from '@/types/order'
import { useMappingForm, type TargetRow, type SourceRow } from './detail/useMappingForm'

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

// コンポーザブルからフォームロジックを取得 / 从组合式函数获取表单逻辑
const {
  form,
  inputStepFields,
  outputStepFields,
  transformPlugins,
  availableColumns,
  previewValue,
  referencedSources,
  getPluginDescription,
  addInput,
  removeInput,
  moveInputUp,
  moveInputDown,
  onInputTypeChange,
  addInputStep,
  removeInputStep,
  onInputStepPluginChange,
  addOutputStep,
  removeOutputStep,
  onOutputStepPluginChange,
  getLookupMapEntries,
  addLookupMapEntry,
  removeLookupMapEntry,
  updateLookupMapEntryKey,
  updateLookupMapEntryValue,
  addLookupContainsRule,
  removeLookupContainsRule,
  addStringReplaceRule,
  removeStringReplaceRule,
  addBodyParam,
  removeBodyParam,
  onBodyParamSourceChange,
  addInsertSymbolPosition,
  removeInsertSymbolPosition,
  onDateParseFormatsChanged,
  addDateFormat,
  buildSubmitMapping,
} = useMappingForm({
  modelValue: toRef(props, 'modelValue'),
  target: toRef(props, 'target'),
  mapping: toRef(props, 'mapping'),
  preSelectedSources: toRef(props, 'preSelectedSources'),
  sampleRow: toRef(props, 'sampleRow'),
  configType: toRef(props, 'configType'),
  carrierId: toRef(props, 'carrierId'),
  carrierOptions: toRef(props, 'carrierOptions'),
})

// 注文フィールド定義を取得 / 获取订单字段定义
const orderFieldDefinitions = getOrderFieldDefinitions()

// 対象フィールドの説明を取得 / 获取目标字段说明
const targetDescription = computed<string | null>(() => {
  if (!props.target?.field) return null

  // order-to-carrier の場合、配送業者の formatDefinition から取得 / 从承运商格式定义获取
  if (props.configType === 'order-to-carrier' && props.carrierId && props.carrierOptions) {
    const carrier = props.carrierOptions.find((c) => c._id === props.carrierId)
    if (carrier?.formatDefinition?.columns) {
      const col = carrier.formatDefinition.columns.find((c: any) => c.name === props.target?.field)
      return col?.description || null
    }
  }

  // ec-company-to-order の場合、注文フィールド定義から取得 / 从订单字段定义获取
  if (props.configType === 'ec-company-to-order') {
    const def = orderFieldDefinitions.find((d) => d.dataKey === props.target?.field)
    return def?.description || null
  }

  return null
})

// フィールド表示名を取得 / 获取字段显示名
const getFieldDisplayName = (fieldKey: string): string => {
  if (!fieldKey) return ''

  const fieldDef = orderFieldDefinitions.find((f) => f.key === fieldKey || f.dataKey === fieldKey)
  if (fieldDef?.title) return fieldDef.title

  // ネストされたパスのベースフィールド名で照合 / 用嵌套路径的基础字段名匹配
  const baseField = fieldKey.split('.')[0]
  if (baseField) {
    const baseDef = orderFieldDefinitions.find((f) => f.key === baseField || f.dataKey === baseField)
    if (baseDef?.title) return baseDef.title
  }

  return fieldKey
}

// 入力元の表示名を取得 / 获取输入源显示名
const getSourceDisplayName = (sourceKey: string): string => {
  if (!sourceKey) return ''

  if (props.preSelectedSources) {
    const source = props.preSelectedSources.find((s) => s.name === sourceKey)
    if (source?.label) return source.label
  }

  return getFieldDisplayName(sourceKey)
}

// 出力先の表示名を取得 / 获取输出目标显示名
const getTargetDisplayName = (targetKey: string): string => {
  if (!targetKey) return ''

  if (props.target && 'label' in props.target && (props.target as any).label) {
    return (props.target as any).label
  }

  return getFieldDisplayName(targetKey)
}

// ダイアログタイトル / 对话框标题
const title = computed(() => {
  const targetName = props.target ? getTargetDisplayName(props.target.field) : ''
  if (props.preSelectedSources && props.preSelectedSources.length > 0) {
    return `変換設定: ${targetName}`
  }
  return `マッピング詳細: ${targetName}`
})

// 送信ハンドラ / 提交处理
const handleSubmit = () => {
  const resultMapping = buildSubmitMapping()
  if (resultMapping) {
    emits('submit', resultMapping)
  }
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
.o-toggle { position: relative; display: inline-block; width: 40px; height: 20px; cursor: pointer; }
.o-toggle input { opacity: 0; width: 0; height: 0; }
.o-toggle-slider { position: absolute; inset: 0; background: #ccc; border-radius: 20px; transition: background .2s; }
.o-toggle-slider::before { content: ''; position: absolute; left: 2px; top: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform .2s; }
.o-toggle input:checked + .o-toggle-slider { background: #714b67; }
.o-toggle input:checked + .o-toggle-slider::before { transform: translateX(20px); }
</style>
