import { Consumer, EachMessagePayload } from 'kafkajs';
import { kafka, TopicName } from './kafka';

export interface ConsumerConfig {
  groupId: string;
  topics: TopicName[];
  handler: (payload: EachMessagePayload) => Promise<void>;
}

export async function createConsumer(config: ConsumerConfig): Promise<Consumer> {
  const consumer = kafka.consumer({
    groupId: config.groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });

  await consumer.connect();
  console.log(`[Kafka Consumer:${config.groupId}] Connected`);

  for (const topic of config.topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`[Kafka Consumer:${config.groupId}] Subscribed to ${topic}`);
  }

  await consumer.run({
    eachMessage: async (payload) => {
      try {
        await config.handler(payload);
      } catch (error) {
        console.error(
          `[Kafka Consumer:${config.groupId}] Error processing message from ${payload.topic}:`,
          error
        );
      }
    },
  });

  return consumer;
}
