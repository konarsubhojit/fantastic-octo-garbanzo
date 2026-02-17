import { NextRequest } from 'next/server';
import { drizzleDb } from '@/lib/db';
import { reviews } from '@/lib/schema';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-utils';
import { auth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// DELETE /api/reviews/[id] - Delete own review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Authentication required', 401);
    }

    const { id: reviewId } = await params;
    const userId = session.user.id;

    // Check if review exists and belongs to user
    const existingReview = await drizzleDb.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!existingReview) {
      return apiError('Review not found', 404);
    }

    // Allow deletion if user owns the review or is admin
    const isAdmin = session.user.role === 'ADMIN';
    if (existingReview.userId !== userId && !isAdmin) {
      return apiError('You can only delete your own reviews', 403);
    }

    // Delete the review
    const deleted = await drizzleDb
      .delete(reviews)
      .where(
        isAdmin
          ? eq(reviews.id, reviewId)
          : and(eq(reviews.id, reviewId), eq(reviews.userId, userId))
      )
      .returning({ id: reviews.id });

    if (deleted.length === 0) {
      return apiError('Failed to delete review', 500);
    }

    return apiSuccess({ message: 'Review deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
