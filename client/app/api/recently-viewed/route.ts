import { NextRequest } from 'next/server';
import { drizzleDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { apiSuccess, apiError, handleValidationError, handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// UUID regex pattern matching project convention
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Validation schema for POST request
const RecentlyViewedSchema = z.object({
  productId: z.string().regex(UUID_REGEX, 'Invalid product ID'),
});

// Helper: Serialize dates to ISO strings
function serializeRecentlyViewed(item: {
  id: string;
  userId: string;
  productId: string;
  viewedAt: Date;
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
    id: item.id,
    userId: item.userId,
    productId: item.productId,
    viewedAt: item.viewedAt.toISOString(),
    product: {
      id: item.product.id,
      name: item.product.name,
      description: item.product.description,
      price: item.product.price,
      image: item.product.image,
      stock: item.product.stock,
      category: item.product.category,
      createdAt: item.product.createdAt.toISOString(),
      updatedAt: item.product.updatedAt.toISOString(),
    },
  };
}

// GET /api/recently-viewed - Fetch user's recently viewed products
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const items = await drizzleDb.query.recentlyViewed.findMany({
      where: eq(schema.recentlyViewed.userId, session.user.id),
      with: {
        product: true,
      },
      orderBy: [desc(schema.recentlyViewed.viewedAt)],
      limit: 20,
    });

    const serializedItems = items.map(serializeRecentlyViewed);

    return apiSuccess({ items: serializedItems });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/recently-viewed - Add/update a recently viewed product
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const rawBody = await request.json();
    const parseResult = RecentlyViewedSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const { productId } = parseResult.data;

    // Verify product exists
    const product = await drizzleDb.query.products.findFirst({
      where: eq(schema.products.id, productId),
    });

    if (!product) {
      return apiError('Product not found', 404);
    }

    // Check if record already exists for this user+product
    const existingRecord = await drizzleDb.query.recentlyViewed.findFirst({
      where: and(
        eq(schema.recentlyViewed.userId, session.user.id),
        eq(schema.recentlyViewed.productId, productId)
      ),
    });

    if (existingRecord) {
      // Update viewedAt timestamp
      await drizzleDb
        .update(schema.recentlyViewed)
        .set({ viewedAt: new Date() })
        .where(eq(schema.recentlyViewed.id, existingRecord.id));
    } else {
      // Insert new record
      await drizzleDb.insert(schema.recentlyViewed).values({
        userId: session.user.id,
        productId,
        viewedAt: new Date(),
      });
    }

    return apiSuccess({ message: 'Product view recorded' }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
