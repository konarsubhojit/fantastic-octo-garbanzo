import { NextRequest, NextResponse } from 'next/server';
import { verifyQStashSignature, getEventMetadata } from '@/lib/qstash-webhook';
import { AnalyticsEvent } from '@/services/shared/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * QStash Webhook: Analytics Topic
 * 
 * Handles analytics events:
 * - analytics.audit (audit logs)
 * - analytics.metric (business metrics)
 * - analytics.dlq (dead letter queue)
 */

export async function POST(request: NextRequest) {
  try {
    const event = await verifyQStashSignature<AnalyticsEvent>(request);
    const metadata = getEventMetadata(request);

    console.log(`[Analytics Webhook] Received ${event.eventType} (retry: ${metadata.retryCount})`);

    // Log audit events
    if (event.eventType === 'analytics.audit') {
      console.log(`[Analytics Webhook] Audit: ${event.payload.action} on ${event.payload.entityType}:${event.payload.entityId}`);
    }

    // Handle DLQ events
    if (event.eventType === 'analytics.dlq') {
      console.error(`[Analytics Webhook] DLQ Event:`, event.payload);
    }

    // TODO: Implement analytics event processing
    // This could include:
    // - Storing audit logs in a separate database
    // - Sending metrics to monitoring systems (Datadog, New Relic, etc.)
    // - Processing DLQ events for manual intervention
    // - Generating reports and dashboards

    return NextResponse.json({
      success: true,
      eventId: event.eventId,
      eventType: event.eventType,
    });
  } catch (error) {
    console.error('[Analytics Webhook] Error processing event:', error);

    if (error instanceof Error && error.message.includes('signature')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Processing failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
