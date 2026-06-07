import { dynamoHealthy } from './dynamo.js';
import { redisHealthy } from './redis.js';
import { kafkaHealthy } from './kafka.js';

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  checks: {
    dynamo: boolean;
    redis: boolean;
    kafka: boolean;
  };
}

/**
 * Aggregate readiness across backing stores. Kafka/Redis are best-effort caches/
 * brokers, but for /readyz we report degraded if any dependency is down so the
 * orchestrator can hold traffic until warm.
 */
export async function checkReadiness(): Promise<ReadinessReport> {
  const [dynamo, redis] = await Promise.all([dynamoHealthy(), redisHealthy()]);
  const kafka = kafkaHealthy();
  const allUp = dynamo && redis && kafka;
  return {
    status: allUp ? 'ok' : 'degraded',
    checks: { dynamo, redis, kafka },
  };
}
