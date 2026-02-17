'use client';

import Image from 'next/image';
import { ReviewWithUser } from '@/lib/types';
import StarRating from './StarRating';
import { useSession } from 'next-auth/react';

interface ReviewCardProps {
  readonly review: ReviewWithUser;
  readonly onDelete?: (reviewId: string) => void;
  readonly isDeleting?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}

export default function ReviewCard({ review, onDelete, isDeleting }: ReviewCardProps) {
  const { data: session } = useSession();
  const isOwnReview = session?.user?.id === review.userId;
  const isAdmin = session?.user?.role === 'ADMIN';
  const canDelete = isOwnReview || isAdmin;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0">
            {review.user.image ? (
              <Image
                src={review.user.image}
                alt={review.user.name || 'User'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                {review.user.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          
          {/* User Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                {review.user.name || 'Anonymous'}
              </span>
              {review.isVerifiedPurchase && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified Purchase
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-xs text-gray-500">
                {formatRelativeTime(review.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Delete Button */}
        {canDelete && onDelete && (
          <button
            onClick={() => onDelete(review.id)}
            disabled={isDeleting}
            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Delete review"
          >
            {isDeleting ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Review Content */}
      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
      )}
      <p className="text-gray-700 leading-relaxed">{review.comment}</p>
    </div>
  );
}
