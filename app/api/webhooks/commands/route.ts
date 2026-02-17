import { NextRequest, NextResponse } from 'next/server';
import { verifyQStashSignature, getEventMetadata } from '@/lib/qstash-webhook';
import { CheckoutCommand, OrderPayload, EmailNotificationPayload } from '@/services/shared/types';
import { publishOrderCreated, publishEmailNotification, publishStockUpdate, publishAuditLog } from '@/lib/qstash-producer';
import { drizzleDb } from '@/lib/db';
import { orders, orderItems, products, productVariations } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds for webhook processing

/**
 * QStash Webhook: Commands Topic
 * 
 * Handles command events:
 * - command.checkout: Process checkout and create order
 */

async function handleCheckoutCommand(event: CheckoutCommand): Promise<void> {
  const { userId, customerName, customerEmail, customerAddress, items, totalAmount, paymentId } = event.payload;
  const correlationId = event.correlationId || event.eventId;

  console.log(`[Commands Webhook] Processing checkout for user ${userId}, payment ${paymentId}`);

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
      publishStockUpdate(
        {
          productId: item.productId,
          variationId: item.variationId,
          previousStock,
          newStock: previousStock - item.quantity,
          reason: 'sale',
          orderId: newOrder.id,
        },
        correlationId
      ).catch((err) => console.error('[Commands Webhook] Failed to publish stock update:', err));
    }

    return newOrder;
  });

  console.log(`[Commands Webhook] Order ${result.id} created successfully`);

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
  console.log(`[Commands Webhook] Published order.created for order ${result.id}`);

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
  console.log(`[Commands Webhook] Requested email notification for order ${result.id}`);

  // Publish audit log
  await publishAuditLog(
    {
      action: 'order.created',
      entityType: 'order',
      entityId: result.id,
      userId,
      newState: orderPayload as unknown as Record<string, unknown>,
      metadata: { paymentId, correlationId },
    },
    correlationId
  );
}

export async function POST(request: NextRequest) {
  try {
    // Verify QStash signature
    const event = await verifyQStashSignature<CheckoutCommand>(request);
    const metadata = getEventMetadata(request);

    console.log(`[Commands Webhook] Received ${event.eventType} (retry: ${metadata.retryCount})`);

    // Route based on event type
    switch (event.eventType) {
      case 'command.checkout':
        await handleCheckoutCommand(event);
        break;
      default:
        console.warn(`[Commands Webhook] Unknown event type: ${event.eventType}`);
        return NextResponse.json(
          { error: 'Unknown event type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      eventId: event.eventId,
      eventType: event.eventType,
    });
  } catch (error) {
    console.error('[Commands Webhook] Error processing event:', error);
    
    // Return 200 to prevent retries for unrecoverable errors
    if (error instanceof Error && error.message.includes('signature')) {
      return NextResponse.json(
        { error: 'Invalid signature', details: error.message },
        { status: 401 }
      );
    }

    // Return 500 to trigger QStash retry
    return NextResponse.json(
      { error: 'Processing failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
