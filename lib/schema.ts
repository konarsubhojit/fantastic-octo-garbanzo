import {
  pgTable,
  text,
  integer,
  timestamp,
  doublePrecision,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccountType } from '@auth/core/adapters';

// ─── Enums ───────────────────────────────────────────────

export const userRoleEnum = pgEnum('UserRole', ['CUSTOMER', 'ADMIN']);
export const orderStatusEnum = pgEnum('OrderStatus', [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);
export const discountTypeEnum = pgEnum('DiscountType', ['PERCENTAGE', 'FIXED']);

// ─── Auth Tables (NextAuth compatible) ───────────────────

export const users = pgTable('User', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  role: userRoleEnum('role').default('CUSTOMER').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
});

export const accounts = pgTable(
  'Account',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [
    unique('Account_provider_providerAccountId_key').on(t.provider, t.providerAccountId),
    index('Account_userId_idx').on(t.userId),
  ]
);

export const sessions = pgTable('Session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (t) => [
  index('Session_userId_idx').on(t.userId),
]);

export const verificationTokens = pgTable(
  'VerificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull().unique(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (t) => [
    unique('VerificationToken_identifier_token_key').on(t.identifier, t.token),
  ]
);

// ─── Product Tables ──────────────────────────────────────

export const products = pgTable('Product', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: doublePrecision('price').notNull(),
  image: text('image').notNull(),
  stock: integer('stock').notNull(),
  category: text('category').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index('Product_category_idx').on(t.category),
]);

export const productVariations = pgTable('ProductVariation', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('productId')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  designName: text('designName').notNull(),
  image: text('image'),
  priceModifier: doublePrecision('priceModifier').default(0).notNull(),
  stock: integer('stock').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index('ProductVariation_productId_idx').on(t.productId),
  unique('ProductVariation_productId_name_key').on(t.productId, t.name),
]);

// ─── Order Tables ────────────────────────────────────────

export const orders = pgTable('Order', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').references(() => users.id),
  customerName: text('customerName').notNull(),
  customerEmail: text('customerEmail').notNull(),
  customerAddress: text('customerAddress').notNull(),
  totalAmount: doublePrecision('totalAmount').notNull(),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index('Order_userId_idx').on(t.userId),
]);

export const orderItems = pgTable('OrderItem', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text('orderId')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('productId')
    .notNull()
    .references(() => products.id),
  variationId: text('variationId').references(() => productVariations.id),
  quantity: integer('quantity').notNull(),
  price: doublePrecision('price').notNull(),
}, (t) => [
  index('OrderItem_orderId_idx').on(t.orderId),
  index('OrderItem_productId_idx').on(t.productId),
  index('OrderItem_variationId_idx').on(t.variationId),
]);

// ─── Review Tables ───────────────────────────────────────

export const reviews = pgTable('Review', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('productId')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  title: text('title'),
  comment: text('comment').notNull(),
  isVerifiedPurchase: integer('isVerifiedPurchase').default(0).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index('Review_productId_idx').on(t.productId),
  index('Review_userId_idx').on(t.userId),
  unique('Review_productId_userId_key').on(t.productId, t.userId),
]);

// ─── Cart Tables ─────────────────────────────────────────

export const carts = pgTable('Cart', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').unique().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: text('sessionId').unique(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index('Cart_sessionId_idx').on(t.sessionId),
]);

export const cartItems = pgTable('CartItem', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  cartId: text('cartId')
    .notNull()
    .references(() => carts.id, { onDelete: 'cascade' }),
  productId: text('productId')
    .notNull()
    .references(() => products.id),
  variationId: text('variationId').references(() => productVariations.id),
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  unique('CartItem_cartId_productId_variationId_key').on(t.cartId, t.productId, t.variationId),
  index('CartItem_cartId_idx').on(t.cartId),
  index('CartItem_productId_idx').on(t.productId),
  index('CartItem_variationId_idx').on(t.variationId),
]);

// ─── Relations ───────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  orders: many(orders),
  cart: one(carts),
  reviews: many(reviews),
  wishlist: one(wishlists),
  recentlyViewed: many(recentlyViewed),
  couponUsages: many(couponUsage),
  priceAlerts: many(priceAlerts),
  notificationPreferences: one(notificationPreferences),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  variations: many(productVariations),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
  reviews: many(reviews),
  wishlistItems: many(wishlistItems),
  recentlyViewed: many(recentlyViewed),
  priceAlerts: many(priceAlerts),
}));

export const productVariationsRelations = relations(productVariations, ({ one, many }) => ({
  product: one(products, { fields: [productVariations.productId], references: [products.id] }),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  couponUsages: many(couponUsage),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variation: one(productVariations, { fields: [orderItems.variationId], references: [productVariations.id] }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
  variation: one(productVariations, { fields: [cartItems.variationId], references: [productVariations.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

// ─── Wishlist Tables ─────────────────────────────────────

export const wishlists = pgTable('Wishlist', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index('Wishlist_userId_idx').on(t.userId),
]);

export const wishlistItems = pgTable('WishlistItem', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  wishlistId: text('wishlistId')
    .notNull()
    .references(() => wishlists.id, { onDelete: 'cascade' }),
  productId: text('productId')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  unique('WishlistItem_wishlistId_productId_key').on(t.wishlistId, t.productId),
  index('WishlistItem_wishlistId_idx').on(t.wishlistId),
  index('WishlistItem_productId_idx').on(t.productId),
]);

// ─── Wishlist Relations ──────────────────────────────────

export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
  user: one(users, { fields: [wishlists.userId], references: [users.id] }),
  items: many(wishlistItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  wishlist: one(wishlists, { fields: [wishlistItems.wishlistId], references: [wishlists.id] }),
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));

// ─── Recently Viewed Tables ──────────────────────────────

export const recentlyViewed = pgTable('RecentlyViewed', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId')
    .notNull()
    .references(() => users.id),
  productId: text('productId')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewedAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  unique('RecentlyViewed_userId_productId_key').on(t.userId, t.productId),
  index('RecentlyViewed_userId_idx').on(t.userId),
  index('RecentlyViewed_productId_idx').on(t.productId),
]);

// ─── Coupon Tables ───────────────────────────────────────

export const coupons = pgTable('Coupon', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code').notNull().unique(),
  description: text('description'),
  discountType: discountTypeEnum('discountType').notNull(),
  discountValue: doublePrecision('discountValue').notNull(),
  minOrderAmount: doublePrecision('minOrderAmount').default(0).notNull(),
  maxUses: integer('maxUses'),
  currentUses: integer('currentUses').default(0).notNull(),
  validFrom: timestamp('validFrom', { mode: 'date' }).notNull(),
  validUntil: timestamp('validUntil', { mode: 'date' }).notNull(),
  isActive: integer('isActive').default(1).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index('Coupon_code_idx').on(t.code),
]);

export const couponUsage = pgTable('CouponUsage', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  couponId: text('couponId')
    .notNull()
    .references(() => coupons.id),
  userId: text('userId')
    .notNull()
    .references(() => users.id),
  orderId: text('orderId')
    .notNull()
    .references(() => orders.id),
  usedAt: timestamp('usedAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index('CouponUsage_couponId_idx').on(t.couponId),
  index('CouponUsage_userId_idx').on(t.userId),
  index('CouponUsage_orderId_idx').on(t.orderId),
]);

// ─── Price Alert Tables ──────────────────────────────────

export const priceAlerts = pgTable('PriceAlert', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId')
    .notNull()
    .references(() => users.id),
  productId: text('productId')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  targetPrice: doublePrecision('targetPrice').notNull(),
  isActive: integer('isActive').default(1).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  unique('PriceAlert_userId_productId_key').on(t.userId, t.productId),
  index('PriceAlert_userId_idx').on(t.userId),
  index('PriceAlert_productId_idx').on(t.productId),
]);

// ─── Notification Preferences Tables ─────────────────────

export const notificationPreferences = pgTable('NotificationPreference', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  emailOrderUpdates: integer('emailOrderUpdates').default(1).notNull(),
  emailPromotions: integer('emailPromotions').default(1).notNull(),
  emailPriceAlerts: integer('emailPriceAlerts').default(1).notNull(),
  pushEnabled: integer('pushEnabled').default(0).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index('NotificationPreference_userId_idx').on(t.userId),
]);

// ─── Recently Viewed Relations ───────────────────────────

export const recentlyViewedRelations = relations(recentlyViewed, ({ one }) => ({
  user: one(users, { fields: [recentlyViewed.userId], references: [users.id] }),
  product: one(products, { fields: [recentlyViewed.productId], references: [products.id] }),
}));

// ─── Coupon Relations ────────────────────────────────────

export const couponsRelations = relations(coupons, ({ many }) => ({
  usages: many(couponUsage),
}));

export const couponUsageRelations = relations(couponUsage, ({ one }) => ({
  coupon: one(coupons, { fields: [couponUsage.couponId], references: [coupons.id] }),
  user: one(users, { fields: [couponUsage.userId], references: [users.id] }),
  order: one(orders, { fields: [couponUsage.orderId], references: [orders.id] }),
}));

// ─── Price Alert Relations ───────────────────────────────

export const priceAlertsRelations = relations(priceAlerts, ({ one }) => ({
  user: one(users, { fields: [priceAlerts.userId], references: [users.id] }),
  product: one(products, { fields: [priceAlerts.productId], references: [products.id] }),
}));

// ─── Notification Preferences Relations ──────────────────

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
}));
