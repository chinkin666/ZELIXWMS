/**
 * 商品テーブル列定義コンポーザブル / 商品表格列定义组合式函数
 *
 * ProductSettings.vue から tableColumns 定義を分離し、
 * 保守性と可読性を向上させる。
 * 从 ProductSettings.vue 中分离 tableColumns 定义，
 * 提高可维护性和可读性。
 */
import { h, type Ref } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import { resolveImageUrl } from '@/utils/imageUrl'
import noImageSrc from '@/assets/images/no_image.png'
import type { TableColumn } from '@/types/table'
import type { Product, SubSku } from '@/types/product'

/** 列レンダラーで使用するハンドラー / 列渲染器使用的处理函数 */
export interface ProductColumnHandlers {
  openEdit: (row: Product) => void
  openSubSkuDialog: (row: Product) => void
  openLabelPrint: (row: Product) => void
  duplicateProduct: (row: Product) => void
  confirmDelete: (row: Product) => void
}

/** 列レンダラーで使用するヘルパー / 列渲染器使用的辅助函数 */
export interface ProductColumnHelpers {
  t: (key: string, fallback: string) => string
  formatBarcode: (bc: any) => string
  getCategoryLabel: (val?: string) => string
  getCoolTypeLabel: (val?: string) => string
  getCoolTypeColor: (val?: string) => string
  formatDate: (iso: string) => string
}

export interface UseProductColumnsOptions {
  stockMap: Ref<Map<string, number>>
  handlers: ProductColumnHandlers
  helpers: ProductColumnHelpers
}

/**
 * 商品テーブルの列定義を生成する / 生成商品表格的列定义
 */
export function useProductColumns(options: UseProductColumnsOptions) {
  const { stockMap, handlers, helpers } = options
  const { t, formatBarcode, getCategoryLabel, getCoolTypeLabel, getCoolTypeColor, formatDate } = helpers
  const { openEdit, openSubSkuDialog, openLabelPrint, duplicateProduct, confirmDelete } = handlers

  const tableColumns: TableColumn[] = [
    {
      key: 'imageUrl',
      dataKey: 'imageUrl',
      title: t('wms.product.image', '画像'),
      width: 90,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: Product }) =>
        h('img', {
          src: resolveImageUrl(rowData.imageUrl),
          alt: '',
          style: 'width:60px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #e0e0e0;',
          onError: (e: Event) => { (e.target as HTMLImageElement).src = noImageSrc },
        }),
    },
    {
      key: 'sku',
      dataKey: 'sku',
      title: t('wms.product.skuCode', 'SKU管理番号'),
      width: 160,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: Product }) =>
        h('a', {
          href: '#',
          class: 'mgmt-cell__link',
          onClick: (e: Event) => { e.preventDefault(); openEdit(rowData) },
        }, rowData.sku || '-'),
    },
    {
      key: 'name',
      dataKey: 'name',
      title: t('wms.product.printName', '印刷用商品名'),
      width: 200,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: Product }) => rowData.name || '-',
    },
    {
      key: 'nameFull',
      dataKey: 'nameFull',
      title: t('wms.product.productName', '商品名'),
      width: 200,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: Product }) => rowData.nameFull || '-',
    },
    {
      key: 'barcode',
      dataKey: 'barcode',
      title: t('wms.product.inspectionCode', '検品コード'),
      width: 180,
      fieldType: 'array',
      cellRenderer: ({ rowData }: { rowData: Product }) => formatBarcode(rowData.barcode),
    },
    {
      key: 'customerProductCode',
      dataKey: 'customerProductCode',
      title: t('wms.product.customerProductCode', '顧客商品コード'),
      width: 160,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: Product }) => rowData.customerProductCode || '-',
    },
    {
      key: 'category',
      dataKey: 'category',
      title: t('wms.product.category', 'カテゴリ'),
      width: 80,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: Product }) =>
        h('span', { class: `category-badge cat-${rowData.category || '0'}` }, getCategoryLabel(rowData.category)),
    },
    {
      key: 'coolType',
      dataKey: 'coolType',
      title: t('wms.product.coolType', 'クール区分'),
      width: 100,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: Product }) =>
        h('span', { style: { color: getCoolTypeColor(rowData.coolType) } }, getCoolTypeLabel(rowData.coolType)),
    },
    {
      key: 'mailCalcEnabled',
      dataKey: 'mailCalcEnabled',
      title: t('wms.product.mailDelivery', 'メール便'),
      width: 100,
      fieldType: 'boolean',
      cellRenderer: ({ rowData }: { rowData: Product }) =>
        h('div', { class: 'mgmt-cell' }, [
          h('span', {}, rowData.mailCalcEnabled ? t('wms.product.enabled', 'する') : t('wms.product.disabled', 'しない')),
          ...(rowData.mailCalcEnabled
            ? [h('span', { style: 'font-size:11px;color:#909399;' }, `${t('wms.product.max', '最大')}: ${rowData.mailCalcMaxQuantity ?? '-'}`)]
            : []),
        ]),
    },
    {
      key: 'price',
      dataKey: 'price',
      title: t('wms.product.price', '商品金額'),
      width: 90,
      fieldType: 'number',
      cellRenderer: ({ rowData }: { rowData: Product }) =>
        rowData.price != null ? `\u00A5${rowData.price.toLocaleString()}` : '-',
    },
    {
      key: 'stockQuantity',
      dataKey: '_id',
      title: t('wms.product.stockQuantity', '在庫数'),
      width: 100,
      fieldType: 'number',
      formEditable: false,
      cellRenderer: ({ rowData }: { rowData: Product }) => {
        const qty = stockMap.value.get(rowData._id) ?? 0
        const color = qty > 0 ? '#67c23a' : '#909399'
        return h('span', { style: { fontWeight: 600, color } }, qty > 0 ? qty.toLocaleString() : '0')
      },
    },
    {
      key: 'inventoryEnabled',
      dataKey: 'inventoryEnabled',
      title: t('wms.product.inventoryManagement', '在庫管理'),
      width: 80,
      fieldType: 'boolean',
      cellRenderer: ({ rowData }: { rowData: Product }) =>
        h('span', { style: { color: rowData.inventoryEnabled ? '#67c23a' : '#909399' } }, rowData.inventoryEnabled ? t('wms.product.enabled', 'する') : t('wms.product.disabled', 'しない')),
    },
    {
      key: 'subSkusCount',
      title: t('wms.product.subSkus', '子SKU'),
      width: 140,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: Product }) =>
        h(OButton, { variant: 'secondary', size: 'sm', onClick: () => openSubSkuDialog(rowData) }, () =>
          rowData.subSkus?.length ? rowData.subSkus.map((s: SubSku) => s.subSku).join(', ') : '-',
        ),
    },
    {
      key: 'createdAt',
      dataKey: 'createdAt',
      title: t('wms.product.createdAt', '作成日時'),
      width: 140,
      fieldType: 'date',
      cellRenderer: ({ rowData }: { rowData: Product }) => formatDate(rowData.createdAt),
    },
    {
      key: 'actions',
      title: t('wms.common.actions', '操作'),
      width: 240,
      cellRenderer: ({ rowData }: { rowData: Product }) =>
        h('div', { style: 'display:inline-flex;gap:4px;flex-wrap:wrap;' }, [
          h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => t('wms.common.edit', '編集')),
          h(OButton, { variant: 'secondary', size: 'sm', onClick: () => openLabelPrint(rowData) }, () => t('wms.product.labelPrint', 'ラベル')),
          h(OButton, { variant: 'secondary', size: 'sm', onClick: () => duplicateProduct(rowData) }, () => t('wms.product.duplicate', '複製')),
          h(OButton, { variant: 'danger', size: 'sm', onClick: () => confirmDelete(rowData) }, () => t('wms.common.delete', '削除')),
        ]),
    },
  ]

  return { tableColumns }
}
