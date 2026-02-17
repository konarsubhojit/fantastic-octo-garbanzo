import { qstashClient, TopicName, TOPICS, WEBHOOK_ROUTES } from './qstash';
import {
  AppEvent,
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

// ─── Event Publishing via QStash ───────────────────────────

export async function publishEvent(
  route: string,
  event: AppEvent,
  _key?: string // Kept for backward compatibility but not used by QStash
): Promise<void> {
  try {
    await qstashClient.publishJSON({
      url: route,
      body: event,
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Type': event.eventType,
        'X-Event-Id': event.eventId,
        'X-Event-Timestamp': event.timestamp,
        'X-Event-Version': event.version,
        'X-Event-Source': event.source,
        ...(event.correlationId && { 'X-Correlation-Id': event.correlationId }),
      },
    });
    console.log(`[QStash Producer] Published ${event.eventType} to ${route}`);
  } catch (error) {
    console.error(`[QStash Producer] Failed to publish ${event.eventType}:`, error);
    throw error;
  }
}

// ─── Batch Publishing ──────────────────────────────────────

export async function publishEvents(
  route: string,
  events: Array<{ event: AppEvent; key?: string }>
): Promise<void> {
  // QStash doesn't have native batch support, so we publish serially
  // For better performance, consider using Promise.allSettled in production
  for (const { event } of events) {
    await publishEvent(route, event);
  }
  console.log(`[QStash Producer] Published ${events.length} events to ${route}`);
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

/** Publish checkout command to orders webhook */
export async function publishCheckoutCommand(
  payload: CheckoutCommandPayload,
  correlationId?: string
): Promise<CheckoutCommand> {
  const event = createBaseEvent('command.checkout', payload, 'checkout-api', correlationId) as CheckoutCommand;
  await publishEvent(WEBHOOK_ROUTES.ORDERS, event, payload.paymentId);
  return event;
}

/** Publish order event to orders webhook */
export async function publishOrderCreated(
  payload: OrderPayload,
  correlationId?: string
): Promise<OrderCreatedEvent> {
  const event = createBaseEvent('order.created', payload, 'orders-service', correlationId) as OrderCreatedEvent;
  await publishEvent(WEBHOOK_ROUTES.ORDERS, event, payload.orderId);
  return event;
}

/** Publish email notification to email webhook */
export async function publishEmailNotification(
  payload: EmailNotificationPayload,
  correlationId?: string
): Promise<EmailNotificationEvent> {
  const event = createBaseEvent('notification.email', payload, 'orders-service', correlationId) as EmailNotificationEvent;
  await publishEvent(WEBHOOK_ROUTES.EMAIL, event, payload.to);
  return event;
}

/** Publish stock update to inventory webhook */
export async function publishStockUpdate(
  payload: StockUpdatePayload,
  correlationId?: string
): Promise<StockUpdatedEvent> {
  const event = createBaseEvent('inventory.stock.updated', payload, 'orders-service', correlationId) as StockUpdatedEvent;
  await publishEvent(WEBHOOK_ROUTES.INVENTORY, event, payload.productId);
  return event;
}

/** Publish audit log to analytics webhook */
export async function publishAuditLog(
  payload: AuditLogPayload,
  correlationId?: string
): Promise<AuditLogEvent> {
  const event = createBaseEvent('analytics.audit', payload, 'api', correlationId) as AuditLogEvent;
  await publishEvent(WEBHOOK_ROUTES.ANALYTICS, event, payload.entityId);
  return event;
}

// ─── Route Router ──────────────────────────────────────────

/** Automatically route events to correct webhook based on event type */
export function getTopicForEvent(event: AppEvent): TopicName {
  if (event.eventType.startsWith('command.')) return TOPICS.COMMANDS;
  if (event.eventType.startsWith('order.')) return TOPICS.ORDERS;
  if (event.eventType.startsWith('notification.')) return TOPICS.NOTIFICATIONS;
  if (event.eventType.startsWith('inventory.')) return TOPICS.INVENTORY;
  return TOPICS.ANALYTICS;
}

/** Publish event with automatic route routing */
export async function publishAutoRoute(event: AppEvent, key?: string): Promise<void> {
  const route = getTopicForEvent(event);
  await publishEvent(route, event, key);
}

// ─── Legacy Functions (no-ops for compatibility) ───────────

/** @deprecated No longer needed with QStash - kept for backward compatibility */
export async function getProducer(): Promise<null> {
  return null;
}

/** @deprecated No longer needed with QStash - kept for backward compatibility */
export async function disconnectProducer(): Promise<void> {
  // No-op
}
