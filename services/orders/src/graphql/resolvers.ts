import { orderService } from '../service/orderService.js';
import type { Order } from '../types.js';

export const resolvers = {
  Query: {
    order: (_p: unknown, args: { id: string }) => orderService.getById(args.id),
  },
  Mutation: {
    createOrder: (_p: unknown, args: { input: { userId: string; total: number } }) =>
      orderService.create(args.input),
  },
  Order: {
    /** Map an Order back to its User entity stub; users subgraph fills the rest. */
    user: (order: Order) => ({ __typename: 'User', id: order.userId }),
    __resolveReference: (ref: { id: string }): Promise<Order | null> =>
      orderService.getById(ref.id),
  },
  User: {
    /**
     * Resolve a User entity reference into a stub orders can extend. The router
     * enters this subgraph with just { id }; orders contributes `orders` and the
     * users subgraph supplies name/email.
     */
    __resolveReference: (ref: { id: string }) => ref,
    /**
     * Cross-subgraph join: given a User (resolved by id), return that user's
     * orders. users owns User identity; orders contributes the orders list.
     */
    orders: (user: { id: string }): Promise<Order[]> => orderService.listByUser(user.id),
  },
};
