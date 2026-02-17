import { NextRequest } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { handleCorsPreflightRequest, corsResponse } from '@/services/shared/cors';
import type { AppEvent } from '@/services/shared/types';

export const dynamic = 'force-dynamic';

// Initialize QStash receiver for signature verification
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

// ─── Event Handlers ────────────────────────────────────────────

async function handleStockUpdated(event: AppEvent): Promise<void> {
  const { payload } = event;
  console.log(`[Inventory Service] Stock Updated:`, {
    eventId: event.eventId,
    timestamp: event.timestamp,
    correlationId: event.correlationId,
    payload,
  });
}

async function handleStockLow(event: AppEvent): Promise<void> {
  const { payload } = event;
  console.log(`[Inventory Service] Low Stock Alert:`, {
    eventId: event.eventId,
    timestamp: event.timestamp,
    correlationId: event.correlationId,
    payload,
  });
}

async function handleStockReserved(event: AppEvent): Promise<void> {
  const { payload } = event;
  console.log(`[Inventory Service] Stock Reserved:`, {
    eventId: event.eventId,
    timestamp: event.timestamp,
    correlationId: event.correlationId,
    payload,
  });
}

// ─── HTTP Handlers ─────────────────────────────────────────────

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

// GET handler for health check
export async function GET(request: NextRequest) {
  return corsResponse(
    {
      status: 'healthy',
      service: 'inventory',
      timestamp: new Date().toISOString(),
    },
    200,
    request
  );
}

// POST handler for webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('upstash-signature');

    if (!signature) {
      console.error('[Inventory Service] Missing QStash signature');
      return corsResponse({ error: 'Missing signature' }, 401, request);
    }

    // Verify QStash signature
    try {
      const isValid = await receiver.verify({
        signature,
        body,
      });

      if (!isValid) {
        console.error('[Inventory Service] Invalid QStash signature');
        return corsResponse({ error: 'Invalid signature' }, 401, request);
      }
    } catch (error) {
      console.error('[Inventory Service] Signature verification failed:', error);
      return corsResponse({ error: 'Signature verification failed' }, 401, request);
    }

    // Parse event
    const event: AppEvent = JSON.parse(body);
    const eventType = event.eventType;

    console.log(`[Inventory Service] Received event: ${eventType}`);

    // Route to appropriate handler
    switch (eventType) {
      case 'inventory.stock.updated':
        await handleStockUpdated(event);
        return corsResponse({ success: true, message: 'Stock update processed' }, 200, request);

      case 'inventory.stock.low':
        await handleStockLow(event);
        return corsResponse({ success: true, message: 'Low stock alert processed' }, 200, request);

      case 'inventory.stock.reserved':
        await handleStockReserved(event);
        return corsResponse({ success: true, message: 'Stock reservation processed' }, 200, request);

      default:
        console.log(`[Inventory Service] Unknown event type: ${eventType}`);
        return corsResponse({ success: true, message: 'Event ignored' }, 200, request);
    }
  } catch (error) {
    console.error('[Inventory Service] Error processing webhook:', error);
    return corsResponse(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      500,
      request
    );
  }
}
