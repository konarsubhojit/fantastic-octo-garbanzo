CREATE TABLE "Review" (
	"id" text PRIMARY KEY NOT NULL,
	"productId" text NOT NULL,
	"userId" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text NOT NULL,
	"isVerifiedPurchase" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Review_productId_userId_key" UNIQUE("productId","userId")
);
--> statement-breakpoint
CREATE TABLE "WishlistItem" (
	"id" text PRIMARY KEY NOT NULL,
	"wishlistId" text NOT NULL,
	"productId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "WishlistItem_wishlistId_productId_key" UNIQUE("wishlistId","productId")
);
--> statement-breakpoint
CREATE TABLE "Wishlist" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Wishlist_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_wishlistId_Wishlist_id_fk" FOREIGN KEY ("wishlistId") REFERENCES "public"."Wishlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Review_productId_idx" ON "Review" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "Review_userId_idx" ON "Review" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "WishlistItem_wishlistId_idx" ON "WishlistItem" USING btree ("wishlistId");--> statement-breakpoint
CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "Wishlist_userId_idx" ON "Wishlist" USING btree ("userId");