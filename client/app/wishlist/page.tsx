'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useDispatch, useSelector } from 'react-redux';
import { useCurrency } from '@/contexts/CurrencyContext';
import Header from '@/components/layout/Header';
import WishlistButton from '@/components/ui/WishlistButton';
import {
  fetchWishlist,
  removeFromWishlist,
  selectWishlist,
  selectWishlistLoading,
} from '@/lib/features/wishlist/wishlistSlice';
import { addToCart } from '@/lib/features/cart/cartSlice';
import type { AppDispatch } from '@/lib/store';

export default function WishlistPage() {
  const { data: session, status } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const wishlist = useSelector(selectWishlist);
  const loading = useSelector(selectWishlistLoading);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (session?.user) {
      dispatch(fetchWishlist());
    }
  }, [session, dispatch]);

  const handleAddToCart = async (productId: string) => {
    try {
      await dispatch(addToCart({ productId, quantity: 1 })).unwrap();
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      await dispatch(removeFromWishlist(productId)).unwrap();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  // Loading state
  if (status === 'loading' || (session && loading && !wishlist)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        </main>
      </div>
    );
  }

  // Not authenticated
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="text-center py-16">
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Sign in to view your wishlist
            </h1>
            <p className="text-gray-600 mb-8">
              Create an account or sign in to save your favorite items.
            </p>
            <Link
              href="/auth/signin?callbackUrl=/wishlist"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
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
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Empty wishlist
  if (!wishlist || wishlist.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Wishlist</h1>
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-gray-600 mb-8">
              Browse our products and add your favorites to your wishlist.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Browse Products
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
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
            Home
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-900 font-medium">Wishlist</span>
        </nav>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            My Wishlist{' '}
            <span className="ml-3 text-lg font-normal text-gray-500">
              ({wishlist.items.length} {wishlist.items.length === 1 ? 'item' : 'items'})
            </span>
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.items.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              {/* Product Image */}
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <Link href={`/products/${item.product.id}`}>
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </Link>
                
                {/* Wishlist Button */}
                <div className="absolute top-3 right-3">
                  <WishlistButton productId={item.product.id} size="sm" />
                </div>

                {/* Stock Badge */}
                {item.product.stock === 0 && (
                  <div className="absolute bottom-3 left-3">
                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
                      Out of Stock
                    </span>
                  </div>
                )}
                {item.product.stock > 0 && item.product.stock <= 5 && (
                  <div className="absolute bottom-3 left-3">
                    <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full">
                      Only {item.product.stock} left
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <Link href={`/products/${item.product.id}`}>
                  <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                    {item.product.name}
                  </h3>
                </Link>
                <p className="text-sm text-gray-500 mb-2">{item.product.category}</p>
                <p className="text-lg font-bold text-gray-900 mb-4">
                  {formatPrice(item.product.price)}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddToCart(item.product.id)}
                    disabled={item.product.stock === 0}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      item.product.stock > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {item.product.stock > 0 ? 'Add to Cart' : 'Unavailable'}
                  </button>
                  <button
                    onClick={() => handleRemoveFromWishlist(item.product.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove from wishlist"
                  >
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
