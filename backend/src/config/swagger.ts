import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ZELIXWMS API',
      version: '1.0.0',
      description: 'WMS (Warehouse Management System) REST API / 倉庫管理システム REST API',
    },
    servers: [{ url: '/api', description: 'API Server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    }
  },
  apis: ['./src/api/routes/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
