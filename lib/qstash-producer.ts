import { qstash, getWebhookUrl, TOPICS, TopicName } from '@/lib/qstash';
import {
  CheckoutCommand,
  OrderCreatedEvent,
  EmailNotificationEvent,
  StockUpdatedEvent,
  AuditLogEvent,
  CheckoutCommandPayload,
  OrderPayload,
  EmailNotificationPayload,
  StockUpdatePayload,
  AuditLogPayload,
  KafkaEvent,
} from '@/services/shared/types';
import { randomUUID } from 'node:crypto';

// ─── Event Factory Helpers ─────────────────────────────────

function createBaseEvent<T extends string, P>(
  eventType: T,
  payload: P,
  source: string,
  correlationId?: string
): {
  eventId: string;
  eventType: T;
  timestamp: string;
  version: '1.0';
  source: string;
  correlationId?: string;
  payload: P;
} {
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

// ─── Low-Level Publish ─────────────────────────────────────

/**
 * Publish an event to QStash
 * QStash will POST the event to the webhook URL
 * 
 * @param topic - Logical topic (determines webhook URL)
 * @param event - Event payload with metadata
 * @param options - Additional QStash options (retries, delay, etc.)
 */
export async function publishEvent(
  topic: TopicName,
  event: KafkaEvent,
  options?: {
    delay?: number; // Delay in seconds before delivery
    retries?: number; // Number of retries (default: 3)
  }
): Promise<void> {
  const webhookUrl = getWebhookUrl(topic);
  
  try {
    await qstash.publishJSON({
      url: webhookUrl,
      body: event,
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Type': event.eventType,
        'X-Event-ID': event.eventId,
        'X-Correlation-ID': event.correlationId || '',
        'X-Event-Version': event.version,
        'X-Event-Source': event.source,
      },
      retries: options?.retries ?? 3,
      delay: options?.delay,
    });

    console.log(`[QStash] Published ${event.eventType} to ${topic} (${webhookUrl})`);
  } catch (error) {
    console.error(`[QStash] Failed to publish ${event.eventType}:`, error);
    throw error;
  }
}

// ─── Batch Publishing ──────────────────────────────────────

/**
 * Publish multiple events in a batch
 * QStash batch API sends up to 100 messages per request
 */
export async function publishEvents(
  topic: TopicName,
  events: Array<{ event: KafkaEvent; delay?: number }>
): Promise<void> {
  const webhookUrl = getWebhookUrl(topic);

  try {
    const messages = events.map(({ event, delay }) => ({
      url: webhookUrl,
      body: JSON.stringify(event),
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Type': event.eventType,
        'X-Event-ID': event.eventId,
        'X-Correlation-ID': event.correlationId || '',
        'X-Event-Version': event.version,
        'X-Event-Source': event.source,
      },
      retries: 3,
      delay,
    }));

    await qstash.batchJSON(messages);
    console.log(`[QStash] Published ${events.length} events to ${topic}`);
  } catch (error) {
    console.error(`[QStash] Failed to batch publish to ${topic}:`, error);
    throw error;
  }
}

// ─── Domain-Specific Publishers ────────────────────────────

/** Publish checkout command to COMMANDS topic */
export async function publishCheckoutCommand(
  payload: CheckoutCommandPayload,
  correlationId?: string
): Promise<CheckoutCommand> {
  const event = createBaseEvent('command.checkout', payload, 'checkout-api', correlationId) as CheckoutCommand;
  await publishEvent(TOPICS.COMMANDS, event);
  return event;
}

/** Publish order event to ORDERS topic */
export async function publishOrderCreated(
  payload: OrderPayload,
  correlationId?: string
): Promise<OrderCreatedEvent> {
  const event = createBaseEvent('order.created', payload, 'orders-service', correlationId) as OrderCreatedEvent;
  await publishEvent(TOPICS.ORDERS, event);
  return event;
}

/** Publish email notification to NOTIFICATIONS topic */
export async function publishEmailNotification(
  payload: EmailNotificationPayload,
  correlationId?: string
): Promise<EmailNotificationEvent> {
  const event = createBaseEvent('notification.email', payload, 'orders-service', correlationId) as EmailNotificationEvent;
  await publishEvent(TOPICS.NOTIFICATIONS, event);
  return event;
}

/** Publish stock update to INVENTORY topic */
export async function publishStockUpdate(
  payload: StockUpdatePayload,
  correlationId?: string
): Promise<StockUpdatedEvent> {
  const event = createBaseEvent('inventory.stock.updated', payload, 'orders-service', correlationId) as StockUpdatedEvent;
  await publishEvent(TOPICS.INVENTORY, event);
  return event;
}

/** Publish audit log to ANALYTICS topic */
export async function publishAuditLog(
  payload: AuditLogPayload,
  correlationId?: string
): Promise<AuditLogEvent> {
  const event = createBaseEvent('analytics.audit', payload, 'api', correlationId) as AuditLogEvent;
  await publishEvent(TOPICS.ANALYTICS, event);
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
export async function publishAutoRoute(event: KafkaEvent): Promise<void> {
  const topic = getTopicForEvent(event);
  await publishEvent(topic, event);
}
