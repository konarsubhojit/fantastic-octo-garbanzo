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
      console.error('[Analytics Webhook] Missing QStash signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify QStash signature
    try {
      const isValid = await receiver.verify({
        signature,
        body,
      });

      if (!isValid) {
        console.error('[Analytics Webhook] Invalid QStash signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch (error) {
      console.error('[Analytics Webhook] Signature verification failed:', error);
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    // Parse event
    const event: AppEvent = JSON.parse(body);
    const eventType = event.eventType;

    console.log(`[Analytics Webhook] Received event: ${eventType}`);

    // Handle analytics events
    if (eventType === 'analytics.audit') {
      console.log(`[Analytics Webhook] Audit log:`, event.payload);
      // TODO: Store audit logs in database or analytics service
      return NextResponse.json({ success: true, message: 'Audit log recorded' });
    }

    if (eventType === 'analytics.metric') {
      console.log(`[Analytics Webhook] Business metric:`, event.payload);
      // TODO: Send to analytics platform (e.g., Mixpanel, Amplitude)
      return NextResponse.json({ success: true, message: 'Metric recorded' });
    }

    if (eventType === 'analytics.dlq') {
      console.error(`[Analytics Webhook] Dead letter event:`, event.payload);
      // TODO: Alert on-call engineer or store for investigation
      return NextResponse.json({ success: true, message: 'DLQ event logged' });
    }

    console.log(`[Analytics Webhook] Unknown event type: ${eventType}`);
    return NextResponse.json({ success: true, message: 'Event ignored' });
  } catch (error) {
    console.error('[Analytics Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
