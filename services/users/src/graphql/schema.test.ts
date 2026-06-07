import { describe, it, expect } from 'vitest';
import { buildSubgraphSchema, printSubgraphSchema } from '@apollo/subgraph';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';

describe('users subgraph schema', () => {
  it('builds a valid federated subgraph schema exposing the User entity', () => {
    const schema = buildSubgraphSchema({ typeDefs, resolvers });
    // printSubgraphSchema renders within @apollo/subgraph's own graphql realm,
    // avoiding cross-module graphql instance checks.
    const sdl = printSubgraphSchema(schema);
    expect(sdl).toContain('type User');
    expect(sdl).toContain('@key');
  });

  it('exposes the federation _service query field', () => {
    const schema = buildSubgraphSchema({ typeDefs, resolvers });
    const queryFields = schema.getQueryType()?.getFields() ?? {};
    expect(queryFields['_service']).toBeDefined();
    expect(queryFields['user']).toBeDefined();
  });
});
