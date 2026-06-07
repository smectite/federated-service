import { loadConfig, startSubgraphServer } from '@app/core';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { orderRoutes } from './rest/orderRoutes.js';

const cfg = loadConfig();

await startSubgraphServer({
  serviceName: 'orders',
  port: cfg.ORDERS_PORT,
  typeDefs,
  resolvers,
  restRouter: orderRoutes,
});
