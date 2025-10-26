export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Hero Skeleton */}
      <div className="bg-black border-b border-terminal-green/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="animate-pulse">
            <div className="h-12 bg-terminal-green/10 rounded mb-4 w-3/4"></div>
            <div className="h-6 bg-terminal-green/10 rounded mb-8 w-1/2"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-terminal-green/10"></div>
              <div className="flex-1">
                <div className="h-4 bg-terminal-green/10 rounded mb-2 w-32"></div>
                <div className="h-3 bg-terminal-green/10 rounded w-48"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-terminal-green/10 rounded w-full"></div>
          <div className="h-4 bg-terminal-green/10 rounded w-full"></div>
          <div className="h-4 bg-terminal-green/10 rounded w-3/4"></div>
          <div className="h-8"></div>
          <div className="h-4 bg-terminal-green/10 rounded w-full"></div>
          <div className="h-4 bg-terminal-green/10 rounded w-full"></div>
          <div className="h-4 bg-terminal-green/10 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}
