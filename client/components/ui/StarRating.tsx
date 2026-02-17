'use client';

import { useState } from 'react';

interface StarRatingProps {
  readonly rating: number;
  readonly maxRating?: number;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly interactive?: boolean;
  readonly onChange?: (rating: number) => void;
  readonly showValue?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export default function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onChange,
  showValue = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;
  const sizeClass = sizeClasses[size];

  const handleClick = (starIndex: number) => {
    if (interactive && onChange) {
      onChange(starIndex);
    }
  };

  const handleMouseEnter = (starIndex: number) => {
    if (interactive) {
      setHoverRating(starIndex);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {Array.from({ length: maxRating }, (_, index) => {
          const starIndex = index + 1;
          const isFilled = starIndex <= displayRating;
          const isHalfFilled = !isFilled && starIndex - 0.5 <= displayRating;

          return (
            <button
              key={starIndex}
              type="button"
              onClick={() => handleClick(starIndex)}
              onMouseEnter={() => handleMouseEnter(starIndex)}
              onMouseLeave={handleMouseLeave}
              disabled={!interactive}
              className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} disabled:cursor-default focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 rounded`}
              aria-label={interactive ? `Rate ${starIndex} stars` : `${starIndex} stars`}
            >
              <svg
                className={`${sizeClass} ${isFilled || isHalfFilled ? 'text-yellow-400' : 'text-gray-300'} transition-colors`}
                fill={(() => {
                  if (isFilled) return 'currentColor';
                  if (isHalfFilled) return 'url(#half)';
                  return 'none';
                })()}
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {isHalfFilled && (
                  <defs>
                    <linearGradient id="half">
                      <stop offset="50%" stopColor="currentColor" />
                      <stop offset="50%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                )}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="ml-1 text-sm text-gray-600 font-medium">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
