type CarrierField = {
  field: string;
  specNo: number;
  required: boolean;
  description: string;
};

export type CarrierMapping = {
  carrier: 'sagawa_efiden3' | 'yamato_b2' | 'seino_km2';
  exportFields: CarrierField[];
  importFields: CarrierField[];
};

export const carrierMappings: CarrierMapping[] = [
  {
    carrier: 'sagawa_efiden3',
    exportFields: [
      { field: 'recipient.phone', specNo: 3, required: true, description: '配送先電話番号' },
      { field: 'recipient.postalCode', specNo: 4, required: true, description: '配送先郵便番号' },
      { field: 'recipient.address.line1', specNo: 5, required: true, description: '配送先住所1' },
      { field: 'recipient.name', specNo: 8, required: true, description: '配送先名称1' },
      { field: 'refs.managementNo', specNo: 10, required: true, description: 'システム管理番号' },
      { field: 'shipper.phone', specNo: 18, required: true, description: 'ご依頼主電話番号' },
      { field: 'shipper.postalCode', specNo: 19, required: true, description: 'ご依頼主郵便番号' },
      { field: 'shipper.address.line1', specNo: 20, required: true, description: 'ご依頼主住所1' },
      { field: 'shipper.name', specNo: 22, required: true, description: 'ご依頼主名称1' },
      { field: 'package.pieces', specNo: 42, required: true, description: '出荷個数' },
      { field: 'package.temperature', specNo: 44, required: true, description: 'クール便指定' },
      { field: 'delivery.deliveryDate', specNo: 45, required: true, description: '配達日' },
      { field: 'delivery.timeSlot', specNo: 46, required: true, description: '配達時間帯' },
      { field: 'payment.codAmount', specNo: 48, required: true, description: '代引金額' },
      { field: 'payment.codTax', specNo: 49, required: true, description: '消費税' },
      { field: 'package.temperature', specNo: 52, required: true, description: '指定シール1' },
    ],
    importFields: [
      { field: 'trackingNo', specNo: 1, required: true, description: 'お問い合せ送り状No.' },
      { field: 'delivery.deliveryDate', specNo: 3, required: true, description: '出荷日' },
      { field: 'delivery.deliveryDate', specNo: 70, required: true, description: '配達日' },
    ],
  },
  {
    carrier: 'yamato_b2',
    exportFields: [
      { field: 'refs.managementNo', specNo: 1, required: true, description: 'お客様管理番号' },
      { field: 'package.temperature', specNo: 3, required: true, description: 'クール区分' },
      { field: 'delivery.shipDate', specNo: 5, required: true, description: '出荷予定日' },
      { field: 'delivery.deliveryDate', specNo: 6, required: true, description: 'お届け予定日' },
      { field: 'delivery.timeSlot', specNo: 7, required: true, description: '配達時間帯' },
      { field: 'recipient.phone', specNo: 9, required: true, description: 'お届け先電話番号' },
      { field: 'recipient.postalCode', specNo: 11, required: true, description: 'お届け先郵便番号' },
      { field: 'recipient.address.full', specNo: 12, required: true, description: 'お届け先住所' },
      { field: 'recipient.name', specNo: 16, required: true, description: 'お届け先名' },
      { field: 'shipper.phone', specNo: 20, required: true, description: 'ご依頼主電話番号' },
      { field: 'shipper.postalCode', specNo: 22, required: true, description: 'ご依頼主郵便番号' },
      { field: 'shipper.address.full', specNo: 23, required: true, description: 'ご依頼主住所' },
      { field: 'shipper.name', specNo: 25, required: true, description: 'ご依頼主名' },
      { field: 'contents.items', specNo: 30, required: true, description: '品名' },
      { field: 'payment.codAmount', specNo: 34, required: true, description: '代引金額' },
    ],
    importFields: [
      { field: 'trackingNo', specNo: 4, required: true, description: '送り状番号' },
      { field: 'delivery.shipDate', specNo: 5, required: true, description: '出荷日' },
      { field: 'delivery.deliveryDate', specNo: 6, required: true, description: '到着予定日' },
    ],
  },
  {
    carrier: 'seino_km2',
    exportFields: [
      { field: 'shipper.code', specNo: 1, required: true, description: '荷送人コード' },
      { field: 'delivery.shipDate', specNo: 3, required: true, description: '出荷予定日' },
      { field: 'refs.managementNo', specNo: 5, required: true, description: '管理番号' },
      { field: 'package.pieces', specNo: 8, required: true, description: '個数' },
      { field: 'shipper.name', specNo: 12, required: true, description: '荷送人名称' },
      { field: 'shipper.address.line1', specNo: 13, required: true, description: '荷送人住所1' },
      { field: 'shipper.phone', specNo: 15, required: true, description: '荷送人電話番号' },
      { field: 'recipient.postalCode', specNo: 19, required: true, description: 'お届け先郵便番号' },
      { field: 'recipient.name', specNo: 20, required: true, description: 'お届け先名称1' },
      { field: 'recipient.address.line1', specNo: 22, required: true, description: 'お届け先住所1' },
      { field: 'recipient.phone', specNo: 24, required: true, description: 'お届け先電話番号' },
      { field: 'delivery.deliveryDate', specNo: 38, required: true, description: '輸送指示（配達指定日付）' },
      { field: 'delivery.timeSlot', specNo: 39, required: false, description: '輸送指示コード1' },
      { field: 'payment.codAmount', specNo: 43, required: true, description: '品代金' },
      { field: 'payment.codTax', specNo: 44, required: true, description: '消費税' }
    ],
    importFields: [
      { field: 'delivery.shipDate', specNo: 1, required: true, description: '出荷日' },
      { field: 'trackingNo', specNo: 3, required: true, description: '送り状番号' }
    ],
  },
];




