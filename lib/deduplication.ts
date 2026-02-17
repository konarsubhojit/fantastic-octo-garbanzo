import { redis } from '@/lib/redis';

/**
 * Request Deduplication for Webhooks
 * 
 * QStash provides at-least-once delivery, which means events may be delivered
 * multiple times. This utility helps ensure idempotent processing by tracking
 * processed event IDs.
 * 
 * Uses Redis with TTL to store processed event IDs for a limited time window.
 */

const DEDUP_TTL_SECONDS = 3600; // 1 hour - adjust based on your needs
const DEDUP_KEY_PREFIX = 'webhook:dedup:';

/**
 * Check if an event has already been processed
 * @param eventId - Unique event identifier
 * @returns true if already processed, false if new
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  const key = `${DEDUP_KEY_PREFIX}${eventId}`;
  
  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('[Deduplication] Redis check failed:', error);
    // On Redis failure, allow processing to avoid blocking
    return false;
  }
}

/**
 * Mark an event as processed
 * @param eventId - Unique event identifier
 * @param ttl - TTL in seconds (default: 1 hour)
 */
export async function markEventProcessed(eventId: string, ttl: number = DEDUP_TTL_SECONDS): Promise<void> {
  const key = `${DEDUP_KEY_PREFIX}${eventId}`;
  
  try {
    await redis.setex(key, ttl, '1');
  } catch (error) {
    console.error('[Deduplication] Failed to mark event as processed:', error);
    // Non-critical error - log but don't throw
  }
}

/**
 * Process event with deduplication
 * Wraps event processing logic to ensure idempotency
 * 
 * @param eventId - Unique event identifier
 * @param processor - Async function that processes the event
 * @returns Processing result or null if already processed
 */
export async function processWithDeduplication<T>(
  eventId: string,
  processor: () => Promise<T>
): Promise<{ processed: boolean; result?: T }> {
  // Check if already processed
  const alreadyProcessed = await isEventProcessed(eventId);
  
  if (alreadyProcessed) {
    console.log(`[Deduplication] Event ${eventId} already processed, skipping`);
    return { processed: false };
  }

  // Process the event
  try {
    const result = await processor();
    
    // Mark as processed after successful completion
    await markEventProcessed(eventId);
    
    return { processed: true, result };
  } catch (error) {
    // Don't mark as processed if processing failed
    // Allow retry on next delivery
    throw error;
  }
}
