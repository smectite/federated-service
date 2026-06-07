import { Kafka, type Producer } from 'kafkajs';
import { loadConfig, parseBrokers } from './config.js';
import { childLogger } from './logger.js';

const log = childLogger('kafka');

let kafka: Kafka | undefined;
let producer: Producer | undefined;
let connected = false;

function getKafka(): Kafka {
  if (kafka) return kafka;
  const cfg = loadConfig();
  kafka = new Kafka({
    clientId: cfg.KAFKA_CLIENT_ID,
    brokers: parseBrokers(cfg.KAFKA_BROKERS),
  });
  return kafka;
}

/** Lazily create and connect a shared idempotent producer. */
export async function getProducer(): Promise<Producer> {
  if (producer && connected) return producer;
  producer = getKafka().producer({ idempotent: true });
  await producer.connect();
  connected = true;
  log.info('kafka producer connected');
  return producer;
}

/** Publish a single JSON event to a topic. Key controls partition affinity. */
export async function publish<T>(topic: string, key: string, value: T): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic,
    messages: [{ key, value: JSON.stringify(value) }],
  });
}

export function kafkaHealthy(): boolean {
  return connected;
}

export async function closeKafka(): Promise<void> {
  if (producer && connected) {
    await producer.disconnect();
    connected = false;
    producer = undefined;
  }
}
