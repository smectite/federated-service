import { randomUUID } from 'node:crypto';
import { userRepo } from '../repo/userRepo.js';
import { createUserInput, userSchema, type CreateUserInput, type User } from '../types.js';

/**
 * Business logic for users. Both REST and GraphQL call into this layer — never
 * the repo directly — so validation and event emission stay consistent.
 */
export const userService = {
  getById(id: string): Promise<User | null> {
    return userRepo.getById(id);
  },

  list(): Promise<User[]> {
    return userRepo.list();
  },

  async create(input: CreateUserInput): Promise<User> {
    const parsed = createUserInput.parse(input);
    const user = userSchema.parse({ ...parsed, id: parsed.id ?? randomUUID() });
    return userRepo.put(user);
  },
};
