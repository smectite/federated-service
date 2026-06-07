import { Redis, Cluster } from 'ioredis';
import { loadConfig, parseRedisNodes } from './config.js';
import { childLogger } from './logger.js';

const log = childLogger('redis');

// Either a Cluster (AWS ElastiCache cluster mode) or a single Redis (local /
// non-clustered). Both share the command surface this app uses.
type RedisLike = Redis | Cluster;

let client: RedisLike | undefined;

/**
 * Shared Redis client. REDIS_CLUSTER toggles between ioredis Cluster mode (for
 * ElastiCache cluster mode enabled) and a single-node client (local dev / a
 * non-clustered instance). Commands are bounded by timeouts so a Redis problem
 * degrades to the DynamoDB source of truth instead of hanging the request.
 */
export function getRedis(): RedisLike {
  if (client) return client;
  const cfg = loadConfig();
  const nodes = parseRedisNodes(cfg.REDIS_NODES);

  const commonOpts = {
    // Fail fast instead of queuing forever when Redis is unreachable; the repo
    // layer treats cache errors as a miss and falls back to DynamoDB.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    commandTimeout: 1000,
    ...(cfg.REDIS_TLS ? { tls: {} } : {}),
  };

  if (cfg.REDIS_CLUSTER) {
    client = new Cluster(nodes, {
      redisOptions: commonOpts,
      clusterRetryStrategy: (times) => (times > 5 ? null : Math.min(times * 100, 2000)),
      enableOfflineQueue: false,
    });
  } else {
    const first = nodes[0] ?? { host: 'localhost', port: 6379 };
    client = new Redis({
      host: first.host,
      port: first.port,
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 100, 2000)),
      ...commonOpts,
    });
  }

  client.on('error', (err) => log.warn({ err }, 'redis error'));
  return client;
}

/** Readiness probe: PING. */
export async function redisHealthy(): Promise<boolean> {
  try {
    const res = await getRedis().ping();
    return res === 'PONG';
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = undefined;
  }
}
