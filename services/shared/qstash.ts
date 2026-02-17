import { Client } from '@upstash/qstash';

// QStash credentials
const QSTASH_TOKEN = process.env.QSTASH_TOKEN || '';
const QSTASH_BASE_URL = process.env.QSTASH_BASE_URL || 'http://localhost:3000';

if (!QSTASH_TOKEN) {
  console.warn('[QStash] Warning: QSTASH_TOKEN not set. Message publishing will fail.');
}

// Initialize QStash client
export const qstashClient = new Client({
  token: QSTASH_TOKEN,
});

/**
 * Webhook Routes for Event Domains
 * ═══════════════════════════════════════════════════════
 * 
 * QStash publishes messages to these HTTP webhook endpoints.
 * Each route corresponds to a domain in the previous Kafka topic structure.
 * 
 * Event type routing is handled via HTTP headers, similar to the
 * previous header-based Kafka routing strategy.
 */
export const WEBHOOK_ROUTES = {
  /** Order processing webhook - handles checkout commands */
  ORDERS: `${QSTASH_BASE_URL}/api/webhooks/orders`,
  /** Email notification webhook - sends emails */
  EMAIL: `${QSTASH_BASE_URL}/api/webhooks/email`,
  /** Inventory management webhook - stock updates and alerts */
  INVENTORY: `${QSTASH_BASE_URL}/api/webhooks/inventory`,
  /** Analytics and audit logs webhook - logging and metrics */
  ANALYTICS: `${QSTASH_BASE_URL}/api/webhooks/analytics`,
} as const;

export type WebhookRoute = (typeof WEBHOOK_ROUTES)[keyof typeof WEBHOOK_ROUTES];

/**
 * Legacy topic names mapping for backward compatibility
 * Maps old Kafka topic names to new webhook routes
 */
export const TOPICS = {
  COMMANDS: WEBHOOK_ROUTES.ORDERS, // Commands are processed by orders service
  ORDERS: WEBHOOK_ROUTES.ORDERS,
  NOTIFICATIONS: WEBHOOK_ROUTES.EMAIL,
  INVENTORY: WEBHOOK_ROUTES.INVENTORY,
  ANALYTICS: WEBHOOK_ROUTES.ANALYTICS,
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];
