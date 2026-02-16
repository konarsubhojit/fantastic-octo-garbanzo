import { createTypedConsumer, gracefulShutdown } from '../shared/consumer';
import { publishOrderCreated, publishEmailNotification, publishStockUpdate, publishAuditLog } from '../shared/producer';
import { ensureTopicsExist } from '../shared/admin';
import { TOPICS } from '../shared/kafka';
import { CheckoutCommand, OrderPayload, EmailNotificationPayload } from '../shared/types';
import { drizzleDb } from '../../lib/db';
import { orders, orderItems, products, productVariations } from '../../lib/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { Consumer } from 'kafkajs';

// ─── Order Processing ──────────────────────────────────────

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
      }, correlationId).catch((err) => console.error('[Orders Service] Failed to publish stock update:', err));
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

  await publishOrderCreated(orderPayload, correlationId);
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

  await publishEmailNotification(emailPayload, correlationId);
  console.log(`[Orders Service] Requested email notification for order ${result.id}`);

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

// ─── Service Lifecycle ─────────────────────────────────────

let consumer: Consumer | null = null;

async function start(): Promise<void> {
  console.log('[Orders Service] Starting...');
  console.log('[Orders Service] Architecture: 5-topic optimized design');
  
  await ensureTopicsExist();

  // Subscribe to COMMANDS topic, filter for checkout commands
  consumer = await createTypedConsumer<CheckoutCommand>({
    groupId: 'orders-service',
    topics: [TOPICS.COMMANDS],
    eventTypes: ['command.checkout'],
    handler: async (event) => {
      await handleCheckoutCommand(event);
    },
    enableDLQ: true,
    maxRetries: 3,
  });

  console.log('[Orders Service] Running - consuming from ecom.commands (checkout commands)');
}

// ─── Graceful Shutdown ─────────────────────────────────────

async function shutdown(): Promise<void> {
  console.log('[Orders Service] Shutting down...');
  if (consumer) {
    await gracefulShutdown(consumer);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ─── Entry Point ───────────────────────────────────────────

try {
  await start();
} catch (err) {
  console.error('[Orders Service] Fatal error:', err);
  process.exit(1);
}
