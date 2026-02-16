import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { drizzleDb } from '@/lib/db';
import { coupons } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, handleApiError, handleValidationError } from '@/lib/api-utils';
import { UpdateCouponSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ code: string }>;
}

// Helper to check admin authentication
async function checkAdminAuth() {
  const session = await auth();
  if (!session?.user) {
    return { authorized: false, error: apiError('Unauthorized', 401) };
  }
  if (session.user.role !== 'ADMIN') {
    return { authorized: false, error: apiError('Forbidden', 403) };
  }
  return { authorized: true, session };
}

// Helper to find coupon by code
async function findCouponByCode(couponCode: string) {
  return drizzleDb.query.coupons.findFirst({
    where: (c, { eq }) => eq(c.code, couponCode),
  });
}

// Helper to serialize coupon dates
function serializeCoupon(coupon: typeof coupons.$inferSelect) {
  return {
    ...coupon,
    validFrom: coupon.validFrom.toISOString(),
    validUntil: coupon.validUntil.toISOString(),
    createdAt: coupon.createdAt.toISOString(),
    updatedAt: coupon.updatedAt.toISOString(),
  };
}

// Helper to build coupon update values from partial data
function buildUpdateValues(updateData: Partial<{
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount: number;
  maxUses: number;
  validFrom: string;
  validUntil: string;
}>) {
  return {
    updatedAt: new Date(),
    ...(updateData.code && { code: updateData.code.toUpperCase() }),
    ...(updateData.description !== undefined && { description: updateData.description }),
    ...(updateData.discountType && { discountType: updateData.discountType }),
    ...(updateData.discountValue !== undefined && { discountValue: updateData.discountValue }),
    ...(updateData.minOrderAmount !== undefined && { minOrderAmount: updateData.minOrderAmount }),
    ...(updateData.maxUses !== undefined && { maxUses: updateData.maxUses }),
    ...(updateData.validFrom && { validFrom: new Date(updateData.validFrom) }),
    ...(updateData.validUntil && { validUntil: new Date(updateData.validUntil) }),
  };
}

/**
 * GET /api/coupons/[code]
 * Validate a coupon code for checkout (any authenticated user)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const { code } = await params;
    const couponCode = code.toUpperCase();

    const coupon = await drizzleDb.query.coupons.findFirst({
      where: (c, { eq }) => eq(c.code, couponCode),
    });

    if (!coupon) {
      return apiError('Coupon not found', 404);
    }

    // Check if coupon is active
    if (coupon.isActive !== 1) {
      return apiError('Coupon is not active', 400);
    }

    // Check if coupon is within valid dates
    const now = new Date();
    if (now < coupon.validFrom) {
      return apiError('Coupon is not yet valid', 400);
    }

    if (now > coupon.validUntil) {
      return apiError('Coupon has expired', 400);
    }

    // Check if coupon has not exceeded maxUses
    if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
      return apiError('Coupon usage limit has been reached', 400);
    }

    // Coupon is valid
    return apiSuccess({
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        validFrom: coupon.validFrom.toISOString(),
        validUntil: coupon.validUntil.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/coupons/[code]
 * Update a coupon (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.authorized) return authResult.error;

    const { code } = await params;
    const couponCode = code.toUpperCase();

    const body = await request.json();
    const parseResult = UpdateCouponSchema.safeParse(body);
    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const existing = await findCouponByCode(couponCode);
    if (!existing) {
      return apiError('Coupon not found', 404);
    }

    const updateData = parseResult.data;

    // Check code uniqueness if changing
    if (updateData.code) {
      const newCode = updateData.code.toUpperCase();
      if (newCode !== couponCode && await findCouponByCode(newCode)) {
        return apiError('Coupon code already exists', 400);
      }
    }

    const [updatedCoupon] = await drizzleDb
      .update(coupons)
      .set(buildUpdateValues(updateData))
      .where(eq(coupons.code, couponCode))
      .returning();

    return apiSuccess({ coupon: serializeCoupon(updatedCoupon) });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/coupons/[code]
 * Delete a coupon (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.authorized) return authResult.error;

    const { code } = await params;
    const couponCode = code.toUpperCase();

    const existing = await findCouponByCode(couponCode);
    if (!existing) {
      return apiError('Coupon not found', 404);
    }

    await drizzleDb
      .delete(coupons)
      .where(eq(coupons.code, couponCode));

    return apiSuccess({ message: 'Coupon deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
