import { kafka, TOPICS, TOPIC_CONFIG } from './kafka';

/**
 * Create all required Kafka topics with optimized configuration.
 * Call this during application startup or as part of deployment.
 */
export async function ensureTopicsExist(): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();

  try {
    const existingTopics = await admin.listTopics();
    const requiredTopics = Object.values(TOPICS);
    const missingTopics = requiredTopics.filter((t) => !existingTopics.includes(t));

    if (missingTopics.length > 0) {
      await admin.createTopics({
        waitForLeaders: true,
        topics: missingTopics.map((topic) => {
          const config = TOPIC_CONFIG[topic as keyof typeof TOPIC_CONFIG];
          return {
            topic,
            numPartitions: config?.partitions ?? 3,
            replicationFactor: config?.replicationFactor ?? 1,
            configEntries: [
              // Retention: 7 days for most topics
              { name: 'retention.ms', value: '604800000' },
              // Compression at broker level
              { name: 'compression.type', value: 'gzip' },
              // Cleanup policy: delete old segments
              { name: 'cleanup.policy', value: 'delete' },
            ],
          };
        }),
      });
      console.log(`[Kafka Admin] Created topics: ${missingTopics.join(', ')}`);
    } else {
      console.log('[Kafka Admin] All topics exist');
    }

    // Log topic info
    console.log('[Kafka Admin] Topic configuration:');
    for (const topic of requiredTopics) {
      const config = TOPIC_CONFIG[topic as keyof typeof TOPIC_CONFIG];
      console.log(`  - ${topic}: ${config?.partitions ?? 3} partitions`);
    }
  } finally {
    await admin.disconnect();
  }
}

/**
 * Describe topic partition and offset information.
 * Useful for monitoring and debugging.
 */
export async function describeTopics(): Promise<Record<string, { partitions: number; offsets: Array<{ partition: number; offset: string }> }>> {
  const admin = kafka.admin();
  await admin.connect();

  try {
    const topics = Object.values(TOPICS);
    const metadata = await admin.fetchTopicMetadata({ topics });
    const result: Record<string, { partitions: number; offsets: Array<{ partition: number; offset: string }> }> = {};

    for (const topicMeta of metadata.topics) {
      const offsets = await admin.fetchTopicOffsets(topicMeta.name);
      result[topicMeta.name] = {
        partitions: topicMeta.partitions.length,
        offsets: offsets.map((o) => ({ partition: o.partition, offset: o.high })),
      };
    }

    return result;
  } finally {
    await admin.disconnect();
  }
}

/**
 * Delete all topics (use with caution - for development only).
 */
export async function deleteAllTopics(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot delete topics in production');
  }

  const admin = kafka.admin();
  await admin.connect();

  try {
    const topics = Object.values(TOPICS);
    const existingTopics = await admin.listTopics();
    const toDelete = topics.filter((t) => existingTopics.includes(t));

    if (toDelete.length > 0) {
      await admin.deleteTopics({ topics: toDelete });
      console.log(`[Kafka Admin] Deleted topics: ${toDelete.join(', ')}`);
    }
  } finally {
    await admin.disconnect();
  }
}
