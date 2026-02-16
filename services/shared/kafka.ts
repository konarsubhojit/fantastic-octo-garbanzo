import { Kafka, logLevel } from 'kafkajs';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'ecommerce-app';

export const kafka = new Kafka({
  clientId: KAFKA_CLIENT_ID,
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.INFO,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

/**
 * Optimized 5-Topic Architecture for E-commerce Platform
 * ═══════════════════════════════════════════════════════
 * 
 * Design principles:
 * - Header-based routing within topics for efficient consumer filtering
 * - Consumer groups for horizontal scaling
 * - Meaningful partition keys for ordering guarantees
 * - Single topic per domain for reduced operational overhead
 * 
 * Topic structure:
 * 1. COMMANDS    - Incoming requests (checkout, inventory reservations)
 * 2. ORDERS      - Order lifecycle events (created, confirmed, shipped, delivered, cancelled)
 * 3. NOTIFICATIONS - All notification triggers (email, push, SMS)
 * 4. INVENTORY   - Stock updates, reservations, low stock alerts
 * 5. ANALYTICS   - Business events, metrics, logging, DLQ events
 */
export const TOPICS = {
  /** Incoming commands from API layer - triggers workflows */
  COMMANDS: 'ecom.commands',
  /** Order domain events - full lifecycle tracking */
  ORDERS: 'ecom.orders',
  /** Notification triggers - email, push, SMS */
  NOTIFICATIONS: 'ecom.notifications',
  /** Inventory domain - stock management */
  INVENTORY: 'ecom.inventory',
  /** Analytics, logging, metrics, dead letters */
  ANALYTICS: 'ecom.analytics',
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

/** Partition configuration for each topic */
export const TOPIC_CONFIG = {
  [TOPICS.COMMANDS]: { partitions: 6, replicationFactor: 1 },
  [TOPICS.ORDERS]: { partitions: 6, replicationFactor: 1 },
  [TOPICS.NOTIFICATIONS]: { partitions: 3, replicationFactor: 1 },
  [TOPICS.INVENTORY]: { partitions: 6, replicationFactor: 1 },
  [TOPICS.ANALYTICS]: { partitions: 3, replicationFactor: 1 },
} as const;
