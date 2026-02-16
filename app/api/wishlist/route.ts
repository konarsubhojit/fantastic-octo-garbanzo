import { NextRequest } from 'next/server';
import { drizzleDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { WishlistItemSchema } from '@/lib/validations';
import { apiSuccess, apiError, handleValidationError, handleApiError } from '@/lib/api-utils';
import type { Wishlist, WishlistItemWithProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Helper: Serialize dates to ISO strings
function serializeWishlist(wishlist: {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    wishlistId: string;
    productId: string;
    createdAt: Date;
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
  }>;
}): Wishlist {
  return {
    id: wishlist.id,
    userId: wishlist.userId,
    createdAt: wishlist.createdAt.toISOString(),
    updatedAt: wishlist.updatedAt.toISOString(),
    items: wishlist.items.map((item): WishlistItemWithProduct => ({
      id: item.id,
      wishlistId: item.wishlistId,
      productId: item.productId,
      createdAt: item.createdAt.toISOString(),
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
    })),
  };
}

// GET /api/wishlist - Get user's wishlist
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const wishlist = await drizzleDb.query.wishlists.findFirst({
      where: eq(schema.wishlists.userId, session.user.id),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    if (!wishlist) {
      // Return empty wishlist if none exists
      return apiSuccess({ wishlist: null });
    }

    return apiSuccess({ wishlist: serializeWishlist(wishlist) });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/wishlist - Add item to wishlist
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const rawBody = await request.json();
    const parseResult = WishlistItemSchema.safeParse(rawBody);

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

    // Get or create wishlist
    let wishlist = await drizzleDb.query.wishlists.findFirst({
      where: eq(schema.wishlists.userId, session.user.id),
    });

    if (!wishlist) {
      [wishlist] = await drizzleDb
        .insert(schema.wishlists)
        .values({
          userId: session.user.id,
          updatedAt: new Date(),
        })
        .returning();
    }

    // Check if item already exists in wishlist
    const existingItem = await drizzleDb.query.wishlistItems.findFirst({
      where: and(
        eq(schema.wishlistItems.wishlistId, wishlist.id),
        eq(schema.wishlistItems.productId, productId)
      ),
    });

    if (existingItem) {
      return apiError('Item already in wishlist', 400);
    }

    // Add item to wishlist
    await drizzleDb.insert(schema.wishlistItems).values({
      wishlistId: wishlist.id,
      productId,
    });

    // Update wishlist timestamp
    await drizzleDb
      .update(schema.wishlists)
      .set({ updatedAt: new Date() })
      .where(eq(schema.wishlists.id, wishlist.id));

    // Fetch updated wishlist
    const updatedWishlist = await drizzleDb.query.wishlists.findFirst({
      where: eq(schema.wishlists.id, wishlist.id),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    return apiSuccess({ wishlist: updatedWishlist ? serializeWishlist(updatedWishlist) : null }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
