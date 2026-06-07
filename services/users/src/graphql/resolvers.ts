import { userService } from '../service/userService.js';
import type { User } from '../types.js';

export const resolvers = {
  Query: {
    user: (_p: unknown, args: { id: string }) => userService.getById(args.id),
    users: () => userService.list(),
  },
  Mutation: {
    createUser: (_p: unknown, args: { input: { name: string; email: string } }) =>
      userService.create(args.input),
  },
  User: {
    /**
     * Federation reference resolver: the router calls this with { id } when
     * another subgraph (orders) references a User entity.
     */
    __resolveReference: (ref: { id: string }): Promise<User | null> =>
      userService.getById(ref.id),
  },
};
