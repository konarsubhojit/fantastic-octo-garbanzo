import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { AppEvent } from '@/services/shared/types';

export const dynamic = 'force-dynamic';

// Initialize QStash receiver for signature verification
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

// ─── Webhook Handler ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Get request body and signature
    const body = await request.text();
    const signature = request.headers.get('upstash-signature');

    if (!signature) {
      console.error('[Inventory Webhook] Missing QStash signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify QStash signature
    try {
      const isValid = await receiver.verify({
        signature,
        body,
      });

      if (!isValid) {
        console.error('[Inventory Webhook] Invalid QStash signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch (error) {
      console.error('[Inventory Webhook] Signature verification failed:', error);
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    // Parse event
    const event: AppEvent = JSON.parse(body);
    const eventType = event.eventType;

    console.log(`[Inventory Webhook] Received event: ${eventType}`);

    // Handle inventory events
    if (eventType === 'inventory.stock.updated') {
      console.log(`[Inventory Webhook] Stock updated:`, event.payload);
      return NextResponse.json({ success: true, message: 'Stock update logged' });
    }

    if (eventType === 'inventory.stock.low') {
      console.log(`[Inventory Webhook] Low stock alert:`, event.payload);
      // TODO: Send alerts to admin or trigger restock process
      return NextResponse.json({ success: true, message: 'Low stock alert logged' });
    }

    if (eventType === 'inventory.stock.reserved') {
      console.log(`[Inventory Webhook] Stock reserved:`, event.payload);
      return NextResponse.json({ success: true, message: 'Stock reservation logged' });
    }

    console.log(`[Inventory Webhook] Unknown event type: ${eventType}`);
    return NextResponse.json({ success: true, message: 'Event ignored' });
  } catch (error) {
    console.error('[Inventory Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
