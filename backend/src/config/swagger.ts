import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ZELIX WMS API',
      version: '1.0.0',
      description: 'ZELIX WMS - 3PL倉庫管理システム API ドキュメント',
    },
    servers: [
      { url: '/api', description: 'API Server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: '認証 / Authentication' },
      { name: 'Shipment Orders', description: '出荷指示 / Shipment Orders' },
      { name: 'Inbound', description: '入庫管理 / Inbound Management' },
      { name: 'Inventory', description: '在庫管理 / Inventory Management' },
      { name: 'Products', description: '商品管理 / Product Management' },
      { name: 'Materials', description: '耗材管理 / Material Management' },
      { name: 'FBA', description: 'FBA管理 / FBA Management' },
      { name: 'RSL', description: 'RSL管理 / RSL Management' },
      { name: 'Returns', description: '返品管理 / Return Management' },
      { name: 'Billing', description: '請求管理 / Billing Management' },
      { name: 'OMS', description: 'OMS連携 / OMS Integration' },
      { name: 'Marketplace', description: 'EC連携 / Marketplace Integration' },
      { name: 'ERP', description: 'ERP連携 / ERP Integration' },
      { name: 'Users', description: 'ユーザー管理 / User Management' },
      { name: 'Settings', description: '設定 / Settings' },
    ],
  },
  apis: ['./src/api/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
