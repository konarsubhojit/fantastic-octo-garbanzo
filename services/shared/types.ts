/**
 * Event Types for Serverless Event Architecture (QStash)
 * ═══════════════════════════════════════════════════════
 * 
 * Each webhook route handles multiple event types identified by headers.
 * Event handlers filter events using the eventType header.
 */

// ─── Base Event Structure ──────────────────────────────────

export interface BaseEvent<T extends string, P> {
  eventId: string;
  eventType: T;
  timestamp: string;
  version: '1.0';
  source: string;
  correlationId?: string;
  payload: P;
}

// ─── Order Item Structure (shared) ─────────────────────────

export interface OrderItem {
  productId: string;
  variationId?: string;
  quantity: number;
  price: number;
  productName?: string;
}

// ─── COMMANDS Topic Events ─────────────────────────────────

export interface CheckoutCommandPayload {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: OrderItem[];
  totalAmount: number;
  paymentId: string;
}

export type CheckoutCommand = BaseEvent<'command.checkout', CheckoutCommandPayload>;

export interface InventoryReservePayload {
  orderId: string;
  items: Array<{ productId: string; variationId?: string; quantity: number }>;
}

export type InventoryReserveCommand = BaseEvent<'command.inventory.reserve', InventoryReservePayload>;

export interface InventoryReleasePayload {
  orderId: string;
  items: Array<{ productId: string; variationId?: string; quantity: number }>;
  reason: 'cancelled' | 'failed' | 'timeout';
}

export type InventoryReleaseCommand = BaseEvent<'command.inventory.release', InventoryReleasePayload>;

export type CommandEvent = CheckoutCommand | InventoryReserveCommand | InventoryReleaseCommand;

// ─── ORDERS Topic Events ───────────────────────────────────

export interface OrderPayload {
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}

export type OrderCreatedEvent = BaseEvent<'order.created', OrderPayload>;
export type OrderConfirmedEvent = BaseEvent<'order.confirmed', OrderPayload>;
export type OrderShippedEvent = BaseEvent<'order.shipped', OrderPayload & { trackingNumber?: string; carrier?: string }>;
export type OrderDeliveredEvent = BaseEvent<'order.delivered', OrderPayload & { deliveredAt: string }>;
export type OrderCancelledEvent = BaseEvent<'order.cancelled', OrderPayload & { reason: string; cancelledBy: 'user' | 'system' | 'admin' }>;

export type OrderEvent = OrderCreatedEvent | OrderConfirmedEvent | OrderShippedEvent | OrderDeliveredEvent | OrderCancelledEvent;

// ─── NOTIFICATIONS Topic Events ────────────────────────────

export interface EmailNotificationPayload {
  to: string;
  subject: string;
  templateId: string;
  templateData: Record<string, unknown>;
  priority: 'high' | 'normal' | 'low';
}

export type EmailNotificationEvent = BaseEvent<'notification.email', EmailNotificationPayload>;

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export type PushNotificationEvent = BaseEvent<'notification.push', PushNotificationPayload>;

export interface SmsNotificationPayload {
  phoneNumber: string;
  message: string;
}

export type SmsNotificationEvent = BaseEvent<'notification.sms', SmsNotificationPayload>;

export type NotificationEvent = EmailNotificationEvent | PushNotificationEvent | SmsNotificationEvent;

// ─── INVENTORY Topic Events ────────────────────────────────

export interface StockUpdatePayload {
  productId: string;
  variationId?: string;
  previousStock: number;
  newStock: number;
  reason: 'sale' | 'restock' | 'adjustment' | 'return';
  orderId?: string;
}

export type StockUpdatedEvent = BaseEvent<'inventory.stock.updated', StockUpdatePayload>;

export interface LowStockPayload {
  productId: string;
  variationId?: string;
  currentStock: number;
  threshold: number;
  productName: string;
}

export type LowStockAlertEvent = BaseEvent<'inventory.stock.low', LowStockPayload>;

export interface StockReservedPayload {
  orderId: string;
  items: Array<{ productId: string; variationId?: string; quantity: number; reserved: boolean }>;
}

export type StockReservedEvent = BaseEvent<'inventory.stock.reserved', StockReservedPayload>;

export type InventoryEvent = StockUpdatedEvent | LowStockAlertEvent | StockReservedEvent;

// ─── ANALYTICS Topic Events ────────────────────────────────

export interface BusinessMetricPayload {
  metric: string;
  value: number;
  dimensions: Record<string, string>;
}

export type BusinessMetricEvent = BaseEvent<'analytics.metric', BusinessMetricPayload>;

export interface AuditLogPayload {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type AuditLogEvent = BaseEvent<'analytics.audit', AuditLogPayload>;

export interface DeadLetterPayload {
  originalTopic: string;
  originalEventType: string;
  originalEvent: unknown;
  error: string;
  failedAt: string;
  retryCount: number;
}

export type DeadLetterEvent = BaseEvent<'analytics.dlq', DeadLetterPayload>;

export type AnalyticsEvent = BusinessMetricEvent | AuditLogEvent | DeadLetterEvent;

// ─── All Events Union ──────────────────────────────────────

export type AppEvent = CommandEvent | OrderEvent | NotificationEvent | InventoryEvent | AnalyticsEvent;

// Legacy alias for backward compatibility
/** @deprecated Use AppEvent instead */
export type KafkaEvent = AppEvent;

// ─── Event Type Extraction ─────────────────────────────────

export type EventType = AppEvent['eventType'];

// ─── Event Type Guards ─────────────────────────────────────

export function isCommandEvent(event: AppEvent): event is CommandEvent {
  return event.eventType.startsWith('command.');
}

export function isOrderEvent(event: AppEvent): event is OrderEvent {
  return event.eventType.startsWith('order.');
}

export function isNotificationEvent(event: AppEvent): event is NotificationEvent {
  return event.eventType.startsWith('notification.');
}

export function isInventoryEvent(event: AppEvent): event is InventoryEvent {
  return event.eventType.startsWith('inventory.');
}

export function isAnalyticsEvent(event: AppEvent): event is AnalyticsEvent {
  return event.eventType.startsWith('analytics.');
}

// ─── Legacy Type Aliases (for backwards compatibility) ─────

/** @deprecated Use CheckoutCommand instead */
export type PaymentSuccessEvent = CheckoutCommand;
