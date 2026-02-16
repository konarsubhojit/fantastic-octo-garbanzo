import { Consumer, EachMessagePayload, KafkaMessage } from 'kafkajs';
import { kafka, TopicName, TOPICS } from './kafka';
import { KafkaEvent, EventType, DeadLetterPayload } from './types';
import { publishEvent } from './producer';
import { randomUUID } from 'node:crypto';

// ─── Types ─────────────────────────────────────────────────

export interface ConsumerConfig {
  /** Consumer group ID - determines partition assignment */
  groupId: string;
  /** Topics to subscribe to */
  topics: TopicName[];
  /** Message handler */
  handler: (payload: EachMessagePayload) => Promise<void>;
  /** Event types to filter (only process matching events). If empty, processes all. */
  eventTypeFilter?: EventType[];
  /** Enable dead letter queue for failed messages */
  enableDLQ?: boolean;
  /** Max retry attempts before sending to DLQ */
  maxRetries?: number;
}

export interface TypedConsumerConfig<T extends KafkaEvent> {
  /** Consumer group ID */
  groupId: string;
  /** Topics to subscribe to */
  topics: TopicName[];
  /** Event types to process */  
  eventTypes: T['eventType'][];
  /** Typed message handler */
  handler: (event: T, metadata: MessageMetadata) => Promise<void>;
  /** Enable dead letter queue */
  enableDLQ?: boolean;
  /** Max retries */
  maxRetries?: number;
}

export interface MessageMetadata {
  topic: string;
  partition: number;
  offset: string;
  timestamp: string;
  key: string | null;
  headers: Record<string, string>;
}

// ─── Helpers ───────────────────────────────────────────────

function parseHeaders(message: KafkaMessage): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (message.headers) {
    for (const [key, value] of Object.entries(message.headers)) {
      if (value) {
        parsed[key] = Buffer.isBuffer(value) ? value.toString() : String(value);
      }
    }
  }
  return parsed;
}

function parseEvent(message: KafkaMessage): KafkaEvent | null {
  if (!message.value) return null;
  try {
    return JSON.parse(message.value.toString()) as KafkaEvent;
  } catch {
    console.error('[Kafka Consumer] Failed to parse message as JSON');
    return null;
  }
}

async function sendToDLQ(
  originalTopic: string,
  originalEventType: string,
  originalEvent: unknown,
  error: Error,
  retryCount: number
): Promise<void> {
  const dlqEvent: { eventId: string; eventType: 'analytics.dlq'; timestamp: string; version: '1.0'; source: string; payload: DeadLetterPayload } = {
    eventId: randomUUID(),
    eventType: 'analytics.dlq',
    timestamp: new Date().toISOString(),
    version: '1.0',
    source: 'consumer-dlq',
    payload: {
      originalTopic,
      originalEventType,
      originalEvent,
      error: error.message,
      failedAt: new Date().toISOString(),
      retryCount,
    },
  };
  await publishEvent(TOPICS.ANALYTICS, dlqEvent as KafkaEvent, randomUUID());
  console.log(`[Kafka Consumer] Sent failed message to DLQ: ${originalEventType}`);
}

// ─── Raw Consumer ──────────────────────────────────────────

export async function createConsumer(config: ConsumerConfig): Promise<Consumer> {
  const consumer = kafka.consumer({
    groupId: config.groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxBytesPerPartition: 1048576, // 1MB
    retry: {
      initialRetryTime: 300,
      retries: config.maxRetries ?? 5,
    },
  });

  await consumer.connect();
  console.log(`[Kafka Consumer:${config.groupId}] Connected`);

  for (const topic of config.topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`[Kafka Consumer:${config.groupId}] Subscribed to ${topic}`);
  }

  await consumer.run({
    eachMessage: async (payload) => {
      const headers = parseHeaders(payload.message);
      const eventType = headers.eventType;

      // Filter by event type if specified
      if (config.eventTypeFilter && config.eventTypeFilter.length > 0) {
        if (!eventType || !config.eventTypeFilter.includes(eventType as EventType)) {
          return; // Skip this message
        }
      }

      try {
        await config.handler(payload);
      } catch (error) {
        console.error(
          `[Kafka Consumer:${config.groupId}] Error processing message from ${payload.topic}:`,
          error
        );

        if (config.enableDLQ) {
          const event = parseEvent(payload.message);
          await sendToDLQ(
            payload.topic,
            eventType || 'unknown',
            event,
            error instanceof Error ? error : new Error(String(error)),
            0
          );
        }
      }
    },
  });

  return consumer;
}

// ─── Typed Consumer ────────────────────────────────────────

export async function createTypedConsumer<T extends KafkaEvent>(
  config: TypedConsumerConfig<T>
): Promise<Consumer> {
  const consumer = kafka.consumer({
    groupId: config.groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxBytesPerPartition: 1048576,
    retry: {
      initialRetryTime: 300,
      retries: config.maxRetries ?? 5,
    },
  });

  await consumer.connect();
  console.log(`[Kafka Consumer:${config.groupId}] Connected (typed)`);

  for (const topic of config.topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`[Kafka Consumer:${config.groupId}] Subscribed to ${topic}`);
  }

  console.log(`[Kafka Consumer:${config.groupId}] Filtering for event types: ${config.eventTypes.join(', ')}`);

  await consumer.run({
    eachMessage: async (payload) => {
      const headers = parseHeaders(payload.message);
      const eventType = headers.eventType;

      // Filter by event type
      if (!eventType || !config.eventTypes.includes(eventType as T['eventType'])) {
        return;
      }

      const event = parseEvent(payload.message);
      if (!event) return;

      const metadata: MessageMetadata = {
        topic: payload.topic,
        partition: payload.partition,
        offset: payload.message.offset,
        timestamp: payload.message.timestamp,
        key: payload.message.key?.toString() ?? null,
        headers,
      };

      try {
        await config.handler(event as T, metadata);
      } catch (error) {
        console.error(
          `[Kafka Consumer:${config.groupId}] Error processing ${eventType}:`,
          error
        );

        if (config.enableDLQ) {
          await sendToDLQ(
            payload.topic,
            eventType,
            event,
            error instanceof Error ? error : new Error(String(error)),
            0
          );
        }
      }
    },
  });

  return consumer;
}

// ─── Graceful Shutdown ─────────────────────────────────────

export async function gracefulShutdown(consumer: Consumer): Promise<void> {
  console.log('[Kafka Consumer] Initiating graceful shutdown...');
  await consumer.stop();
  await consumer.disconnect();
  console.log('[Kafka Consumer] Disconnected');
}
