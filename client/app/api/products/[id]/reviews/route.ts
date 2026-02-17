import { NextRequest } from 'next/server';
import { drizzleDb } from '@/lib/db';
import { reviews, orderItems } from '@/lib/schema';
import { apiSuccess, apiError, handleApiError, handleValidationError } from '@/lib/api-utils';
import { auth } from '@/lib/auth';
import { CreateReviewSchema } from '@/lib/validations';
import { eq, and, desc } from 'drizzle-orm';
import { ReviewWithUser, ProductReviewStats } from '@/lib/types';

// GET /api/products/[id]/reviews - Get reviews for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    // Get all reviews for this product with user info
    const productReviews = await drizzleDb.query.reviews.findMany({
      where: eq(reviews.productId, productId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: [desc(reviews.createdAt)],
    });

    // Transform to ReviewWithUser format
    const transformedReviews: ReviewWithUser[] = productReviews.map((review) => ({
      id: review.id,
      productId: review.productId,
      userId: review.userId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase === 1,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      user: {
        id: review.user.id,
        name: review.user.name,
        image: review.user.image,
      },
    }));

    // Calculate stats
    const totalReviews = transformedReviews.length;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    for (const review of transformedReviews) {
      totalRating += review.rating;
      ratingDistribution[review.rating as 1 | 2 | 3 | 4 | 5]++;
    }

    const stats: ProductReviewStats = {
      averageRating: totalReviews > 0 ? totalRating / totalReviews : 0,
      totalReviews,
      ratingDistribution,
    };

    return apiSuccess({
      reviews: transformedReviews,
      stats,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/products/[id]/reviews - Create a review (authenticated)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Authentication required', 401);
    }

    const { id: productId } = await params;
    const userId = session.user.id;

    // Check if user already reviewed this product
    const existingReview = await drizzleDb.query.reviews.findFirst({
      where: and(
        eq(reviews.productId, productId),
        eq(reviews.userId, userId)
      ),
    });

    if (existingReview) {
      return apiError('You have already reviewed this product', 400);
    }

    // Validate input
    const body = await request.json();
    const parseResult = CreateReviewSchema.safeParse(body);
    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const { rating, title, comment } = parseResult.data;

    // Check if user has purchased this product (verified purchase)
    const purchaseCheck = await drizzleDb.query.orderItems.findFirst({
      where: eq(orderItems.productId, productId),
      with: {
        order: {
          columns: {
            userId: true,
            status: true,
          },
        },
      },
    });

    const isVerifiedPurchase = purchaseCheck?.order?.userId === userId &&
      purchaseCheck?.order?.status === 'DELIVERED';

    // Create the review
    const [newReview] = await drizzleDb
      .insert(reviews)
      .values({
        productId,
        userId,
        rating,
        title: title || null,
        comment,
        isVerifiedPurchase: isVerifiedPurchase ? 1 : 0,
        updatedAt: new Date(),
      })
      .returning();

    // Get the user info for response
    const reviewWithUser = await drizzleDb.query.reviews.findFirst({
      where: eq(reviews.id, newReview.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    if (!reviewWithUser) {
      return apiError('Failed to create review', 500);
    }

    const transformedReview: ReviewWithUser = {
      id: reviewWithUser.id,
      productId: reviewWithUser.productId,
      userId: reviewWithUser.userId,
      rating: reviewWithUser.rating,
      title: reviewWithUser.title,
      comment: reviewWithUser.comment,
      isVerifiedPurchase: reviewWithUser.isVerifiedPurchase === 1,
      createdAt: reviewWithUser.createdAt.toISOString(),
      updatedAt: reviewWithUser.updatedAt.toISOString(),
      user: {
        id: reviewWithUser.user.id,
        name: reviewWithUser.user.name,
        image: reviewWithUser.user.image,
      },
    };

    return apiSuccess({ review: transformedReview }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
