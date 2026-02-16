/**
 * Standalone script to create Kafka topics.
 * Run: npx tsx services/shared/setup-topics.ts
 */
import { ensureTopicsExist } from './admin';

try {
  await ensureTopicsExist();
  console.log('[Kafka Setup] Topics created successfully');
  process.exit(0);
} catch (err) {
  console.error('[Kafka Setup] Failed:', err);
  process.exit(1);
}
