import Header from '@/components/layout/Header';

export default function PriceAlertsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="h-9 w-48 bg-gray-200 rounded-lg animate-pulse mb-8" />
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-md border border-white/50 p-6"
            >
              <div className="flex gap-6">
                {/* Image skeleton */}
                <div className="w-24 h-24 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />
                
                {/* Content skeleton */}
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="flex gap-4 mt-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                
                {/* Actions skeleton */}
                <div className="flex flex-col gap-3 items-end">
                  <div className="h-8 w-16 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
