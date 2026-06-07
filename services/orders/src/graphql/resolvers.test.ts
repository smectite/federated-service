import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../service/orderService.js', () => ({
  orderService: {
    listByUser: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
  },
}));

import { resolvers } from './resolvers.js';
import { orderService } from '../service/orderService.js';

const listByUser = vi.mocked(orderService.listByUser);
const getById = vi.mocked(orderService.getById);

describe('orders federation resolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves User.orders by the federated User id (cross-subgraph join)', async () => {
    listByUser.mockResolvedValueOnce([{ id: 'o1', userId: 'u1', total: 9.99 }]);
    const orders = await resolvers.User.orders({ id: 'u1' });
    expect(listByUser).toHaveBeenCalledWith('u1');
    expect(orders).toHaveLength(1);
    expect(orders[0]?.total).toBe(9.99);
  });

  it('maps Order.user to a User entity stub for the router to resolve', () => {
    const stub = resolvers.Order.user({ id: 'o1', userId: 'u1', total: 5 });
    expect(stub).toEqual({ __typename: 'User', id: 'u1' });
  });

  it('resolves an Order entity reference by id', async () => {
    getById.mockResolvedValueOnce({ id: 'o1', userId: 'u1', total: 5 });
    const order = await resolvers.Order.__resolveReference({ id: 'o1' });
    expect(getById).toHaveBeenCalledWith('o1');
    expect(order?.id).toBe('o1');
  });
});
