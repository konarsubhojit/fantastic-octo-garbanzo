import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { drizzleDb } from '@/lib/db';
import { orders, orderItems, products, productVariations } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { handleCorsPreflightRequest, corsResponse } from '@/services/shared/cors';
import type { CheckoutCommand, OrderPayload, EmailNotificationPayload, AppEvent } from '@/services/shared/types';

export const dynamic = 'force-dynamic';

// Initialize QStash receiver for signature verification
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

// Publisher helper - sends events back to QStash
async function publishEvent(url: string, event: AppEvent): Promise<void> {
  const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
  if (!QSTASH_TOKEN) {
    console.warn('[Orders Service] QSTASH_TOKEN not set, skipping publish');
    return;
  }

  const response = await fetch('https://qstash.upstash.io/v2/publish/' + encodeURIComponent(url), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${QSTASH_TOKEN}`,
      'Content-Type': 'application/json',
      'Upstash-Forward-X-Event-Type': event.eventType,
      'Upstash-Forward-X-Event-Id': event.eventId,
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error(`Failed to publish event: ${response.statusText}`);
  }
}

// Order processing logic
async function handleCheckoutCommand(event: CheckoutCommand): Promise<void> {
  const { userId, customerName, customerEmail, customerAddress, items, totalAmount, paymentId } = event.payload;
  const correlationId = event.correlationId || event.eventId;

  console.log(`[Orders Service] Processing checkout for user ${userId}, payment ${paymentId}`);

  // Create order in a transaction
  const result = await drizzleDb.transaction(async (tx) => {
    // 1. Create the order
    const [newOrder] = await tx
      .insert(orders)
      .values({
        id: randomUUID(),
        userId,
        customerName,
        customerEmail,
        customerAddress,
        totalAmount,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 2. Create order items
    const orderItemValues = items.map((item) => ({
      id: randomUUID(),
      orderId: newOrder.id,
      productId: item.productId,
      variationId: item.variationId || null,
      quantity: item.quantity,
      price: item.price,
    }));

    await tx.insert(orderItems).values(orderItemValues);

    // 3. Decrement stock
    for (const item of items) {
      const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
      const previousStock = product?.stock ?? 0;

      if (item.variationId) {
        await tx
          .update(productVariations)
          .set({ stock: sql`${productVariations.stock} - ${item.quantity}` })
          .where(eq(productVariations.id, item.variationId));
      }
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}` })
        .where(eq(products.id, item.productId));

      // Publish stock update event
      const stockUpdateEvent = {
        eventId: randomUUID(),
        eventType: 'inventory.stock.updated' as const,
        timestamp: new Date().toISOString(),
        version: '1.0' as const,
        source: 'orders-service',
        correlationId,
        payload: {
          productId: item.productId,
          variationId: item.variationId,
          previousStock,
          newStock: previousStock - item.quantity,
          reason: 'sale' as const,
          orderId: newOrder.id,
        },
      };

      publishEvent(
        process.env.QSTASH_INVENTORY_URL || '',
        stockUpdateEvent
      ).catch((err) => console.error('[Orders Service] Failed to publish stock update:', err));
    }

    return newOrder;
  });

  console.log(`[Orders Service] Order ${result.id} created successfully`);

  // Publish order.created event
  const orderPayload: OrderPayload = {
    orderId: result.id,
    userId,
    customerName,
    customerEmail,
    customerAddress,
    items: items.map((item) => ({
      productId: item.productId,
      variationId: item.variationId,
      quantity: item.quantity,
      price: item.price,
    })),
    totalAmount,
    status: 'PENDING',
  };

  const orderCreatedEvent = {
    eventId: randomUUID(),
    eventType: 'order.created' as const,
    timestamp: new Date().toISOString(),
    version: '1.0' as const,
    source: 'orders-service',
    correlationId,
    payload: orderPayload,
  };

  await publishEvent(
    process.env.QSTASH_ORDERS_URL || '',
    orderCreatedEvent
  );
  console.log(`[Orders Service] Published order.created for order ${result.id}`);

  // Publish email notification request
  const emailPayload: EmailNotificationPayload = {
    to: customerEmail,
    subject: `Order Confirmation - ${result.id}`,
    templateId: 'order-confirmation',
    templateData: {
      orderId: result.id,
      customerName,
      items,
      totalAmount,
    },
    priority: 'high',
  };

  const emailEvent = {
    eventId: randomUUID(),
    eventType: 'notification.email' as const,
    timestamp: new Date().toISOString(),
    version: '1.0' as const,
    source: 'orders-service',
    correlationId,
    payload: emailPayload,
  };

  await publishEvent(
    process.env.QSTASH_EMAIL_URL || '',
    emailEvent
  );
  console.log(`[Orders Service] Requested email notification for order ${result.id}`);

  // Publish audit log
  const auditEvent = {
    eventId: randomUUID(),
    eventType: 'analytics.audit' as const,
    timestamp: new Date().toISOString(),
    version: '1.0' as const,
    source: 'orders-service',
    correlationId,
    payload: {
      action: 'order.created',
      entityType: 'order',
      entityId: result.id,
      userId,
      newState: orderPayload as unknown as Record<string, unknown>,
      metadata: { paymentId, correlationId },
    },
  };

  await publishEvent(
    process.env.QSTASH_ANALYTICS_URL || '',
    auditEvent
  );
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

// GET handler for health check
export async function GET(request: NextRequest) {
  return corsResponse(
    { 
      status: 'healthy', 
      service: 'orders',
      timestamp: new Date().toISOString()
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
      console.error('[Orders Service] Missing QStash signature');
      return corsResponse({ error: 'Missing signature' }, 401, request);
    }

    // Verify QStash signature
    try {
      const isValid = await receiver.verify({
        signature,
        body,
      });

      if (!isValid) {
        console.error('[Orders Service] Invalid QStash signature');
        return corsResponse({ error: 'Invalid signature' }, 401, request);
      }
    } catch (error) {
      console.error('[Orders Service] Signature verification failed:', error);
      return corsResponse({ error: 'Signature verification failed' }, 401, request);
    }

    // Parse event
    const event: AppEvent = JSON.parse(body);
    const eventType = event.eventType;

    console.log(`[Orders Service] Received event: ${eventType}`);

    // Route to appropriate handler
    if (eventType === 'command.checkout') {
      await handleCheckoutCommand(event as CheckoutCommand);
      return corsResponse({ success: true, message: 'Checkout processed' }, 200, request);
    }

    if (eventType.startsWith('order.')) {
      console.log(`[Orders Service] Order event received: ${eventType}`);
      return corsResponse({ success: true, message: 'Order event processed' }, 200, request);
    }

    console.log(`[Orders Service] Unknown event type: ${eventType}`);
    return corsResponse({ success: true, message: 'Event ignored' }, 200, request);
  } catch (error) {
    console.error('[Orders Service] Error processing webhook:', error);
    return corsResponse(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      500,
      request
    );
  }
}
