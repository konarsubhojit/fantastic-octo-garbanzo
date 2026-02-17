import { Client } from '@upstash/qstash';

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;

if (!QSTASH_TOKEN) {
  throw new Error('QSTASH_TOKEN environment variable is required');
}

/**
 * Upstash QStash Client
 * 
 * QStash is a serverless HTTP-based message queue that replaces Kafka.
 * Benefits:
 * - No infrastructure management (no Docker, Zookeeper, etc.)
 * - Serverless-friendly (HTTP webhooks, no persistent connections)
 * - Built-in retries and DLQ
 * - At-least-once delivery guarantees
 * - Native HTTPS support
 */
export const qstash = new Client({
  token: QSTASH_TOKEN,
});

/**
 * Webhook signing keys for verification
 * Used to verify incoming webhook requests are from QStash
 */
export const signingKeys = {
  currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
};

/**
 * Event Topics (Logical Grouping)
 * QStash doesn't have native "topics" like Kafka, but we can simulate them
 * by using different webhook URLs for different event types.
 */
export const TOPICS = {
  /** Commands from API layer - checkout, reservations */
  COMMANDS: 'commands',
  /** Order lifecycle events */
  ORDERS: 'orders',
  /** Email, push, SMS notifications */
  NOTIFICATIONS: 'notifications',
  /** Inventory stock updates */
  INVENTORY: 'inventory',
  /** Analytics, audit logs, metrics */
  ANALYTICS: 'analytics',
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

/**
 * Get webhook URL for a topic
 * In production, this should be your deployed domain
 * In development, use a tunnel service like ngrok
 */
export function getWebhookUrl(topic: TopicName): string {
  const baseUrl = process.env.QSTASH_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/webhooks/${topic}`;
}
