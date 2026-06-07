import { z } from 'zod';

/**
 * Central env schema shared by all services. Each service reads only the slice it
 * needs, but validating the whole shape in one place keeps config drift visible.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  AWS_REGION: z.string().default('us-east-1'),

  // DynamoDB
  DYNAMODB_ENDPOINT: z.string().url().optional(),
  DYNAMODB_USERS_TABLE: z.string().default('users'),
  DYNAMODB_ORDERS_TABLE: z.string().default('orders'),

  // Redis — comma-separated host:port seed nodes
  REDIS_NODES: z.string().default('localhost:6379'),
  // Cluster mode (ElastiCache cluster mode enabled). Off for local single-node.
  REDIS_CLUSTER: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  REDIS_TLS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),

  // Kafka
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('federated-service'),

  // Ports
  USERS_PORT: z.coerce.number().int().positive().default(4001),
  ORDERS_PORT: z.coerce.number().int().positive().default(4002),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | undefined;

/** Parse and cache process.env against the schema. Throws on invalid config. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Parse "host:port,host:port" into ioredis cluster node objects. */
export function parseRedisNodes(nodes: string): { host: string; port: number }[] {
  return nodes
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => {
      const [host, port] = n.split(':');
      return { host: host ?? 'localhost', port: Number(port ?? 6379) };
    });
}

/** Parse comma-separated Kafka broker list. */
export function parseBrokers(brokers: string): string[] {
  return brokers
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);
}
