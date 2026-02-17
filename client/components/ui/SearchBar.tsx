'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SearchBarProps {
  readonly placeholder?: string;
  readonly className?: string;
  readonly autoFocus?: boolean;
  readonly debounceMs?: number;
  readonly showInHeader?: boolean;
}

export default function SearchBar({
  placeholder = 'Search products...',
  className = '',
  autoFocus = false,
  debounceMs = 300,
  showInHeader = false,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search navigation
  const debouncedSearch = useCallback(
    (value: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value.trim()) {
          params.set('q', value.trim());
          params.set('page', '1'); // Reset to first page on new search
        } else {
          params.delete('q');
        }
        router.push(`/search?${params.toString()}`);
      }, debounceMs);
    },
    [searchParams, router, debounceMs]
  );

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  // Handle form submit (immediate search)
  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set('q', query.trim());
      params.set('page', '1');
    } else {
      params.delete('q');
    }
    router.push(`/search?${params.toString()}`);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    router.push(`/search?${params.toString()}`);
    inputRef.current?.focus();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Sync query state with URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  // Only sync when searchParams changes externally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Header-specific compact search bar
  if (showInHeader) {
    return (
      <div className="relative">
        {/* Mobile: Icon button that expands */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors"
          aria-label="Search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Desktop: Always visible search bar */}
        <form onSubmit={handleSubmit} className="hidden md:flex items-center">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              placeholder={placeholder}
              className="w-48 lg:w-64 pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Mobile: Expanded search overlay */}
        {isExpanded && (
          <div className="absolute top-full right-0 mt-2 w-72 md:hidden bg-white rounded-lg shadow-xl border border-gray-100 p-3 z-50">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleChange}
                placeholder={placeholder}
                autoFocus
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Full-size search bar for search page
  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm hover:shadow-md transition-shadow"
      />
      <svg
        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          aria-label="Clear search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </form>
  );
}
