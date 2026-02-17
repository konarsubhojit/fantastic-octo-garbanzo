import { NextRequest } from 'next/server';
import { drizzleDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-utils';
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

// DELETE /api/wishlist/[productId] - Remove item from wishlist
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    // Get user's wishlist
    const wishlist = await drizzleDb.query.wishlists.findFirst({
      where: eq(schema.wishlists.userId, session.user.id),
    });

    if (!wishlist) {
      return apiError('Wishlist not found', 404);
    }

    // Find the item to delete
    const wishlistItem = await drizzleDb.query.wishlistItems.findFirst({
      where: and(
        eq(schema.wishlistItems.wishlistId, wishlist.id),
        eq(schema.wishlistItems.productId, productId)
      ),
    });

    if (!wishlistItem) {
      return apiError('Item not found in wishlist', 404);
    }

    // Delete the item
    await drizzleDb
      .delete(schema.wishlistItems)
      .where(eq(schema.wishlistItems.id, wishlistItem.id));

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

    return apiSuccess({ wishlist: updatedWishlist ? serializeWishlist(updatedWishlist) : null });
  } catch (error) {
    return handleApiError(error);
  }
}
