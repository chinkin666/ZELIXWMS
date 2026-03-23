// NestJS エントリポイント / NestJS 入口点
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const config = app.get(ConfigService);

  // CORS 設定（環境変数で制御）/ CORS设置（通过环境变量控制）
  const corsOrigins = config.get<string>('CORS_ORIGINS');
  if (!corsOrigins && config.get('NODE_ENV') === 'production') {
    console.warn('⚠️  CORS_ORIGINS 未設定: 本番環境ではオリジンを制限してください / CORS_ORIGINS未设置: 生产环境请限制允许的来源');
  }
  app.enableCors({
    origin: corsOrigins
      ? corsOrigins.split(',').map((o: string) => o.trim())
      : true,  // 未設定時は全オリジン許可（開発用）/ 未设置时允许所有来源（开发用）
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Warehouse-Id', 'X-Tenant-Id', 'X-Request-Id', 'X-Api-Key'],
    exposedHeaders: ['X-Request-Id'],
  });

  // リクエストID ミドルウェア / 请求ID中间件
  app.use(new RequestIdMiddleware().use.bind(new RequestIdMiddleware()));

  // Swagger/OpenAPI ドキュメント設定 / Swagger/OpenAPI文档配置
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ZELIXWMS API')
      .setDescription('ZELIX WMS NestJS API ドキュメント / API文档')
      .setVersion('2.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Api-Key', in: 'header' }, 'api-key')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document);
  }

  const port = config.get<number>('port') || 4100;
  await app.listen(port);
  console.log(`🚀 ZELIX WMS NestJS running on port ${port}`);
}
bootstrap();
