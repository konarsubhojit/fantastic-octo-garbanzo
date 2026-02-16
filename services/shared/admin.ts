import { kafka, TOPICS } from './kafka';

export async function ensureTopicsExist(): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();

  const existingTopics = await admin.listTopics();
  const requiredTopics = Object.values(TOPICS);
  const missingTopics = requiredTopics.filter((t) => !existingTopics.includes(t));

  if (missingTopics.length > 0) {
    await admin.createTopics({
      topics: missingTopics.map((topic) => ({
        topic,
        numPartitions: 3,
        replicationFactor: 1,
      })),
    });
    console.log(`[Kafka Admin] Created topics: ${missingTopics.join(', ')}`);
  } else {
    console.log('[Kafka Admin] All topics exist');
  }

  await admin.disconnect();
}
