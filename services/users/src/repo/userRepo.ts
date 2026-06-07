import { GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoClient, getRedis, loadConfig, publish, childLogger } from '@app/core';
import type { User } from '../types.js';

const log = childLogger('userRepo');
const TABLE = () => loadConfig().DYNAMODB_USERS_TABLE;
const TTL = () => loadConfig().CACHE_TTL_SECONDS;
const cacheKey = (id: string) => `user:${id}`;

/**
 * Repository for User. Read-through Redis cache in front of DynamoDB; writes
 * persist to Dynamo, invalidate cache, then emit a Kafka domain event. This is
 * the single data-access path shared by REST routes and GraphQL resolvers.
 */
export const userRepo = {
  async getById(id: string): Promise<User | null> {
    const redis = getRedis();
    try {
      const cached = await redis.get(cacheKey(id));
      if (cached) {
        log.debug({ id }, 'cache hit');
        return JSON.parse(cached) as User;
      }
    } catch (err) {
      log.warn({ err, id }, 'cache read failed; falling through to dynamo');
    }

    const res = await getDynamoClient().send(
      new GetCommand({ TableName: TABLE(), Key: { id } }),
    );
    const item = (res.Item as User | undefined) ?? null;

    if (item) {
      try {
        await redis.set(cacheKey(id), JSON.stringify(item), 'EX', TTL());
      } catch (err) {
        log.warn({ err, id }, 'cache write failed');
      }
    }
    return item;
  },

  async list(): Promise<User[]> {
    const res = await getDynamoClient().send(new ScanCommand({ TableName: TABLE() }));
    return (res.Items as User[] | undefined) ?? [];
  },

  async put(user: User): Promise<User> {
    await getDynamoClient().send(new PutCommand({ TableName: TABLE(), Item: user }));
    try {
      await getRedis().del(cacheKey(user.id));
    } catch (err) {
      log.warn({ err, id: user.id }, 'cache invalidation failed');
    }
    await publish('user.created', user.id, { type: 'user.created', user });
    return user;
  },
};
