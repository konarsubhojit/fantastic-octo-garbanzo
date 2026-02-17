import { NextRequest, NextResponse } from 'next/server';
import { verifyQStashSignature, getEventMetadata } from '@/lib/qstash-webhook';
import { OrderEvent } from '@/services/shared/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * QStash Webhook: Orders Topic
 * 
 * Handles order lifecycle events:
 * - order.created
 * - order.confirmed
 * - order.shipped
 * - order.delivered
 * - order.cancelled
 */

export async function POST(request: NextRequest) {
  try {
    const event = await verifyQStashSignature<OrderEvent>(request);
    const metadata = getEventMetadata(request);

    console.log(`[Orders Webhook] Received ${event.eventType} (retry: ${metadata.retryCount})`);
    console.log(`[Orders Webhook] Order ID: ${event.payload.orderId}, Status: ${event.payload.status}`);

    // TODO: Implement order event processing
    // This could include:
    // - Updating order status in cache
    // - Sending notifications to external systems
    // - Triggering fulfillment workflows
    // - Updating analytics dashboards

    return NextResponse.json({
      success: true,
      eventId: event.eventId,
      eventType: event.eventType,
    });
  } catch (error) {
    console.error('[Orders Webhook] Error processing event:', error);

    if (error instanceof Error && error.message.includes('signature')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Processing failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
