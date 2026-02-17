'use client';

interface WishlistErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function WishlistError({ error, reset }: WishlistErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="text-center p-8 max-w-md">
        <svg
          className="w-16 h-16 text-red-500 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'An error occurred while loading your wishlist.'}
        </p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
