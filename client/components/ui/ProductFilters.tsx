'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ProductFiltersProps {
  readonly categories: string[];
  readonly className?: string;
}

interface FilterState {
  category: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sortBy: string;
  order: string;
}

export default function ProductFilters({ categories, className = '' }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Initialize filter state from URL params
  const [filters, setFilters] = useState<FilterState>({
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    inStock: searchParams.get('inStock') === 'true',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    order: searchParams.get('order') || 'desc',
  });

  // Sync filters with URL params when they change externally
  useEffect(() => {
    setFilters({
      category: searchParams.get('category') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      inStock: searchParams.get('inStock') === 'true',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      order: searchParams.get('order') || 'desc',
    });
  }, [searchParams]);

  // Apply filters to URL
  const applyFilters = useCallback(
    (newFilters: FilterState) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());

        // Preserve search query
        const q = searchParams.get('q');
        if (q) params.set('q', q);

        // Apply filter params
        if (newFilters.category) {
          params.set('category', newFilters.category);
        } else {
          params.delete('category');
        }

        if (newFilters.minPrice) {
          params.set('minPrice', newFilters.minPrice);
        } else {
          params.delete('minPrice');
        }

        if (newFilters.maxPrice) {
          params.set('maxPrice', newFilters.maxPrice);
        } else {
          params.delete('maxPrice');
        }

        if (newFilters.inStock) {
          params.set('inStock', 'true');
        } else {
          params.delete('inStock');
        }

        if (newFilters.sortBy === 'createdAt') {
          params.delete('sortBy');
        } else {
          params.set('sortBy', newFilters.sortBy);
        }

        if (newFilters.order === 'desc') {
          params.delete('order');
        } else {
          params.set('order', newFilters.order);
        }

        // Reset to page 1 when filters change
        params.set('page', '1');

        router.push(`/search?${params.toString()}`);
      });
    },
    [searchParams, router]
  );

  // Handle filter changes
  const handleFilterChange = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters: FilterState = {
      category: '',
      minPrice: '',
      maxPrice: '',
      inStock: false,
      sortBy: 'createdAt',
      order: 'desc',
    };
    setFilters(clearedFilters);

    startTransition(() => {
      const params = new URLSearchParams();
      const q = searchParams.get('q');
      if (q) params.set('q', q);
      router.push(`/search?${params.toString()}`);
    });
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.category ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.inStock ||
    filters.sortBy !== 'createdAt' ||
    filters.order !== 'desc';

  const filterContent = (
    <div className="space-y-6">
      {/* Sort By */}
      <div>
        <label htmlFor="sortBy" className="block text-sm font-semibold text-gray-700 mb-2">
          Sort By
        </label>
        <div className="flex gap-2">
          <select
            id="sortBy"
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt">Newest</option>
            <option value="price">Price</option>
            <option value="name">Name</option>
          </select>
          <select
            id="order"
            value={filters.order}
            onChange={(e) => handleFilterChange('order', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Sort order"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
          Category
        </label>
        <select
          id="category"
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <fieldset>
        <legend className="block text-sm font-semibold text-gray-700 mb-2">
          Price Range
        </legend>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            id="minPrice"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            min="0"
            step="0.01"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Minimum price"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            id="maxPrice"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            min="0"
            step="0.01"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Maximum price"
          />
        </div>
      </fieldset>

      {/* In Stock */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="inStock"
          checked={filters.inStock}
          onChange={(e) => handleFilterChange('inStock', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="inStock" className="text-sm font-medium text-gray-700">
          In Stock Only
        </label>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full py-2 px-4 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Filter Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        aria-expanded={isMobileOpen}
        aria-haspopup="true"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filters
        {hasActiveFilters && (
          <span className="w-2 h-2 bg-blue-600 rounded-full" aria-hidden="true" />
        )}
      </button>

      {/* Mobile Filter Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-0 h-full w-80 max-w-full bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label="Close filters"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {filterContent}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block ${className}`}>
        <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            {isPending && (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" aria-label="Loading" />
            )}
          </div>
          {filterContent}
        </div>
      </aside>
    </>
  );
}
