import { gql } from 'graphql-tag';

/**
 * Orders subgraph schema. Owns Order, and extends the User entity (defined in the
 * users subgraph) with an `orders` field. User is referenced as an entity via
 * @key + @external id; the router stitches User.orders onto the User resolved by
 * the users subgraph.
 */
export const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.9", import: ["@key", "@shareable"])

  type Order @key(fields: "id") {
    id: ID!
    total: Float!
    user: User!
  }

  # orders contributes the \`orders\` field to the User entity. The key is
  # resolvable here: given a { id } representation, orders returns a User stub
  # carrying its contributed fields, and the router fetches name/email from the
  # users subgraph. This two-way resolvability lets the router traverse in either
  # direction (User -> orders, or Order.user -> users).
  type User @key(fields: "id") {
    id: ID!
    orders: [Order!]!
  }

  input CreateOrderInput {
    userId: ID!
    total: Float!
  }

  type Query {
    order(id: ID!): Order
  }

  type Mutation {
    createOrder(input: CreateOrderInput!): Order!
  }
`;
