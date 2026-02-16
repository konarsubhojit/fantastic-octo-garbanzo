import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { drizzleDb } from '@/lib/db';
import { apiSuccess, apiError, handleApiError, handleValidationError } from '@/lib/api-utils';
import { z } from 'zod';

// Schema for applying a coupon with order total
const ApplyCouponRequestSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  orderTotal: z.number().positive('Order total must be positive'),
});

/**
 * POST /api/coupons/apply
 * Apply a coupon to calculate discount
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const parseResult = ApplyCouponRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return handleValidationError(parseResult.error);
    }

    const { code, orderTotal } = parseResult.data;
    const couponCode = code.toUpperCase();

    // Find the coupon
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

    // Check minimum order amount
    if (orderTotal < coupon.minOrderAmount) {
      return apiError(
        `Order total must be at least $${coupon.minOrderAmount.toFixed(2)} to use this coupon`,
        400
      );
    }

    // Calculate discount based on discount type
    let discountAmount: number;

    if (coupon.discountType === 'PERCENTAGE') {
      // Percentage discount
      discountAmount = (orderTotal * coupon.discountValue) / 100;
    } else {
      // Fixed discount
      discountAmount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed order total
    discountAmount = Math.min(discountAmount, orderTotal);

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    const finalTotal = Math.round((orderTotal - discountAmount) * 100) / 100;

    return apiSuccess({
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      originalTotal: orderTotal,
      discountAmount,
      finalTotal,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
