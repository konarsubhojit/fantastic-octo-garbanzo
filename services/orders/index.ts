import { createConsumer } from '../shared/consumer';
import { publishEvent } from '../shared/producer';
import { ensureTopicsExist } from '../shared/admin';
import { TOPICS } from '../shared/kafka';
import { PaymentSuccessEvent, OrderCreatedEvent } from '../shared/types';
import { drizzleDb } from '../../lib/db';
import { orders, orderItems, products, productVariations } from '../../lib/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

async function handlePaymentSuccess(event: PaymentSuccessEvent): Promise<void> {
  console.log(`[Orders Service] Processing payment ${event.payload.paymentId} for user ${event.payload.userId}`);

  const { userId, customerName, customerEmail, customerAddress, items, totalAmount } = event.payload;

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
    }

    return newOrder;
  });

  console.log(`[Orders Service] Order ${result.id} created successfully`);

  // Publish order.created event
  const orderCreatedEvent: OrderCreatedEvent = {
    eventId: randomUUID(),
    eventType: 'order.created',
    timestamp: new Date().toISOString(),
    payload: {
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
    },
  };

  await publishEvent(TOPICS.ORDER_EVENTS, orderCreatedEvent, result.id);
  console.log(`[Orders Service] Published order.created for order ${result.id}`);
}

async function start(): Promise<void> {
  console.log('[Orders Service] Starting...');
  await ensureTopicsExist();

  await createConsumer({
    groupId: 'orders-service',
    topics: [TOPICS.PAYMENT_EVENTS],
    handler: async ({ message }) => {
      if (!message.value) return;

      const event = JSON.parse(message.value.toString()) as PaymentSuccessEvent;

      if (event.eventType === 'payment.success') {
        await handlePaymentSuccess(event);
      }
    },
  });

  console.log('[Orders Service] Running and consuming payment-events');
}

try {
  await start();
} catch (err) {
  console.error('[Orders Service] Fatal error:', err);
  process.exit(1);
}
