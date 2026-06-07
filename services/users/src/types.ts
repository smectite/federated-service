import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
});

export type User = z.infer<typeof userSchema>;

/** Input accepted on create: id optional (generated when absent). */
export const createUserInput = userSchema.partial({ id: true });
export type CreateUserInput = z.infer<typeof createUserInput>;
