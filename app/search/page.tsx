import { Suspense } from 'react';
import { drizzleDb } from '@/lib/db';
import { products } from '@/lib/schema';
import { eq, ilike, and, gte, lte, gt, or, asc, desc, count } from 'drizzle-orm';
import Link from 'next/link';
import Image from 'next/image';
import SearchBar from '@/components/ui/SearchBar';
import ProductFilters from '@/components/ui/ProductFilters';

export const revalidate = 60;

interface SearchPageProps {
  readonly searchParams: Promise<{
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    sortBy?: 'price' | 'name' | 'createdAt';
    order?: 'asc' | 'desc';
    page?: string;
    limit?: string;
  }>;
}

// Parse search params with defaults
function parseSearchParams(params: {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  sortBy?: 'price' | 'name' | 'createdAt';
  order?: 'asc' | 'desc';
  page?: string;
  limit?: string;
}) {
  const q = params.q || '';
  const category = params.category || '';
  const minPrice = params.minPrice ? Number.parseFloat(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number.parseFloat(params.maxPrice) : undefined;
  const inStock = params.inStock === 'true';
  const sortBy = params.sortBy || 'createdAt';
  const order = params.order || 'desc';
  const page = Math.max(1, Number.parseInt(params.page || '1', 10));
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.limit || '12', 10)));
  const offset = (page - 1) * limit;
  
  return { q, category, minPrice, maxPrice, inStock, sortBy, order, page, limit, offset };
}

// Build filter conditions for database query
function buildFilterConditions({
  q,
  category,
  minPrice,
  maxPrice,
  inStock,
}: {
  q: string;
  category: string;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  inStock: boolean;
}) {
  const conditions = [];

  if (q) {
    const searchPattern = `%${q}%`;
    conditions.push(or(ilike(products.name, searchPattern), ilike(products.description, searchPattern)));
  }

  if (category) {
    conditions.push(eq(products.category, category));
  }

  if (minPrice !== undefined && !Number.isNaN(minPrice)) {
    conditions.push(gte(products.price, minPrice));
  }

  if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
    conditions.push(lte(products.price, maxPrice));
  }

  if (inStock) {
    conditions.push(gt(products.stock, 0));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// Get sort column based on sortBy parameter
function getSortColumn(sortBy: string) {
  if (sortBy === 'price') return products.price;
  if (sortBy === 'name') return products.name;
  return products.createdAt;
}

// Stock badge helper component
function StockBadge({ stock }: { readonly stock: number }) {
  if (stock > 5) {
    return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">In Stock</span>;
  }
  if (stock > 0) {
    return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">Only {stock} left</span>;
  }
  return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">Out of Stock</span>;
}

// Pagination component
function Pagination({
  currentPage,
  totalPages,
  searchParams,
}: {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly searchParams: URLSearchParams;
}) {
  if (totalPages <= 1) return null;

  const pages = [];
  const showEllipsisStart = currentPage > 3;
  const showEllipsisEnd = currentPage < totalPages - 2;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    }
  }

  const getPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    return `/search?${params.toString()}`;
  };

  return (
    <nav className="flex justify-center items-center gap-2 mt-8" aria-label="Pagination">
      {currentPage > 1 && (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Previous
        </Link>
      )}

      <div className="flex items-center gap-1">
        {showEllipsisStart && (
          <>
            <Link
              href={getPageUrl(1)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              1
            </Link>
            <span className="px-2 text-gray-400">...</span>
          </>
        )}

        {pages
          .filter((p) => (showEllipsisStart ? p > 1 : true))
          .filter((p) => (showEllipsisEnd ? p < totalPages : true))
          .map((page) => (
            <Link
              key={page}
              href={getPageUrl(page)}
              className={`px-3 py-2 text-sm font-medium rounded-lg ${
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </Link>
          ))}

        {showEllipsisEnd && (
          <>
            <span className="px-2 text-gray-400">...</span>
            <Link
              href={getPageUrl(totalPages)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {totalPages}
            </Link>
          </>
        )}
      </div>

      {currentPage < totalPages && (
        <Link
          href={getPageUrl(currentPage + 1)}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Next
        </Link>
      )}
    </nav>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const { q, category, minPrice, maxPrice, inStock, sortBy, order, page, limit, offset } = parseSearchParams(params);

  // Build filter conditions and sort order
  const whereClause = buildFilterConditions({ q, category, minPrice, maxPrice, inStock });
  const sortColumn = getSortColumn(sortBy);
  const sortOrder = order === 'asc' ? asc(sortColumn) : desc(sortColumn);

  // Execute queries in parallel
  const [items, totalResult, allCategories] = await Promise.all([
    drizzleDb
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset),
    drizzleDb.select({ count: count() }).from(products).where(whereClause),
    drizzleDb.selectDistinct({ category: products.category }).from(products).orderBy(asc(products.category)),
  ]);

  const total = totalResult[0]?.count || 0;
  const totalPages = Math.ceil(total / limit);
  const categories = allCategories.map((c) => c.category);

  // Build URLSearchParams for pagination
  const urlParams = new URLSearchParams();
  if (q) urlParams.set('q', q);
  if (category) urlParams.set('category', category);
  if (minPrice !== undefined) urlParams.set('minPrice', minPrice.toString());
  if (maxPrice !== undefined) urlParams.set('maxPrice', maxPrice.toString());
  if (inStock) urlParams.set('inStock', 'true');
  if (sortBy !== 'createdAt') urlParams.set('sortBy', sortBy);
  if (order !== 'desc') urlParams.set('order', order);

  return (
    <main className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {q ? `Search results for "${q}"` : 'All Products'}
          </h1>
          <Suspense fallback={<div className="h-14 bg-gray-200 rounded-xl animate-pulse" />}>
            <SearchBar autoFocus={!q} />
          </Suspense>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <Suspense fallback={<div className="w-64 h-96 bg-gray-200 rounded-xl animate-pulse" />}>
            <ProductFilters categories={categories} className="w-64 flex-shrink-0" />
          </Suspense>

          {/* Results */}
          <div className="flex-1">
            {/* Results count and mobile filter button */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <p className="text-gray-600">
                {total === 0 ? (
                  'No products found'
                ) : (
                  <>
                    Showing {offset + 1}-{Math.min(offset + limit, total)} of {total} products
                  </>
                )}
              </p>
              <div className="lg:hidden">
                <Suspense fallback={null}>
                  <ProductFilters categories={categories} />
                </Suspense>
              </div>
            </div>

            {/* Product Grid */}
            {items.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <svg
                  className="w-16 h-16 mx-auto text-gray-300 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your search or filter to find what you&apos;re looking for.
                </p>
                <Link
                  href="/search"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Clear all filters
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {items.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 group hover:shadow-lg hover:scale-[1.02] hover:border-blue-200 transition-all duration-300"
                  >
                    <div className="relative h-48 w-full">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-4">
                      <div className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </div>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xl font-bold text-blue-600">${product.price.toFixed(2)}</span>
                        <StockBadge stock={product.stock} />
                      </div>
                      <span className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full px-3 py-1 text-xs font-semibold">
                        {product.category}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            <Pagination currentPage={page} totalPages={totalPages} searchParams={urlParams} />
          </div>
        </div>
      </div>
    </main>
  );
}
