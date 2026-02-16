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

export const TOPICS = {
  PAYMENT_EVENTS: 'payment-events',
  ORDER_EVENTS: 'order-events',
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];
