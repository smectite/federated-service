import { loadConfig, startSubgraphServer } from '@app/core';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { userRoutes } from './rest/userRoutes.js';

const cfg = loadConfig();

await startSubgraphServer({
  serviceName: 'users',
  port: cfg.USERS_PORT,
  typeDefs,
  resolvers,
  restRouter: userRoutes,
});
