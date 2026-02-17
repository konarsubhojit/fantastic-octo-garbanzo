export default function SearchLoading() {
  return (
    <main className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header Skeleton */}
        <div className="mb-8">
          <div className="h-9 w-64 bg-gray-200 rounded-lg animate-pulse mb-4" />
          <div className="h-14 w-full bg-gray-200 rounded-xl animate-pulse" />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar Skeleton */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-6" />
              <div className="space-y-6">
                {/* Sort By */}
                <div>
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
                </div>
                {/* Category */}
                <div>
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
                </div>
                {/* Price Range */}
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="flex gap-2">
                    <div className="h-10 flex-1 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-10 flex-1 bg-gray-200 rounded-lg animate-pulse" />
                  </div>
                </div>
                {/* In Stock */}
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </aside>

          {/* Results Skeleton */}
          <div className="flex-1">
            {/* Results count */}
            <div className="flex items-center justify-between mb-6">
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
            </div>

            {/* Product Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`search-skeleton-${i}`}
                  className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200"
                >
                  <div className="h-48 bg-gray-200 animate-pulse" />
                  <div className="p-4">
                    <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-1" />
                    <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse mb-3" />
                    <div className="flex justify-between items-center mb-2">
                      <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                      <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                    <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="flex justify-center items-center gap-2 mt-8">
              <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-10 w-16 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
