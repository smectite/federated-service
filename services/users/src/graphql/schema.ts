import { gql } from 'graphql-tag';

/**
 * Users subgraph schema. Owns the User entity (origin of @key id). Federation 2
 * spec linked so the router treats User as a shared, resolvable entity.
 */
export const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.9", import: ["@key", "@shareable"])

  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
  }

  input CreateUserInput {
    name: String!
    email: String!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
  }
`;
