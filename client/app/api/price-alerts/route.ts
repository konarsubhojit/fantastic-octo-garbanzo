import { NextRequest } from 'next/server';
import { drizzleDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { CreatePriceAlertSchema } from '@/lib/validations';
import { apiSuccess, apiError, handleValidationError, handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// Helper: Serialize price alert with product to API response format
function serializePriceAlert(alert: {
  id: string;
  userId: string;
  productId: string;
  targetPrice: number;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    stock: number;
    category: string;
    createdAt: Date;
    updatedAt: Date;
  };
}) {
  return {
    id: alert.id,
    userId: alert.userId,
    productId: alert.productId,
    targetPrice: alert.targetPrice,
    isActive: alert.isActive === 1,
    createdAt: alert.createdAt.toISOString(),
    updatedAt: alert.updatedAt.toISOString(),
    product: {
      id: alert.product.id,
      name: alert.product.name,
      description: alert.product.description,
      price: alert.product.price,
      image: alert.product.image,
      stock: alert.product.stock,
      category: alert.product.category,
      createdAt: alert.product.createdAt.toISOString(),
      updatedAt: alert.product.updatedAt.toISOString(),
    },
  };
}

// GET /api/price-alerts - Get user's active price alerts
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const alerts = await drizzleDb.query.priceAlerts.findMany({
      where: eq(schema.priceAlerts.userId, session.user.id),
      orderBy: [desc(schema.priceAlerts.createdAt)],
      with: {
        product: true,
      },
    });

    const serializedAlerts = alerts.map(serializePriceAlert);

    return apiSuccess({ alerts: serializedAlerts });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/price-alerts - Create new price alert (upsert)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const rawBody = await request.json();
    const parseResult = CreatePriceAlertSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const { productId, targetPrice } = parseResult.data;

    // Verify product exists
    const product = await drizzleDb.query.products.findFirst({
      where: eq(schema.products.id, productId),
    });

    if (!product) {
      return apiError('Product not found', 404);
    }

    // Check if alert already exists for this user/product combination
    const existingAlert = await drizzleDb.query.priceAlerts.findFirst({
      where: and(
        eq(schema.priceAlerts.userId, session.user.id),
        eq(schema.priceAlerts.productId, productId)
      ),
    });

    let alert;

    if (existingAlert) {
      // Update existing alert
      [alert] = await drizzleDb
        .update(schema.priceAlerts)
        .set({
          targetPrice,
          isActive: 1,
          updatedAt: new Date(),
        })
        .where(eq(schema.priceAlerts.id, existingAlert.id))
        .returning();
    } else {
      // Create new alert
      [alert] = await drizzleDb
        .insert(schema.priceAlerts)
        .values({
          userId: session.user.id,
          productId,
          targetPrice,
          updatedAt: new Date(),
        })
        .returning();
    }

    // Fetch alert with product details
    const alertWithProduct = await drizzleDb.query.priceAlerts.findFirst({
      where: eq(schema.priceAlerts.id, alert.id),
      with: {
        product: true,
      },
    });

    if (!alertWithProduct) {
      return apiError('Failed to create price alert', 500);
    }

    return apiSuccess(
      { alert: serializePriceAlert(alertWithProduct) },
      existingAlert ? 200 : 201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
