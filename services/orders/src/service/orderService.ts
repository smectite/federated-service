import { randomUUID } from 'node:crypto';
import { orderRepo } from '../repo/orderRepo.js';
import { createOrderInput, orderSchema, type CreateOrderInput, type Order } from '../types.js';

/** Business logic for orders — shared by REST routes and GraphQL resolvers. */
export const orderService = {
  getById(id: string): Promise<Order | null> {
    return orderRepo.getById(id);
  },

  list(): Promise<Order[]> {
    return orderRepo.list();
  },

  listByUser(userId: string): Promise<Order[]> {
    return orderRepo.listByUser(userId);
  },

  async create(input: CreateOrderInput): Promise<Order> {
    const parsed = createOrderInput.parse(input);
    const order = orderSchema.parse({ ...parsed, id: parsed.id ?? randomUUID() });
    return orderRepo.put(order);
  },
};
