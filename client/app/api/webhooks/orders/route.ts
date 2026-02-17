import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { publishOrderCreated, publishEmailNotification, publishStockUpdate, publishAuditLog } from '@/services/shared/producer';
import { CheckoutCommand, OrderPayload, EmailNotificationPayload, AppEvent } from '@/services/shared/types';
import { drizzleDb } from '@/lib/db';
import { orders, orderItems, products, productVariations } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';

// Initialize QStash receiver for signature verification
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

// ─── Order Processing ──────────────────────────────────────

async function handleCheckoutCommand(event: CheckoutCommand): Promise<void> {
  const { userId, customerName, customerEmail, customerAddress, items, totalAmount, paymentId } = event.payload;
  const correlationId = event.correlationId || event.eventId;

  console.log(`[Orders Webhook] Processing checkout for user ${userId}, payment ${paymentId}`);

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
      // Get current stock for audit
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

      // Publish stock update event (fire and forget within transaction)
      publishStockUpdate({
        productId: item.productId,
        variationId: item.variationId,
        previousStock,
        newStock: previousStock - item.quantity,
        reason: 'sale',
        orderId: newOrder.id,
      }, correlationId).catch((err) => console.error('[Orders Webhook] Failed to publish stock update:', err));
    }

    return newOrder;
  });

  console.log(`[Orders Webhook] Order ${result.id} created successfully`);

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

  await publishOrderCreated(orderPayload, correlationId);
  console.log(`[Orders Webhook] Published order.created for order ${result.id}`);

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

  await publishEmailNotification(emailPayload, correlationId);
  console.log(`[Orders Webhook] Requested email notification for order ${result.id}`);

  // Publish audit log
  await publishAuditLog({
    action: 'order.created',
    entityType: 'order',
    entityId: result.id,
    userId,
    newState: orderPayload as unknown as Record<string, unknown>,
    metadata: { paymentId, correlationId },
  }, correlationId);
}

// ─── Webhook Handler ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Get request body and signature
    const body = await request.text();
    const signature = request.headers.get('upstash-signature');

    if (!signature) {
      console.error('[Orders Webhook] Missing QStash signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify QStash signature
    try {
      const isValid = await receiver.verify({
        signature,
        body,
      });

      if (!isValid) {
        console.error('[Orders Webhook] Invalid QStash signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch (error) {
      console.error('[Orders Webhook] Signature verification failed:', error);
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    // Parse event
    const event: AppEvent = JSON.parse(body);
    const eventType = event.eventType;

    console.log(`[Orders Webhook] Received event: ${eventType}`);

    // Route to appropriate handler
    if (eventType === 'command.checkout') {
      await handleCheckoutCommand(event as CheckoutCommand);
      return NextResponse.json({ success: true, message: 'Checkout processed' });
    }

    if (eventType.startsWith('order.')) {
      // Handle other order events if needed
      console.log(`[Orders Webhook] Order event received: ${eventType}`);
      return NextResponse.json({ success: true, message: 'Order event processed' });
    }

    console.log(`[Orders Webhook] Unknown event type: ${eventType}`);
    return NextResponse.json({ success: true, message: 'Event ignored' });
  } catch (error) {
    console.error('[Orders Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
