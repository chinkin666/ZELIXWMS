/**
 * GraphQL サーバー初期化 / GraphQL 服务器初始化
 *
 * Apollo Server v5 + Express v4 手动集成。
 * /graphql エンドポイントに GraphQL API をマウント。
 */

import { ApolloServer, HeaderMap } from '@apollo/server';
import type { Application, Request, Response } from 'express';
import { logger } from '@/lib/logger';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './resolvers';

/**
 * GraphQL サーバーを初期化して Express にマウント
 * 初始化 GraphQL 服务器并挂载到 Express
 */
export async function initGraphQL(app: Application): Promise<void> {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
  });

  await server.start();

  // Express v4 手动集成（不依赖额外包）
  // Express v4 手動統合（追加パッケージ不要）
  app.use('/graphql', async (req: Request, res: Response) => {
    try {
      const result = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest: {
          method: req.method,
          headers: (() => {
            const hm = new HeaderMap();
            for (const [k, v] of Object.entries(req.headers)) {
              hm.set(k, Array.isArray(v) ? v.join(', ') : v || '');
            }
            return hm;
          })(),
          body: req.body,
          search: new URL(req.url, `http://${req.headers.host}`).search,
        },
        context: async () => ({
          user: (req as any).user,
          tenantId: req.headers['x-tenant-id'] as string | undefined,
        }),
      });

      // 设置响应头 / レスポンスヘッダーを設定
      for (const [key, value] of result.headers) {
        res.setHeader(key, value);
      }
      res.status(result.status || 200);

      if (result.body.kind === 'complete') {
        res.send(result.body.string);
      } else {
        // 流式响应 / ストリーミングレスポンス
        for await (const chunk of result.body.asyncIterator) {
          res.write(chunk);
        }
        res.end();
      }
    } catch (err) {
      logger.error({ err }, 'GraphQL request error / GraphQL リクエストエラー');
      res.status(500).json({ errors: [{ message: 'Internal server error' }] });
    }
  });

  logger.info('GraphQL server mounted at /graphql / GraphQL サーバーを /graphql にマウント');
}
