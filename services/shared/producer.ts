import { Producer, ProducerRecord } from 'kafkajs';
import { kafka, TopicName } from './kafka';
import { KafkaEvent } from './types';

let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
    await producer.connect();
    console.log('[Kafka Producer] Connected');
  }
  return producer;
}

export async function publishEvent(
  topic: TopicName,
  event: KafkaEvent,
  key?: string
): Promise<void> {
  const p = await getProducer();
  const record: ProducerRecord = {
    topic,
    messages: [
      {
        key: key || event.eventId,
        value: JSON.stringify(event),
        headers: {
          eventType: event.eventType,
          timestamp: event.timestamp,
        },
      },
    ],
  };
  await p.send(record);
  console.log(`[Kafka Producer] Published ${event.eventType} to ${topic}`);
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
    console.log('[Kafka Producer] Disconnected');
  }
}
