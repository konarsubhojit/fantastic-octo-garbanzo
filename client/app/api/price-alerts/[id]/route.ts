import { NextRequest } from 'next/server';
import { drizzleDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { UpdatePriceAlertSchema } from '@/lib/validations';
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

// PATCH /api/price-alerts/[id] - Update price alert
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const rawBody = await request.json();
    const parseResult = UpdatePriceAlertSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const { targetPrice, isActive } = parseResult.data;

    // Find the alert and verify ownership
    const existingAlert = await drizzleDb.query.priceAlerts.findFirst({
      where: and(
        eq(schema.priceAlerts.id, id),
        eq(schema.priceAlerts.userId, session.user.id)
      ),
    });

    if (!existingAlert) {
      return apiError('Price alert not found', 404);
    }

    // Build update object
    const updateData: { targetPrice?: number; isActive?: number; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (targetPrice !== undefined) {
      updateData.targetPrice = targetPrice;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive ? 1 : 0;
    }

    // Update the alert
    await drizzleDb
      .update(schema.priceAlerts)
      .set(updateData)
      .where(eq(schema.priceAlerts.id, id));

    // Fetch updated alert with product details
    const updatedAlert = await drizzleDb.query.priceAlerts.findFirst({
      where: eq(schema.priceAlerts.id, id),
      with: {
        product: true,
      },
    });

    if (!updatedAlert) {
      return apiError('Failed to update price alert', 500);
    }

    return apiSuccess({ alert: serializePriceAlert(updatedAlert) });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/price-alerts/[id] - Delete price alert
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    // Find the alert and verify ownership
    const existingAlert = await drizzleDb.query.priceAlerts.findFirst({
      where: and(
        eq(schema.priceAlerts.id, id),
        eq(schema.priceAlerts.userId, session.user.id)
      ),
    });

    if (!existingAlert) {
      return apiError('Price alert not found', 404);
    }

    // Delete the alert
    await drizzleDb
      .delete(schema.priceAlerts)
      .where(eq(schema.priceAlerts.id, id));

    return apiSuccess({ message: 'Price alert deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
