<script setup lang="ts">
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

interface Column {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  /** 'show' = optional but visible by default, 'hide' = optional and hidden by default, undefined = always visible */
  optional?: 'show' | 'hide'
  /** Whether this column supports inline editing */
  editable?: boolean
  /** Input type for inline editing */
  editType?: 'text' | 'number' | 'select'
  /** Options for select-type editing */
  editOptions?: string[]
}

interface GroupByOption {
  key: string
  label: string
}

interface Props {
  columns: Column[]
  rows: Record<string, any>[]
  selectable?: boolean
  striped?: boolean
  /** Available group-by fields */
  groupByOptions?: GroupByOption[]
  /** Enable inline cell editing */
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectable: true,
  striped: false,
  editable: false,
})

const emit = defineEmits<{
  export: [format: string, rows: Record<string, any>[]]
  'update:row': [payload: { rowIndex: number; colKey: string; value: any }]
  'cell-edit': [payload: { rowIndex: number; colKey: string; oldValue: any; newValue: any }]
  'batch-delete': [rows: Record<string, any>[]]
  'batch-archive': [rows: Record<string, any>[]]
}>()

// --- Sorting ---
const sortKey = ref('')
const sortOrder = ref<'asc' | 'desc'>('asc')
const selectedRows = ref<Set<number>>(new Set())

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows
  return [...props.rows].sort((a, b) => {
    const va = a[sortKey.value]
    const vb = b[sortKey.value]
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb
    return sortOrder.value === 'asc' ? cmp : -cmp
  })
})

// --- Selection ---
const allSelected = computed(() =>
  props.rows.length > 0 && selectedRows.value.size === props.rows.length
)

function toggleAll() {
  if (allSelected.value) {
    selectedRows.value.clear()
  } else {
    selectedRows.value = new Set(props.rows.map((_, i) => i))
  }
}

function toggleRow(index: number) {
  const next = new Set(selectedRows.value)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  selectedRows.value = next
}

// --- Optional columns toggle ---
const showOptionalMenu = ref(false)
const hiddenColumns = ref<Set<string>>(new Set(
  props.columns.filter(c => c.optional === 'hide').map(c => c.key)
))

const hasOptionalColumns = computed(() => props.columns.some(c => c.optional))

const visibleColumns = computed(() =>
  props.columns.filter(c => !hiddenColumns.value.has(c.key))
)

function toggleOptionalColumn(key: string) {
  const next = new Set(hiddenColumns.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  hiddenColumns.value = next
}

function closeDropdowns(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.o-optional-columns')) showOptionalMenu.value = false
  if (!target.closest('.o-export-wrap')) showExportMenu.value = false
}

// --- Column resize ---
const columnWidths = ref<Record<string, number>>({})
const resizingCol = ref<string | null>(null)
const resizeStartX = ref(0)
const resizeStartW = ref(0)

function getColWidth(col: Column): string | undefined {
  if (columnWidths.value[col.key]) return `${columnWidths.value[col.key]}px`
  return col.width
}

function onResizeStart(e: MouseEvent, col: Column) {
  e.preventDefault()
  e.stopPropagation()
  resizingCol.value = col.key
  resizeStartX.value = e.clientX
  const th = (e.target as HTMLElement).parentElement
  resizeStartW.value = th ? th.offsetWidth : 100
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onResizeMove(e: MouseEvent) {
  if (!resizingCol.value) return
  const diff = e.clientX - resizeStartX.value
  const newWidth = Math.max(50, resizeStartW.value + diff)
  columnWidths.value = { ...columnWidths.value, [resizingCol.value]: newWidth }
}

function onResizeEnd() {
  resizingCol.value = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})

// --- Group by ---
const groupByKey = ref('')
const collapsedGroups = ref<Set<string>>(new Set())

const hasGroupBy = computed(() => !!props.groupByOptions?.length)

const groupedData = computed(() => {
  if (!groupByKey.value) return null
  const groups: Record<string, Record<string, any>[]> = {}
  for (const row of sortedRows.value) {
    const key = String(row[groupByKey.value] ?? 'Undefined')
    if (!groups[key]) groups[key] = []
    groups[key].push(row)
  }
  return groups
})

function toggleGroup(key: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  collapsedGroups.value = next
}

// --- Export ---
const showExportMenu = ref(false)

function doExport(format: string) {
  const exportRows = selectedRows.value.size > 0
    ? props.rows.filter((_, i) => selectedRows.value.has(i))
    : props.rows
  emit('export', format, exportRows)
  showExportMenu.value = false
}

// --- Batch actions ---
function getSelectedRows(): Record<string, any>[] {
  return props.rows.filter((_, i) => selectedRows.value.has(i))
}

function doBatchDelete() {
  emit('batch-delete', getSelectedRows())
}

function doBatchArchive() {
  emit('batch-archive', getSelectedRows())
}

// Total visible column count (for group header colspan)
const totalColSpan = computed(() => {
  let n = visibleColumns.value.length
  if (props.selectable) n++
  if (hasOptionalColumns.value) n++
  return n
})

// --- Inline cell editing ---
const editingCell = ref<{ rowIndex: number; colKey: string } | null>(null)
const editValue = ref<any>(null)
const editInputRef = ref<HTMLInputElement | HTMLSelectElement | null>(null)

function isCellEditable(col: Column): boolean {
  return props.editable && col.editable === true
}

function startEditing(rowIndex: number, col: Column, currentValue: any) {
  if (!isCellEditable(col)) return
  editingCell.value = { rowIndex, colKey: col.key }
  editValue.value = currentValue
  nextTick(() => {
    editInputRef.value?.focus()
  })
}

function commitEdit() {
  if (!editingCell.value) return
  const { rowIndex, colKey } = editingCell.value
  const oldValue = props.rows[rowIndex]?.[colKey]
  const newValue = editValue.value

  if (oldValue !== newValue) {
    emit('update:row', { rowIndex, colKey, value: newValue })
    emit('cell-edit', { rowIndex, colKey, oldValue, newValue })
  }
  editingCell.value = null
  editValue.value = null
}

function cancelEdit() {
  editingCell.value = null
  editValue.value = null
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitEdit()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelEdit()
  }
}

function isEditing(rowIndex: number, colKey: string): boolean {
  return editingCell.value?.rowIndex === rowIndex && editingCell.value?.colKey === colKey
}

function getEditType(col: Column): string {
  return col.editType || 'text'
}
</script>

<template>
  <div class="o-list-view" @click="closeDropdowns">
    <!-- Toolbar: selection actions + group by + export -->
    <div v-if="selectedRows.size > 0 || hasGroupBy" class="o-list-toolbar" :class="{ 'o-toolbar-active': selectedRows.size > 0 }">
      <template v-if="selectedRows.size > 0">
        <span class="o-selected-count">{{ selectedRows.size }} selected</span>
        <div class="o-export-wrap" @click.stop>
          <Button class="o-toolbar-btn" @click="showExportMenu = !showExportMenu">
            Export <span class="o-caret">▾</span>
          </button>
          <div v-if="showExportMenu" class="o-export-dropdown">
            <Button class="o-export-item" @click="doExport('csv')">CSV</Button>
            <Button class="o-export-item" @click="doExport('xlsx')">Excel (XLSX)</Button>
            <Button class="o-export-item" @click="doExport('pdf')">PDF</Button>
          </div>
        </div>
        <Button class="o-toolbar-btn" @click="doBatchArchive">{{ t('table.archive') }}</Button>
        <Button class="o-toolbar-btn o-toolbar-danger" @click="doBatchDelete">{{ t('common.delete') }}</Button>
      </template>
      <template v-else>
        <div class="o-toolbar-spacer" />
      </template>

      <!-- Group By (always visible when options available) -->
      <div v-if="hasGroupBy" class="o-groupby-wrap">
        <label class="o-groupby-label">{{ t('table.groupBy') }}:</label>
        <Select :model-value="groupByKey || '__all__'" @update:model-value="(val: string) => groupByKey = val === '__all__' ? '' : val">
          <SelectTrigger class="h-7 o-groupby-select"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{{ t('table.none') }}</SelectItem>
            <SelectItem v-for="opt in groupByOptions" :key="opt.key" :value="opt.key">{{ opt.label }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="o-table-scroll">
      <Table class="o-list-table" :class="{ 'o-striped': striped, 'o-resizing': resizingCol }">
        <TableHeader>
          <TableRow>
            <TableHead v-if="selectable" class="o-col-check">
              <input type="checkbox" :checked="allSelected" @change="toggleAll" />
            </TableHead>
            <TableHead
              v-for="col in visibleColumns"
              :key="col.key"
              :style="{ width: getColWidth(col), textAlign: col.align || 'left' }"
              :class="{ 'o-sortable': col.sortable, 'o-sorted': sortKey === col.key }"
              @click="col.sortable && toggleSort(col.key)"
            >
              <span>{{ col.label }}</span>
              <span v-if="col.sortable && sortKey === col.key" class="o-sort-icon">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
              <!-- Resize handle -->
              <span
                class="o-resize-handle"
                @mousedown="onResizeStart($event, col)"
                @click.stop
              />
            </TableHead>
            <!-- Optional columns gear icon -->
            <TableHead v-if="hasOptionalColumns" class="o-col-optional">
              <div class="o-optional-columns" @click.stop>
                <Button class="o-optional-btn" @click="showOptionalMenu = !showOptionalMenu" title="Optional columns">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.116l.094-.318z"/>
                  </svg>
                </button>
                <div v-if="showOptionalMenu" class="o-optional-dropdown">
                  <div class="o-optional-title">{{ t('table.optionalColumns') }}</div>
                  <label
                    v-for="col in columns.filter(c => c.optional)"
                    :key="col.key"
                    class="o-optional-item"
                  >
                    <Input
                      type="checkbox"
                      :checked="!hiddenColumns.has(col.key)"
                      @change="toggleOptionalColumn(col.key)"
                    />
                    <span>{{ col.label }}</span>
                  </label>
                </div>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>

        <!-- Grouped view -->
        <template v-if="groupedData">
          <tbody v-for="(rows, groupKey) in groupedData" :key="groupKey">
            <TableRow class="o-group-header" @click="toggleGroup(String(groupKey))">
              <TableCell :colspan="totalColSpan">
                <span class="o-group-caret" :class="{ collapsed: collapsedGroups.has(String(groupKey)) }">▸</span>
                <strong>{{ groupByOptions?.find(o => o.key === groupByKey)?.label }}:</strong>
                <span class="o-group-name">{{ groupKey }}</span>
                <span class="o-group-count">({{ rows.length }})</span>
              </TableCell>
            </TableRow>
            <template v-if="!collapsedGroups.has(String(groupKey))">
              <TableRow
                v-for="(row, i) in rows"
                :key="i"
                :class="{ 'o-selected': selectedRows.has(sortedRows.indexOf(row)) }"
              >
                <TableCell v-if="selectable" class="o-col-check">
                  <input type="checkbox" :checked="selectedRows.has(sortedRows.indexOf(row))" @change="toggleRow(sortedRows.indexOf(row))" />
                </TableCell>
                <TableCell
                  v-for="col in visibleColumns"
                  :key="col.key"
                  :style="{ textAlign: col.align || 'left' }"
                  :class="{ 'o-cell-editable': isCellEditable(col), 'o-cell-editing': isEditing(sortedRows.indexOf(row), col.key) }"
                  @click="startEditing(sortedRows.indexOf(row), col, row[col.key])"
                >
                  <template v-if="isEditing(sortedRows.indexOf(row), col.key)">
                    <Select
                      v-if="getEditType(col) === 'select'"
                      :model-value="editValue"
                      @update:model-value="(val: string) => { editValue = val; commitEdit() }"
                    >
                      <SelectTrigger class="h-8 o-edit-input o-edit-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="opt in col.editOptions" :key="opt" :value="opt">{{ opt }}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      v-else
                      :ref="(el: any) => { editInputRef = el }"
                      v-model="editValue"
                      :type="getEditType(col)"
                      class="o-edit-input"
                      @blur="commitEdit"
                      @keydown="onEditKeydown"
                    />
                  </template>
                  <template v-else>
                    <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                      {{ row[col.key] }}
                    </slot>
                    <span v-if="isCellEditable(col)" class="o-edit-icon">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>
                    </span>
                  </template>
                </TableCell>
                <TableCell v-if="hasOptionalColumns" class="o-col-optional-spacer" />
              </TableRow>
            </template>
          </TableBody>
        </template>

        <!-- Flat view -->
        <tbody v-else>
          <TableRow
            v-for="(row, i) in sortedRows"
            :key="i"
            :class="{ 'o-selected': selectedRows.has(i) }"
          >
            <TableCell v-if="selectable" class="o-col-check">
              <input type="checkbox" :checked="selectedRows.has(i)" @change="toggleRow(i)" />
            </TableCell>
            <TableCell
              v-for="col in visibleColumns"
              :key="col.key"
              :style="{ textAlign: col.align || 'left' }"
              :class="{ 'o-cell-editable': isCellEditable(col), 'o-cell-editing': isEditing(i, col.key) }"
              @click="startEditing(i, col, row[col.key])"
            >
              <template v-if="isEditing(i, col.key)">
                <select
                  v-if="getEditType(col) === 'select'"
                  :ref="(el: any) => { editInputRef = el }"
                  v-model="editValue"
                  class="o-edit-input o-edit-select"
                  @blur="commitEdit"
                  @keydown="onEditKeydown"
                >
                  <option v-for="opt in col.editOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <Input
                  v-else
                  :ref="(el: any) => { editInputRef = el }"
                  v-model="editValue"
                  :type="getEditType(col)"
                  class="o-edit-input"
                  @blur="commitEdit"
                  @keydown="onEditKeydown"
                />
              </template>
              <template v-else>
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                  {{ row[col.key] }}
                </slot>
                <span v-if="isCellEditable(col)" class="o-edit-icon">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>
                </span>
              </template>
            </TableCell>
            <TableCell v-if="hasOptionalColumns" class="o-col-optional-spacer" />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<style scoped>
.o-list-view {
  background: var(--o-view-background);
  border: 1px solid var(--o-border-color);
  border-radius: var(--o-border-radius);
  overflow: hidden;
}

/* Toolbar */
.o-list-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--o-gray-100);
  border-bottom: 1px solid var(--o-border-color);
  font-size: var(--o-font-size-small);
  min-height: 36px;
}
.o-list-toolbar.o-toolbar-active {
  background: var(--o-brand-primary);
  color: #fff;
}
.o-toolbar-spacer { flex: 1; }
.o-selected-count { font-weight: 500; flex: 1; }
.o-toolbar-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: #fff;
  padding: 0.25rem 0.625rem;
  border-radius: var(--o-border-radius-sm);
  font-size: var(--o-font-size-smaller);
  cursor: pointer;
}
.o-toolbar-btn:hover { background: rgba(255,255,255,0.3); }
.o-toolbar-danger { background: var(--o-danger); }
.o-toolbar-danger:hover { background: #c82333; }
.o-caret { font-size: 0.625rem; margin-left: 0.125rem; }

/* Export dropdown */
.o-export-wrap { position: relative; }
.o-export-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: var(--o-view-background);
  border: 1px solid var(--o-border-color);
  border-radius: var(--o-border-radius);
  box-shadow: var(--o-shadow-lg);
  min-width: 140px;
  z-index: 100;
  padding: 0.25rem 0;
}
.o-export-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.375rem 0.75rem;
  font-size: var(--o-font-size-base);
  color: var(--o-gray-900);
  background: none;
  border: none;
  cursor: pointer;
}
.o-export-item:hover { background: var(--o-gray-100); }

/* Group By */
.o-groupby-wrap {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: auto;
}
.o-toolbar-active .o-groupby-wrap { color: rgba(255,255,255,0.9); }
.o-groupby-label {
  font-size: var(--o-font-size-smaller);
  font-weight: 500;
  white-space: nowrap;
}
.o-groupby-select {
  padding: 0.1875rem 0.5rem;
  border: 1px solid var(--o-border-color);
  border-radius: var(--o-border-radius-sm);
  font-size: var(--o-font-size-smaller);
  background: var(--o-view-background);
  color: var(--o-gray-900);
}
.o-toolbar-active .o-groupby-select {
  background: rgba(255,255,255,0.15);
  border-color: rgba(255,255,255,0.3);
  color: #fff;
}

/* Table scroll wrapper */
.o-table-scroll { overflow-x: auto; }

/* .o-list-table base styles are defined globally in style.css */
.o-list-table.o-resizing { cursor: col-resize; }
.o-list-table th.o-sortable { cursor: pointer; }
.o-list-table th.o-sortable:hover { color: var(--o-gray-900); }
.o-list-table th.o-sorted { color: var(--o-brand-primary); }
.o-sort-icon { font-size: 0.5625rem; margin-left: 0.25rem; }

/* Resize handle */
.o-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s;
  z-index: 1;
}
.o-resize-handle:hover,
.o-list-table.o-resizing .o-resize-handle {
  background: var(--o-brand-primary);
  opacity: 0.4;
}

.o-list-table.o-striped tbody tr:nth-child(even) {
  background: var(--o-gray-100);
}

/* Group header row */
.o-group-header {
  cursor: pointer;
}
.o-group-header td {
  padding: 0.5rem 0.75rem;
  background: var(--o-gray-100);
  border-bottom: 1px solid var(--o-border-color);
  font-size: var(--o-font-size-base);
}
.o-group-header:hover td {
  background: var(--o-gray-200);
}
.o-group-caret {
  display: inline-block;
  font-size: 0.75rem;
  margin-right: 0.375rem;
  transition: transform 0.15s;
  transform: rotate(90deg);
  color: var(--o-gray-500);
}
.o-group-caret.collapsed {
  transform: rotate(0deg);
}
.o-group-name {
  margin-left: 0.25rem;
  color: var(--o-brand-primary);
  font-weight: 600;
}
.o-group-count {
  margin-left: 0.375rem;
  font-size: var(--o-font-size-smaller);
  color: var(--o-gray-500);
}

/* Checkbox column */
.o-col-check {
  width: 40px;
  text-align: center;
  padding: 0.5rem 0.25rem !important;
  overflow: visible;
  text-overflow: clip;
}
.o-col-check input[type="checkbox"] {
  accent-color: var(--o-brand-primary);
  cursor: pointer;
}

/* Optional columns gear */
.o-col-optional {
  width: 36px;
  text-align: center;
  position: relative;
}
.o-col-optional-spacer {
  width: 36px;
}
.o-optional-columns {
  position: relative;
  display: inline-block;
}
.o-optional-btn {
  background: none;
  border: none;
  color: var(--o-gray-500);
  padding: 0.25rem;
  border-radius: var(--o-border-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}
.o-optional-btn:hover {
  color: var(--o-gray-900);
  background: var(--o-gray-200);
}
.o-optional-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--o-view-background);
  border: 1px solid var(--o-border-color);
  border-radius: var(--o-border-radius);
  box-shadow: var(--o-shadow-lg);
  min-width: 200px;
  z-index: 100;
  padding: 0.375rem 0;
}
.o-optional-title {
  padding: 0.375rem 0.75rem;
  font-size: var(--o-font-size-smaller);
  font-weight: 600;
  color: var(--o-gray-500);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--o-gray-200);
  margin-bottom: 0.25rem;
}
.o-optional-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-size: var(--o-font-size-base);
  cursor: pointer;
  transition: background 0.1s;
}
.o-optional-item:hover {
  background: var(--o-gray-100);
}
.o-optional-item input[type="checkbox"] {
  accent-color: var(--o-brand-primary);
  cursor: pointer;
}

/* Inline cell editing */
.o-cell-editable {
  position: relative;
  cursor: pointer;
}
.o-cell-editable:hover {
  background: rgba(113, 75, 103, 0.04);
}
.o-edit-icon {
  display: none;
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--o-gray-400);
  pointer-events: none;
}
.o-cell-editable:hover .o-edit-icon {
  display: inline-flex;
}
.o-cell-editing {
  padding: 0 !important;
  background: var(--o-view-background) !important;
  box-shadow: inset 0 0 0 2px var(--o-brand-primary);
}
.o-edit-input {
  width: 100%;
  height: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--o-font-size-base);
  font-family: inherit;
  color: var(--o-gray-900);
  box-sizing: border-box;
}
.o-edit-select {
  appearance: auto;
  cursor: pointer;
}
.o-edit-input:focus {
  outline: none;
}

/* ===== Mobile Responsive ===== */
@media (max-width: 768px) {
  /* Ensure horizontal scroll works on mobile */
  .o-table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Table needs minimum width so it scrolls rather than squishing */
  .o-list-table {
    min-width: 600px;
  }

  /* Toolbar wraps nicely on small screens */
  .o-list-toolbar {
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .o-groupby-wrap {
    margin-left: 0;
    width: 100%;
    justify-content: flex-start;
  }

  /* Ensure checkboxes remain tappable */
  .o-col-check {
    min-width: 40px;
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--o-view-background);
  }

  .o-col-check input[type="checkbox"] {
    width: 18px;
    height: 18px;
  }

  /* Keep optional columns gear accessible */
  .o-col-optional {
    position: sticky;
    right: 0;
    z-index: 2;
    background: var(--o-gray-100);
  }
}
</style>
