import http from 'node:http';
import express, { type Express, type Router, type ErrorRequestHandler } from 'express';
import { pinoHttp } from 'pino-http';
import { ApolloServer, type BaseContext } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { buildSubgraphSchema } from '@apollo/subgraph';
import type { DocumentNode } from 'graphql';
import { getLogger } from './logger.js';
import { checkReadiness } from './health.js';
import { closeRedis } from './redis.js';
import { closeKafka } from './kafka.js';

export interface SubgraphServerOptions {
  serviceName: string;
  port: number;
  typeDefs: DocumentNode;
  // Apollo resolver map; intentionally loose to avoid coupling core to schemas.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolvers: any;
  /** Express router mounted under /api for the REST surface. */
  restRouter: Router;
}

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  req.log.error({ err }, 'unhandled request error');
  res.status(500).json({ error: 'Internal server error' });
};

/**
 * Build and start an Express app that serves both a Federation 2 subgraph at
 * /graphql and a REST router at /api, plus /healthz and /readyz probes. Shared
 * by every subgraph service so wiring stays identical.
 */
export async function startSubgraphServer(opts: SubgraphServerOptions): Promise<http.Server> {
  const log = getLogger().child({ component: opts.serviceName });
  const app: Express = express();
  const httpServer = http.createServer(app);

  app.use(pinoHttp({ logger: log }));
  app.use(express.json());

  // Liveness: process is up. Readiness: backing stores reachable.
  app.get('/healthz', (_req, res) => res.json({ status: 'ok', service: opts.serviceName }));
  app.get('/readyz', async (_req, res) => {
    const report = await checkReadiness();
    res.status(report.status === 'ok' ? 200 : 503).json(report);
  });

  app.use('/api', opts.restRouter);

  const apollo = new ApolloServer<BaseContext>({
    schema: buildSubgraphSchema({ typeDefs: opts.typeDefs, resolvers: opts.resolvers }),
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await apollo.start();
  app.use('/graphql', expressMiddleware(apollo));

  app.use(errorHandler);

  await new Promise<void>((resolve) => httpServer.listen(opts.port, resolve));
  log.info({ port: opts.port }, `${opts.serviceName} subgraph listening`);

  const shutdown = async (signal: string) => {
    log.info({ signal }, 'shutting down');
    await apollo.stop(); // drains in-flight ops via the drain plugin
    httpServer.close();
    await Promise.allSettled([closeKafka(), closeRedis()]);
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  return httpServer;
}
