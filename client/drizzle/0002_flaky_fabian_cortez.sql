CREATE TYPE "public"."DiscountType" AS ENUM('PERCENTAGE', 'FIXED');--> statement-breakpoint
CREATE TABLE "CouponUsage" (
	"id" text PRIMARY KEY NOT NULL,
	"couponId" text NOT NULL,
	"userId" text NOT NULL,
	"orderId" text NOT NULL,
	"usedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Coupon" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"discountType" "DiscountType" NOT NULL,
	"discountValue" double precision NOT NULL,
	"minOrderAmount" double precision DEFAULT 0 NOT NULL,
	"maxUses" integer,
	"currentUses" integer DEFAULT 0 NOT NULL,
	"validFrom" timestamp NOT NULL,
	"validUntil" timestamp NOT NULL,
	"isActive" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Coupon_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "NotificationPreference" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"emailOrderUpdates" integer DEFAULT 1 NOT NULL,
	"emailPromotions" integer DEFAULT 1 NOT NULL,
	"emailPriceAlerts" integer DEFAULT 1 NOT NULL,
	"pushEnabled" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "NotificationPreference_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "PriceAlert" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"productId" text NOT NULL,
	"targetPrice" double precision NOT NULL,
	"isActive" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "PriceAlert_userId_productId_key" UNIQUE("userId","productId")
);
--> statement-breakpoint
CREATE TABLE "RecentlyViewed" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"productId" text NOT NULL,
	"viewedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "RecentlyViewed_userId_productId_key" UNIQUE("userId","productId")
);
--> statement-breakpoint
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_Coupon_id_fk" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "CouponUsage_couponId_idx" ON "CouponUsage" USING btree ("couponId");--> statement-breakpoint
CREATE INDEX "CouponUsage_userId_idx" ON "CouponUsage" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "CouponUsage_orderId_idx" ON "CouponUsage" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "Coupon_code_idx" ON "Coupon" USING btree ("code");--> statement-breakpoint
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "PriceAlert_userId_idx" ON "PriceAlert" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "PriceAlert_productId_idx" ON "PriceAlert" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "RecentlyViewed_userId_idx" ON "RecentlyViewed" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "RecentlyViewed_productId_idx" ON "RecentlyViewed" USING btree ("productId");