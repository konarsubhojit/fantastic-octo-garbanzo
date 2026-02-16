import { z } from 'zod';

// UUID regex pattern for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// URL regex pattern for validation  
const URL_REGEX = /^https?:\/\/.+/;
// ISO datetime regex pattern
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
// Email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Product validation schemas
// Note: ProductSchema with datetime strings is for API responses (already converted from Date)
// Use ProductInputSchema for validating user input
export const ProductSchema = z.object({
  id: z.string().regex(UUID_REGEX, 'Invalid UUID format'),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().min(1, 'Description is required').max(2000),
  price: z.number().positive('Price must be positive'),
  image: z.string().regex(URL_REGEX, 'Must be a valid URL'),
  stock: z.number().int().nonnegative('Stock must be non-negative'),
  category: z.string().min(1, 'Category is required').max(100),
  createdAt: z.string().regex(ISO_DATETIME_REGEX, 'Invalid datetime format'), // ISO string after conversion from Drizzle Date
  updatedAt: z.string().regex(ISO_DATETIME_REGEX, 'Invalid datetime format'), // ISO string after conversion from Drizzle Date
});

export const ProductInputSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const ProductUpdateSchema = ProductInputSchema.partial();

// Order validation schemas
export const OrderStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

export const OrderItemSchema = z.object({
  productId: z.string().regex(UUID_REGEX, 'Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
});

export const CreateOrderSchema = z.object({
  customerName: z.string().min(1, 'Name is required').max(200),
  customerEmail: z.string().regex(EMAIL_REGEX, 'Invalid email address'),
  customerAddress: z.string().min(10, 'Address must be at least 10 characters').max(500),
  items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
});

export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusEnum,
});

// API Response types with validation
export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    success: z.literal(true),
  });

export const ApiErrorSchema = z.object({
  error: z.string(),
  success: z.literal(false),
  details: z.record(z.string(), z.string()).optional(),
});

// Infer types from schemas
export type ProductInput = z.infer<typeof ProductInputSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type OrderStatusType = z.infer<typeof OrderStatusEnum>;

// Utility type for async function results
export type AsyncResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Generic paginated response type
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Type-safe environment variables
export const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  KAFKA_BROKERS: z.string().optional(),
  KAFKA_CLIENT_ID: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

// Cart validation schemas
export const AddToCartSchema = z.object({
  productId: z.string().regex(UUID_REGEX, 'Invalid product ID'),
  variationId: z.string().regex(UUID_REGEX, 'Invalid variation ID').optional(),
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive'),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive'),
});

// Review validation schemas
export const CreateReviewSchema = z.object({
  rating: z.number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  title: z.string().max(200, 'Title must be at most 200 characters').optional(),
  comment: z.string()
    .min(10, 'Comment must be at least 10 characters')
    .max(2000, 'Comment must be at most 2000 characters'),
});

export type AddToCartInput = z.infer<typeof AddToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

// Product search and filter schema
export const ProductSearchSchema = z.object({
  q: z.string().max(200, 'Search query too long').optional(),
  category: z.string().max(100).optional(),
  minPrice: z.coerce.number().nonnegative('Min price must be non-negative').optional(),
  maxPrice: z.coerce.number().positive('Max price must be positive').optional(),
  inStock: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
  sortBy: z.enum(['price', 'name', 'createdAt']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(12),
}).refine(
  (data) => {
    if (data.minPrice !== undefined && data.maxPrice !== undefined) {
      return data.minPrice <= data.maxPrice;
    }
    return true;
  },
  { message: 'Min price must be less than or equal to max price', path: ['minPrice'] }
);

export type ProductSearchInput = z.infer<typeof ProductSearchSchema>;

// Wishlist validation schemas
export const WishlistItemSchema = z.object({
  productId: z.string().regex(UUID_REGEX, 'Invalid product ID'),
});

export type WishlistItemInput = z.infer<typeof WishlistItemSchema>;

// Price alert validation schemas
export const CreatePriceAlertSchema = z.object({
  productId: z.string().regex(UUID_REGEX, 'Invalid product ID'),
  targetPrice: z.number().positive('Target price must be positive'),
});

export const UpdatePriceAlertSchema = z.object({
  targetPrice: z.number().positive('Target price must be positive').optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => data.targetPrice !== undefined || data.isActive !== undefined,
  { message: 'At least one field (targetPrice or isActive) is required' }
);

export type CreatePriceAlertInput = z.infer<typeof CreatePriceAlertSchema>;
export type UpdatePriceAlertInput = z.infer<typeof UpdatePriceAlertSchema>;

// Coupon validation schemas
export const DiscountTypeEnum = z.enum(['PERCENTAGE', 'FIXED']);

export const CreateCouponSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters').max(50, 'Code must be at most 50 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  discountType: DiscountTypeEnum,
  discountValue: z.number().positive('Discount value must be positive'),
  minOrderAmount: z.number().nonnegative('Minimum order amount must be non-negative').optional().default(0),
  maxUses: z.number().int().positive('Max uses must be positive').optional(),
  validFrom: z.string().regex(ISO_DATETIME_REGEX, 'Invalid datetime format'),
  validUntil: z.string().regex(ISO_DATETIME_REGEX, 'Invalid datetime format'),
});

export const UpdateCouponSchema = CreateCouponSchema.partial().omit({ code: true }).extend({
  code: z.string().min(3, 'Code must be at least 3 characters').max(50, 'Code must be at most 50 characters').optional(),
});

export const ApplyCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
});

export type CreateCouponInput = z.infer<typeof CreateCouponSchema>;
export type UpdateCouponInput = z.infer<typeof UpdateCouponSchema>;
export type ApplyCouponInput = z.infer<typeof ApplyCouponSchema>;

// Notification Preferences validation schema
export const UpdateNotificationPreferencesSchema = z.object({
  emailOrderUpdates: z.boolean().optional(),
  emailPromotions: z.boolean().optional(),
  emailPriceAlerts: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof UpdateNotificationPreferencesSchema>;

// Recently Viewed validation schema
export const RecentlyViewedSchema = z.object({
  productId: z.string().regex(UUID_REGEX, 'Invalid product ID'),
});

export type RecentlyViewedInput = z.infer<typeof RecentlyViewedSchema>;
