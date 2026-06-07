import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the repo so the service is tested in isolation (no Dynamo/Redis/Kafka).
// Factory must not reference outer variables (hoisted), so define inline then
// grab the mocks via the imported module.
vi.mock('../repo/userRepo.js', () => ({
  userRepo: {
    put: vi.fn(async (u) => u),
    getById: vi.fn(),
    list: vi.fn(),
  },
}));

import { userService } from './userService.js';
import { userRepo } from '../repo/userRepo.js';

const put = vi.mocked(userRepo.put);
const getById = vi.mocked(userRepo.getById);

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates an id on create when none provided', async () => {
    const user = await userService.create({ name: 'Ada', email: 'ada@example.com' });
    expect(user.id).toBeTruthy();
    expect(put).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ada' }));
  });

  it('rejects invalid email', async () => {
    await expect(userService.create({ name: 'X', email: 'not-an-email' })).rejects.toThrow();
    expect(put).not.toHaveBeenCalled();
  });

  it('delegates getById to the repo', async () => {
    getById.mockResolvedValueOnce({ id: '1', name: 'Ada', email: 'ada@example.com' });
    const u = await userService.getById('1');
    expect(u?.id).toBe('1');
    expect(getById).toHaveBeenCalledWith('1');
  });
});
