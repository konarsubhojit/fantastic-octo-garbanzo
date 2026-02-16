'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import {
  addToWishlist,
  removeFromWishlist,
  selectIsInWishlist,
  fetchWishlist,
} from '@/lib/features/wishlist/wishlistSlice';
import type { AppDispatch, RootState } from '@/lib/store';

interface WishlistButtonProps {
  readonly productId: string;
  readonly className?: string;
  readonly size?: 'sm' | 'md' | 'lg';
}

export default function WishlistButton({
  productId,
  className = '',
  size = 'md',
}: WishlistButtonProps) {
  const { data: session, status } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const isInWishlist = useSelector((state: RootState) =>
    selectIsInWishlist(state, productId)
  );
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fetch wishlist on mount if user is authenticated
  useEffect(() => {
    setMounted(true);
    if (session?.user) {
      dispatch(fetchWishlist());
    }
  }, [session, dispatch]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(globalThis.location.pathname));
      return;
    }

    setLoading(true);

    try {
      if (isInWishlist) {
        await dispatch(removeFromWishlist(productId)).unwrap();
      } else {
        await dispatch(addToWishlist(productId)).unwrap();
      }
    } catch (error) {
      console.error('Wishlist toggle error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-200 ${className}`}
        aria-label="Add to wishlist"
        disabled
      >
        <svg
          className={`${iconSizeClasses[size]} text-gray-400`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleWishlist}
      disabled={loading || status === 'loading'}
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-200 ${
        loading ? 'opacity-50 cursor-wait' : 'hover:scale-110'
      } ${className}`}
      aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={isInWishlist}
    >
      {loading ? (
        <svg
          className={`${iconSizeClasses[size]} animate-spin text-pink-500`}
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          className={`${iconSizeClasses[size]} ${
            isInWishlist ? 'text-pink-500 fill-pink-500' : 'text-gray-500 hover:text-pink-500'
          } transition-colors duration-200`}
          fill={isInWishlist ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      )}
    </button>
  );
}
