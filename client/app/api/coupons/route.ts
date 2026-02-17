import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { drizzleDb } from '@/lib/db';
import { coupons } from '@/lib/schema';
import { desc } from 'drizzle-orm';
import { apiSuccess, apiError, handleApiError, handleValidationError } from '@/lib/api-utils';
import { CreateCouponSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coupons
 * List all coupons (admin only)
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    if (session.user.role !== 'ADMIN') {
      return apiError('Forbidden', 403);
    }

    const allCoupons = await drizzleDb
      .select()
      .from(coupons)
      .orderBy(desc(coupons.createdAt));

    // Serialize dates to ISO strings
    const serializedCoupons = allCoupons.map((coupon) => ({
      ...coupon,
      validFrom: coupon.validFrom.toISOString(),
      validUntil: coupon.validUntil.toISOString(),
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    }));

    return apiSuccess({ coupons: serializedCoupons });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/coupons
 * Create a new coupon (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    if (session.user.role !== 'ADMIN') {
      return apiError('Forbidden', 403);
    }

    const body = await request.json();
    const parseResult = CreateCouponSchema.safeParse(body);

    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const { code, description, discountType, discountValue, minOrderAmount, maxUses, validFrom, validUntil } = parseResult.data;

    // Check if coupon code already exists
    const existing = await drizzleDb.query.coupons.findFirst({
      where: (c, { eq }) => eq(c.code, code.toUpperCase()),
    });

    if (existing) {
      return apiError('Coupon code already exists', 400);
    }

    // Create the coupon
    const [newCoupon] = await drizzleDb
      .insert(coupons)
      .values({
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount ?? 0,
        maxUses,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        isActive: 1,
        currentUses: 0,
        updatedAt: new Date(),
      })
      .returning();

    return apiSuccess({
      coupon: {
        ...newCoupon,
        validFrom: newCoupon.validFrom.toISOString(),
        validUntil: newCoupon.validUntil.toISOString(),
        createdAt: newCoupon.createdAt.toISOString(),
        updatedAt: newCoupon.updatedAt.toISOString(),
      },
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
