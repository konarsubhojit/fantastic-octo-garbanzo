import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { drizzleDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { withLogging } from '@/lib/api-middleware';
import { logBusinessEvent, logError } from '@/lib/logger';
import { publishCheckoutCommand } from '@/services/shared/producer';
import type { CheckoutCommandPayload } from '@/services/shared/types';

export const dynamic = 'force-dynamic';

// ─── Types ───────────────────────────────────────────────

interface CheckoutItem {
  productId: string;
  variationId?: string;
  quantity: number;
  price: number;
}

interface CheckoutBody {
  customerAddress: string;
  items: CheckoutItem[];
}

type ProductWithVariations = Awaited<ReturnType<typeof drizzleDb.query.products.findMany>>[number] & {
  variations: Array<{ id: string; priceModifier: number; stock: number }>;
};

// ─── Validation Helpers ──────────────────────────────────

type StockCheckResult =
  | { valid: true; totalAmount: number; validatedItems: Array<{ productId: string; variationId?: string; quantity: number; price: number }> }
  | { valid: false; error: string; status: number; reason: string; details?: Record<string, unknown> };

function checkStockForItem(
  item: CheckoutItem,
  product: ProductWithVariations
): { valid: true; price: number } | { valid: false; error: string; status: number; reason: string; details?: Record<string, unknown> } {
  let price = product.price;
  let stockToCheck = product.stock;

  if (item.variationId) {
    const variation = product.variations.find((v) => v.id === item.variationId);
    if (!variation) {
      return { valid: false, error: `Variation not found for ${product.name}`, status: 404, reason: 'variation_not_found' };
    }
    price = product.price + variation.priceModifier;
    stockToCheck = variation.stock;
  }

  if (stockToCheck < item.quantity) {
    return {
      valid: false,
      error: `Insufficient stock for ${product.name}`,
      status: 400,
      reason: 'insufficient_stock',
      details: { productId: product.id, productName: product.name, requested: item.quantity, available: stockToCheck },
    };
  }

  return { valid: true, price };
}

function validateStockAndCalculateTotal(
  items: CheckoutItem[],
  products: ProductWithVariations[]
): StockCheckResult {
  let totalAmount = 0;
  const validatedItems: StockCheckResult extends { valid: true } ? StockCheckResult['validatedItems'] : Array<{ productId: string; variationId?: string; quantity: number; price: number }> = [];

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return { valid: false, error: `Product ${item.productId} not found`, status: 404, reason: 'product_not_found' };
    }

    const result = checkStockForItem(item, product);
    if (!result.valid) {
      return result;
    }

    const lineTotal = result.price * item.quantity;
    totalAmount += lineTotal;
    validatedItems.push({
      productId: item.productId,
      variationId: item.variationId,
      quantity: item.quantity,
      price: result.price,
    });
  }

  return { valid: true, totalAmount, validatedItems };
}

// ─── Mock Payment Processing ─────────────────────────────

// TODO: Replace with real payment gateway integration (e.g., Stripe, Razorpay)
async function processPayment(
  _totalAmount: number,
  _customerEmail: string
): Promise<{ success: true; paymentId: string } | { success: false; error: string }> {
  // Simulate payment processing delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const paymentId = `pay_${randomUUID()}`;
  return { success: true, paymentId };
}

// ─── Cart Clearing ───────────────────────────────────────

async function clearUserCart(userId: string): Promise<void> {
  const cart = await drizzleDb.query.carts.findFirst({
    where: eq(schema.carts.userId, userId),
  });

  if (cart) {
    await drizzleDb.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id));
  }
}

// ─── POST Handler ────────────────────────────────────────

async function handlePost(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const session = await auth();
    if (!session?.user?.id) {
      logBusinessEvent({ event: 'checkout_failed', details: { reason: 'not_authenticated' }, success: false });
      return apiError('Authentication required. Please sign in to checkout.', 401);
    }

    const userId = session.user.id;
    const customerName = session.user.name || 'Unknown';
    const customerEmail = session.user.email;

    if (!customerEmail) {
      logBusinessEvent({ event: 'checkout_failed', details: { reason: 'missing_email' }, success: false });
      return apiError('Email address is required. Please update your profile.', 400);
    }

    // 2. Parse and validate the request body
    const body: CheckoutBody = await request.json();

    if (!body.customerAddress || body.customerAddress.trim().length === 0) {
      logBusinessEvent({ event: 'checkout_failed', details: { reason: 'missing_address' }, success: false });
      return apiError('Shipping address is required', 400);
    }

    if (!body.items || body.items.length === 0) {
      logBusinessEvent({ event: 'checkout_failed', details: { reason: 'missing_items' }, success: false });
      return apiError('Checkout must contain at least one item', 400);
    }

    // 3. Fetch products with variations and validate stock
    const productIds = body.items.map((item) => item.productId);
    const products = await drizzleDb.query.products.findMany({
      where: inArray(schema.products.id, productIds),
      with: { variations: true },
    }) as ProductWithVariations[];

    if (products.length !== new Set(productIds).size) {
      logBusinessEvent({
        event: 'checkout_failed',
        details: { reason: 'products_not_found', requestedCount: body.items.length, foundCount: products.length },
        success: false,
      });
      return apiError('Some products not found', 404);
    }

    const stockResult = validateStockAndCalculateTotal(body.items, products);
    if (!stockResult.valid) {
      logBusinessEvent({
        event: 'checkout_failed',
        details: { reason: stockResult.reason, ...stockResult.details },
        success: false,
      });
      return apiError(stockResult.error, stockResult.status);
    }

    const { totalAmount, validatedItems } = stockResult;

    // 4. Process payment (mock)
    const paymentResult = await processPayment(totalAmount, customerEmail);
    if (!paymentResult.success) {
      logBusinessEvent({
        event: 'checkout_failed',
        details: { reason: 'payment_failed', error: paymentResult.error },
        success: false,
      });
      return apiError(`Payment failed: ${paymentResult.error}`, 402);
    }

    const { paymentId } = paymentResult;

    // 5. Publish checkout command to Kafka (new 5-topic architecture)
    const checkoutPayload: CheckoutCommandPayload = {
      userId,
      customerName,
      customerEmail,
      customerAddress: body.customerAddress,
      items: validatedItems,
      totalAmount,
      paymentId,
    };

    await publishCheckoutCommand(checkoutPayload, paymentId);

    logBusinessEvent({
      event: 'checkout_success',
      details: {
        paymentId,
        totalAmount,
        itemCount: validatedItems.length,
        customerEmail,
      },
      success: true,
    });

    // 6. Clear the user's cart after successful payment
    await clearUserCart(userId);

    // 7. Return success response
    return apiSuccess(
      {
        paymentId,
        message: 'Payment processed successfully. Your order is being created.',
      },
      201
    );
  } catch (error) {
    logError({
      error,
      context: 'checkout',
      additionalInfo: {
        path: request.nextUrl.pathname,
      },
    });
    return apiError('Checkout failed. Please try again.', 500);
  }
}

export const POST = withLogging(handlePost);
