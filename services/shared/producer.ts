import { Producer, ProducerRecord, CompressionTypes } from 'kafkajs';
import { kafka, TopicName, TOPICS } from './kafka';
import {
  KafkaEvent,
  CommandEvent,
  OrderEvent,
  NotificationEvent,
  InventoryEvent,
  AnalyticsEvent,
  CheckoutCommandPayload,
  OrderPayload,
  EmailNotificationPayload,
  StockUpdatePayload,
  AuditLogPayload,
  CheckoutCommand,
  OrderCreatedEvent,
  EmailNotificationEvent,
  StockUpdatedEvent,
  AuditLogEvent,
} from './types';
import { randomUUID } from 'node:crypto';

let producer: Producer | null = null;

// ─── Producer Lifecycle ────────────────────────────────────

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer({
      allowAutoTopicCreation: false, // Topics created via admin API
      transactionTimeout: 30000,
      maxInFlightRequests: 5,
      idempotent: true, // Exactly-once semantics
    });
    await producer.connect();
    console.log('[Kafka Producer] Connected with idempotent mode');
  }
  return producer;
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
    console.log('[Kafka Producer] Disconnected');
  }
}

// ─── Low-Level Publish ─────────────────────────────────────

export async function publishEvent(
  topic: TopicName,
  event: KafkaEvent,
  key?: string
): Promise<void> {
  const p = await getProducer();
  const record: ProducerRecord = {
    topic,
    compression: CompressionTypes.GZIP,
    messages: [
      {
        key: key || event.eventId,
        value: JSON.stringify(event),
        headers: {
          eventType: event.eventType,
          timestamp: event.timestamp,
          version: event.version,
          source: event.source,
          ...(event.correlationId && { correlationId: event.correlationId }),
        },
      },
    ],
  };
  await p.send(record);
  console.log(`[Kafka Producer] Published ${event.eventType} to ${topic}`);
}

// ─── Batch Publishing ──────────────────────────────────────

export async function publishEvents(
  topic: TopicName,
  events: Array<{ event: KafkaEvent; key?: string }>
): Promise<void> {
  const p = await getProducer();
  const record: ProducerRecord = {
    topic,
    compression: CompressionTypes.GZIP,
    messages: events.map(({ event, key }) => ({
      key: key || event.eventId,
      value: JSON.stringify(event),
      headers: {
        eventType: event.eventType,
        timestamp: event.timestamp,
        version: event.version,
        source: event.source,
        ...(event.correlationId && { correlationId: event.correlationId }),
      },
    })),
  };
  await p.send(record);
  console.log(`[Kafka Producer] Published ${events.length} events to ${topic}`);
}

// ─── Event Factory Helpers ─────────────────────────────────

function createBaseEvent<T extends string, P>(
  eventType: T,
  payload: P,
  source: string,
  correlationId?: string
): { eventId: string; eventType: T; timestamp: string; version: '1.0'; source: string; correlationId?: string; payload: P } {
  return {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    version: '1.0',
    source,
    ...(correlationId && { correlationId }),
    payload,
  };
}

// ─── Domain-Specific Publishers ────────────────────────────

/** Publish checkout command to COMMANDS topic */
export async function publishCheckoutCommand(
  payload: CheckoutCommandPayload,
  correlationId?: string
): Promise<CheckoutCommand> {
  const event = createBaseEvent('command.checkout', payload, 'checkout-api', correlationId) as CheckoutCommand;
  await publishEvent(TOPICS.COMMANDS, event, payload.paymentId);
  return event;
}

/** Publish order event to ORDERS topic */
export async function publishOrderCreated(
  payload: OrderPayload,
  correlationId?: string
): Promise<OrderCreatedEvent> {
  const event = createBaseEvent('order.created', payload, 'orders-service', correlationId) as OrderCreatedEvent;
  await publishEvent(TOPICS.ORDERS, event, payload.orderId);
  return event;
}

/** Publish email notification to NOTIFICATIONS topic */
export async function publishEmailNotification(
  payload: EmailNotificationPayload,
  correlationId?: string
): Promise<EmailNotificationEvent> {
  const event = createBaseEvent('notification.email', payload, 'orders-service', correlationId) as EmailNotificationEvent;
  await publishEvent(TOPICS.NOTIFICATIONS, event, payload.to);
  return event;
}

/** Publish stock update to INVENTORY topic */
export async function publishStockUpdate(
  payload: StockUpdatePayload,
  correlationId?: string
): Promise<StockUpdatedEvent> {
  const event = createBaseEvent('inventory.stock.updated', payload, 'orders-service', correlationId) as StockUpdatedEvent;
  await publishEvent(TOPICS.INVENTORY, event, payload.productId);
  return event;
}

/** Publish audit log to ANALYTICS topic */
export async function publishAuditLog(
  payload: AuditLogPayload,
  correlationId?: string
): Promise<AuditLogEvent> {
  const event = createBaseEvent('analytics.audit', payload, 'api', correlationId) as AuditLogEvent;
  await publishEvent(TOPICS.ANALYTICS, event, payload.entityId);
  return event;
}

// ─── Topic Router ──────────────────────────────────────────

/** Automatically route events to correct topic based on event type */
export function getTopicForEvent(event: KafkaEvent): TopicName {
  if (event.eventType.startsWith('command.')) return TOPICS.COMMANDS;
  if (event.eventType.startsWith('order.')) return TOPICS.ORDERS;
  if (event.eventType.startsWith('notification.')) return TOPICS.NOTIFICATIONS;
  if (event.eventType.startsWith('inventory.')) return TOPICS.INVENTORY;
  return TOPICS.ANALYTICS;
}

/** Publish event with automatic topic routing */
export async function publishAutoRoute(event: KafkaEvent, key?: string): Promise<void> {
  const topic = getTopicForEvent(event);
  await publishEvent(topic, event, key);
}
