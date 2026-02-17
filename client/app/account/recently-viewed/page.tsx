import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/auth';
import { drizzleDb } from '@/lib/db';
import { recentlyViewed, products } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import Header from '@/components/layout/Header';

// Helper to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
  return date.toLocaleDateString();
}

// Format price in USD (can be converted by CurrencyContext on client)
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

export default async function RecentlyViewedPage() {
  const session = await auth();

  // Not authenticated - show sign in prompt
  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-12 text-center">
            <svg
              className="w-24 h-24 text-gray-400 mx-auto mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Sign in to see your recently viewed products
            </h1>
            <p className="text-gray-600 mb-8">
              Create an account or sign in to keep track of products you&apos;ve viewed.
            </p>
            <Link
              href="/auth/signin?callbackUrl=/account/recently-viewed"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Sign In
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Fetch recently viewed products directly from database
  const viewed = await drizzleDb
    .select({
      id: recentlyViewed.id,
      viewedAt: recentlyViewed.viewedAt,
      product: products,
    })
    .from(recentlyViewed)
    .innerJoin(products, eq(recentlyViewed.productId, products.id))
    .where(eq(recentlyViewed.userId, session.user.id))
    .orderBy(desc(recentlyViewed.viewedAt))
    .limit(20);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Recently Viewed
        </h1>

        {viewed.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-12 text-center">
            <svg
              className="w-20 h-20 mx-auto mb-6 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              No recently viewed products
            </h2>
            <p className="text-gray-500 mb-6">
              Start browsing and your viewed products will appear here.
            </p>
            <Link
              href="/"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {viewed.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.product.id}`}
                className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-100 group hover:shadow-2xl hover:scale-105 hover:-translate-y-1 hover:border-blue-200 transition-all duration-300"
              >
                <div className="relative h-48 w-full">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <div className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                    {item.product.name}
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mb-2">
                    {formatPrice(item.product.price)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {formatRelativeTime(item.viewedAt)}
                    </span>
                    <span className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full px-3 py-1 text-xs font-semibold">
                      {item.product.category}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
