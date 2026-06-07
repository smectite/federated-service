import { GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoClient, getRedis, loadConfig, publish, childLogger } from '@app/core';
import type { Order } from '../types.js';

const log = childLogger('orderRepo');
const TABLE = () => loadConfig().DYNAMODB_ORDERS_TABLE;
const TTL = () => loadConfig().CACHE_TTL_SECONDS;
const cacheKey = (id: string) => `order:${id}`;

/** GSI partitioned by userId so we can resolve User.orders without a full scan. */
const BY_USER_INDEX = 'byUser';

export const orderRepo = {
  async getById(id: string): Promise<Order | null> {
    const redis = getRedis();
    try {
      const cached = await redis.get(cacheKey(id));
      if (cached) return JSON.parse(cached) as Order;
    } catch (err) {
      log.warn({ err, id }, 'cache read failed');
    }

    const res = await getDynamoClient().send(
      new GetCommand({ TableName: TABLE(), Key: { id } }),
    );
    const item = (res.Item as Order | undefined) ?? null;
    if (item) {
      try {
        await redis.set(cacheKey(id), JSON.stringify(item), 'EX', TTL());
      } catch (err) {
        log.warn({ err, id }, 'cache write failed');
      }
    }
    return item;
  },

  async list(): Promise<Order[]> {
    const res = await getDynamoClient().send(new ScanCommand({ TableName: TABLE() }));
    return (res.Items as Order[] | undefined) ?? [];
  },

  async listByUser(userId: string): Promise<Order[]> {
    try {
      const res = await getDynamoClient().send(
        new QueryCommand({
          TableName: TABLE(),
          IndexName: BY_USER_INDEX,
          KeyConditionExpression: 'userId = :u',
          ExpressionAttributeValues: { ':u': userId },
        }),
      );
      return (res.Items as Order[] | undefined) ?? [];
    } catch (err) {
      // Fallback for environments without the GSI (e.g. minimal local table).
      log.warn({ err, userId }, 'GSI query failed; falling back to scan');
      const res = await getDynamoClient().send(
        new ScanCommand({
          TableName: TABLE(),
          FilterExpression: 'userId = :u',
          ExpressionAttributeValues: { ':u': userId },
        }),
      );
      return (res.Items as Order[] | undefined) ?? [];
    }
  },

  async put(order: Order): Promise<Order> {
    await getDynamoClient().send(new PutCommand({ TableName: TABLE(), Item: order }));
    try {
      await getRedis().del(cacheKey(order.id));
    } catch (err) {
      log.warn({ err, id: order.id }, 'cache invalidation failed');
    }
    await publish('order.created', order.id, { type: 'order.created', order });
    return order;
  },
};
