import { NextRequest, NextResponse } from 'next/server';
import { verifyQStashSignature, getEventMetadata } from '@/lib/qstash-webhook';
import { InventoryEvent } from '@/services/shared/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * QStash Webhook: Inventory Topic
 * 
 * Handles inventory events:
 * - inventory.stock.updated
 * - inventory.stock.low
 * - inventory.stock.reserved
 */

export async function POST(request: NextRequest) {
  try {
    const event = await verifyQStashSignature<InventoryEvent>(request);
    const metadata = getEventMetadata(request);

    console.log(`[Inventory Webhook] Received ${event.eventType} (retry: ${metadata.retryCount})`);

    // TODO: Implement inventory event processing
    // This could include:
    // - Invalidating product caches
    // - Sending low stock alerts to admins
    // - Updating analytics/reporting systems
    // - Triggering reorder workflows

    return NextResponse.json({
      success: true,
      eventId: event.eventId,
      eventType: event.eventType,
    });
  } catch (error) {
    console.error('[Inventory Webhook] Error processing event:', error);

    if (error instanceof Error && error.message.includes('signature')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Processing failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
