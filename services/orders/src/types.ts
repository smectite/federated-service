import { z } from 'zod';

export const orderSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  total: z.number().nonnegative(),
});

export type Order = z.infer<typeof orderSchema>;

export const createOrderInput = orderSchema.partial({ id: true });
export type CreateOrderInput = z.infer<typeof createOrderInput>;
