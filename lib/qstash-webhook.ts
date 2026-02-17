import { NextRequest } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { signingKeys } from '@/lib/qstash';

/**
 * Verify QStash webhook signature
 * 
 * QStash signs all webhook requests to ensure authenticity.
 * This prevents unauthorized requests from spoofed sources.
 * 
 * @param request - Next.js request object
 * @returns Parsed and verified event payload
 * @throws Error if signature verification fails
 */
export async function verifyQStashSignature<T = unknown>(
  request: NextRequest
): Promise<T> {
  if (!signingKeys.currentSigningKey || !signingKeys.nextSigningKey) {
    console.warn('[QStash] Signing keys not configured - skipping verification (DEV mode)');
    // In development, allow unsigned requests
    if (process.env.NODE_ENV === 'development') {
      return await request.json() as T;
    }
    throw new Error('QStash signing keys not configured');
  }

  const receiver = new Receiver({
    currentSigningKey: signingKeys.currentSigningKey,
    nextSigningKey: signingKeys.nextSigningKey,
  });

  // Get signature from headers
  const signature = request.headers.get('upstash-signature');
  if (!signature) {
    throw new Error('Missing upstash-signature header');
  }

  // Get request body
  const body = await request.text();

  try {
    // Verify and parse
    const verified = await receiver.verify({
      signature,
      body,
    });

    return verified as T;
  } catch (error) {
    console.error('[QStash] Signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Extract event metadata from request headers
 */
export function getEventMetadata(request: NextRequest) {
  return {
    eventType: request.headers.get('x-event-type') || 'unknown',
    eventId: request.headers.get('x-event-id') || 'unknown',
    correlationId: request.headers.get('x-correlation-id') || undefined,
    version: request.headers.get('x-event-version') || '1.0',
    source: request.headers.get('x-event-source') || 'unknown',
    retryCount: parseInt(request.headers.get('upstash-retried') || '0', 10),
    messageId: request.headers.get('upstash-message-id') || 'unknown',
  };
}

/**
 * Check if event is a retry
 */
export function isRetry(request: NextRequest): boolean {
  const retried = request.headers.get('upstash-retried');
  return retried !== null && parseInt(retried, 10) > 0;
}
